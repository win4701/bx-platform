from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import time

from pricing import buy_bx, sell_bx
from finance import (
    update_bx,
    ledger,
    casino_history,  # نستخدم history العام
)
from key import api_guard

router = APIRouter(dependencies=[Depends(api_guard)])

# =========================
# REQUEST
# =========================
class Trade(BaseModel):
    uid: int
    asset: str     # usdt / ton / sol / btc
    amount: float  # amount of asset OR bx
    side: str      # buy / sell

# =========================
# BUY BX
# =========================
@router.post("/buy")
def buy(req: Trade):
    if req.amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    bx = buy_bx(req.asset, req.amount)

    # خصم الأصل (تم افتراض خصمه مسبقًا في finance)
    update_bx(req.uid, bx)

    ledger(
        ref=f"market:buy:{req.asset}",
        debit="market_pool",
        credit="user_bx",
        amount=bx
    )

    casino_history(req.uid, "market_buy", req.amount, bx, True)

    return {
        "side": "buy",
        "asset": req.asset,
        "bx_received": bx,
        "ts": int(time.time())
    }

# =========================
# SELL BX
# =========================
@router.post("/sell")
def sell(req: Trade):
    if req.amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    asset_amount = sell_bx(req.asset, req.amount)

    update_bx(req.uid, -req.amount)

    ledger(
        ref=f"market:sell:{req.asset}",
        debit="user_bx",
        credit="market_pool",
        amount=req.amount
    )

    casino_history(req.uid, "market_sell", req.amount, asset_amount, True)

    return {
        "side": "sell",
        "asset": req.asset,
        "asset_amount": asset_amount,
        "ts": int(time.time())
    }
