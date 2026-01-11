import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from key import api_guard
from pricing import get_price, get_bx_internal_price
from finance import (
    update_bx,
    ledger,
    db
)

router = APIRouter(dependencies=[Depends(api_guard)])

# ======================================================
# CONSTANTS (POLICY)
# ======================================================
QUOTE_TTL_SEC = 5  # صلاحية المعاينة
BUY_SPREAD = {
    "usdt": 0.10,
    "ton": 0.12,
    "sol": 0.15,
    "btc": 0.20,
}
SELL_SPREAD = {
    "usdt": 0.12,
    "ton": 0.15,
    "sol": 0.18,
    "btc": 0.25,
}

SUPPORTED_ASSETS = {"usdt", "ton", "sol", "btc"}

# ======================================================
# MODELS
# ======================================================
class QuoteRequest(BaseModel):
    asset: str           # usdt / ton / sol / btc
    side: str            # buy / sell
    amount: float        # asset amount (buy) OR bx amount (sell)

class ExecuteRequest(QuoteRequest):
    quote_id: str

# ======================================================
# HELPERS
# ======================================================
def now() -> int:
    return int(time.time())

def asset_to_usdt(asset: str, amount: float) -> float:
    return amount * get_price(asset)

def usdt_to_asset(asset: str, usdt: float) -> float:
    return usdt / get_price(asset)

# ======================================================
# QUOTE (PREVIEW)
# ======================================================
@router.post("/quote")
def quote(req: QuoteRequest):
    asset = req.asset.lower()
    if asset not in SUPPORTED_ASSETS:
        raise HTTPException(400, "UNSUPPORTED_ASSET")
    if req.amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    bx_price = get_bx_internal_price()
    ts = now()

    if req.side == "buy":
        spread = BUY_SPREAD[asset]
        usdt_value = asset_to_usdt(asset, req.amount)
        bx_out = usdt_value / (bx_price * (1 + spread))

        result = {
            "side": "buy",
            "asset": asset,
            "asset_amount": req.amount,
            "bx_amount": bx_out,
            "bx_price": bx_price,
            "spread": spread,
        }

    elif req.side == "sell":
        spread = SELL_SPREAD[asset]
        usdt_value = req.amount * bx_price * (1 - spread)
        asset_out = usdt_to_asset(asset, usdt_value)

        result = {
            "side": "sell",
            "asset": asset,
            "bx_amount": req.amount,
            "asset_amount": asset_out,
            "bx_price": bx_price,
            "spread": spread,
        }

    else:
        raise HTTPException(400, "INVALID_SIDE")

    quote_id = f"{asset}:{req.side}:{ts}"
    result.update({
        "quote_id": quote_id,
        "expires_at": ts + QUOTE_TTL_SEC
    })

    return result

# ======================================================
# EXECUTE (FINAL)
# ======================================================
@router.post("/execute")
def execute(req: ExecuteRequest):
    asset = req.asset.lower()
    if asset not in SUPPORTED_ASSETS:
        raise HTTPException(400, "UNSUPPORTED_ASSET")

    # إعادة حساب السعر (لا ثقة بالواجهة)
    preview = quote(QuoteRequest(
        asset=req.asset,
        side=req.side,
        amount=req.amount
    ))

    if preview["quote_id"] != req.quote_id:
        raise HTTPException(400, "QUOTE_MISMATCH")

    if preview["expires_at"] < now():
        raise HTTPException(400, "QUOTE_EXPIRED")

    c = db().cursor()

    if req.side == "buy":
        # خصم الأصل الخارجي
        bal = c.execute(
            f"SELECT {asset} FROM wallets WHERE uid=?",
            (req.uid,)
        ).fetchone()

        if not bal or bal[0] < req.amount:
            raise HTTPException(400, "INSUFFICIENT_ASSET")

        c.execute(
            f"UPDATE wallets SET {asset} = {asset} - ? WHERE uid=?",
            (req.amount, req.uid)
        )
        update_bx(req.uid, preview["bx_amount"])

        ledger(f"market:buy:{asset}", "market_pool", "user_bx", preview["bx_amount"])

    elif req.side == "sell":
        # خصم BX
        from finance import get_bx
        if get_bx(req.uid) < req.amount:
            raise HTTPException(400, "INSUFFICIENT_BX")

        update_bx(req.uid, -req.amount)
        c.execute(
            f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
            (preview["asset_amount"], req.uid)
        )

        ledger(f"market:sell:{asset}", "user_bx", "market_pool", req.amount)

    else:
        raise HTTPException(400, "INVALID_SIDE")

    c.execute(
        """INSERT INTO history
           (uid, action, asset, amount, ref, ts)
           VALUES (?,?,?,?,?,?)""",
        (
            req.uid,
            f"market_{req.side}",
            asset,
            req.amount,
            preview["quote_id"],
            now()
        )
    )
    c.connection.commit()

    return {
        "status": "executed",
        "details": preview
    }
