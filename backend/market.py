import time
import os
import sqlite3
from fastapi import APIRouter, HTTPException, Depends

from key import api_guard
from pricing import (
    BX_PER_USDT,
    USDT_PER_BX,
    get_price,
    usdt_to_bx,
    bx_to_usdt,
)

router = APIRouter(dependencies=[Depends(api_guard)])
DB_PATH = "db.sqlite"

# ======================================================
# SPREADS (FROM ENV)
# ======================================================
BX_BUY_SPREAD_USDT = float(os.getenv("BX_BUY_SPREAD_USDT", "0.0"))
BX_BUY_SPREAD_TON  = float(os.getenv("BX_BUY_SPREAD_TON", "0.0"))
BX_BUY_SPREAD_SOL  = float(os.getenv("BX_BUY_SPREAD_SOL", "0.0"))
BX_BUY_SPREAD_BTC  = float(os.getenv("BX_BUY_SPREAD_BTC", "0.0"))

BX_SELL_SPREAD_USDT = float(os.getenv("BX_SELL_SPREAD_USDT", "0.0"))
BX_SELL_SPREAD_TON  = float(os.getenv("BX_SELL_SPREAD_TON", "0.0"))
BX_SELL_SPREAD_SOL  = float(os.getenv("BX_SELL_SPREAD_SOL", "0.0"))
BX_SELL_SPREAD_BTC  = float(os.getenv("BX_SELL_SPREAD_BTC", "0.0"))

# ======================================================
# DB
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

# ======================================================
# LEDGER (DOUBLE ENTRY)
# ======================================================
def ledger(ref: str, debit: str, credit: str, amount: float):
    ts = int(time.time())
    c = db().cursor()
    c.execute(
        "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
        (ref, debit, amount, 0, ts)
    )
    c.execute(
        "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
        (ref, credit, 0, amount, ts)
    )
    c.connection.commit()

# ======================================================
# HELPERS
# ======================================================
def get_spread(asset: str, side: str) -> float:
    if side == "buy":
        return {
            "usdt": BX_BUY_SPREAD_USDT,
            "ton":  BX_BUY_SPREAD_TON,
            "sol":  BX_BUY_SPREAD_SOL,
            "btc":  BX_BUY_SPREAD_BTC,
        }[asset]
    else:
        return {
            "usdt": BX_SELL_SPREAD_USDT,
            "ton":  BX_SELL_SPREAD_TON,
            "sol":  BX_SELL_SPREAD_SOL,
            "btc":  BX_SELL_SPREAD_BTC,
        }[asset]

# ======================================================
# QUOTE (READ ONLY)
# ======================================================
@router.post("/quote")
def quote(asset: str, side: str, amount: float):
    """
    asset: usdt | ton | sol | btc
    side: buy | sell
    amount:
      - buy  -> amount of asset
      - sell -> amount of BX
    """
    if asset not in ("usdt", "ton", "sol", "btc"):
        raise HTTPException(400, "INVALID_ASSET")
    if side not in ("buy", "sell"):
        raise HTTPException(400, "INVALID_SIDE")
    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    spread = get_spread(asset, side)

    # ---------------- BUY BX ----------------
    if side == "buy":
        if asset == "usdt":
            usdt_val = amount
        else:
            price = get_price(asset)
            if price is None:
                raise HTTPException(400, f"{asset.upper()}_PRICE_UNAVAILABLE")
            usdt_val = amount * price

        bx = usdt_to_bx(usdt_val) * (1 - spread)

        return {
            "asset": asset,
            "side": side,
            "amount": amount,
            "result": round(bx, 6),
            "rate": BX_PER_USDT,
            "spread": spread,
        }

    # ---------------- SELL BX ----------------
    if side == "sell":
        bx = amount
        usdt_val = bx_to_usdt(bx) * (1 - spread)

        if asset == "usdt":
            result = usdt_val
        else:
            price = get_price(asset)
            if price is None:
                raise HTTPException(400, f"{asset.upper()}_PRICE_UNAVAILABLE")
            result = usdt_val / price

        return {
            "asset": asset,
            "side": side,
            "amount": amount,
            "result": round(result, 6),
            "rate": USDT_PER_BX,
            "spread": spread,
        }

# ======================================================
# EXECUTE (STATE CHANGING)
# ======================================================
@router.post("/execute")
def execute(payload: dict):
    uid = int(payload.get("uid", 0))
    asset = payload.get("asset")
    side = payload.get("side")
    amount = float(payload.get("amount", 0))
    result = float(payload.get("result", 0))

    if uid <= 0:
        raise HTTPException(400, "INVALID_UID")
    if asset not in ("usdt", "ton", "sol", "btc"):
        raise HTTPException(400, "INVALID_ASSET")
    if side not in ("buy", "sell"):
        raise HTTPException(400, "INVALID_SIDE")

    c = db().cursor()
    ts = int(time.time())

    # ---------------- BUY BX ----------------
    if side == "buy":
        c.execute(
            f"UPDATE wallets SET {asset} = {asset} - ?, bx = bx + ? WHERE uid=?",
            (amount, result, uid)
        )
        ledger("market:buy", f"user_{asset}", "user_bx", amount)
        action = "market_buy"

    # ---------------- SELL BX ----------------
    else:
        c.execute(
            f"UPDATE wallets SET bx = bx - ?, {asset} = {asset} + ? WHERE uid=?",
            (amount, result, uid)
        )
        ledger("market:sell", "user_bx", f"user_{asset}", amount)
        action = "market_sell"

    c.execute(
        """INSERT INTO history
           (uid, action, asset, amount, ref, ts)
           VALUES (?,?,?,?,?,?)""",
        (uid, action, asset, amount, "market", ts)
    )

    c.connection.commit()
    return {"status": "ok"}
