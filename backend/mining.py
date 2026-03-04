# ==========================================================
# BLOXIO MINING ENGINE
# Subscriptions • Profit Engine • Wallet Integration
# ==========================================================

import time
import sqlite3
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import get_current_user
from finance import credit_user, debit_user

router = APIRouter(prefix="/mining", tags=["mining"])

DB_PATH = os.getenv("DB_PATH", "bloxio.db")

# ==========================================================
# DATABASE
# ==========================================================

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ==========================================================
# MINING PLANS
# ==========================================================

MINING_PLANS = {

    "BX": [
        {"id": "p10", "days": 10, "roi": 2.5},
        {"id": "p21", "days": 21, "roi": 5},
        {"id": "p30", "days": 30, "roi": 8},
        {"id": "p45", "days": 45, "roi": 12},
        {"id": "p60", "days": 60, "roi": 17},
        {"id": "p90", "days": 90, "roi": 25}
    ],

    "SOL": [
        {"id": "p10", "days": 10, "roi": 1},
        {"id": "p21", "days": 21, "roi": 2.8},
        {"id": "p30", "days": 30, "roi": 4},
        {"id": "p45", "days": 45, "roi": 7},
        {"id": "p60", "days": 60, "roi": 9},
        {"id": "p90", "days": 90, "roi": 14}
    ],

    "BNB": [
        {"id": "p10", "days": 10, "roi": 0.8},
        {"id": "p21", "days": 21, "roi": 1.8},
        {"id": "p30", "days": 30, "roi": 3},
        {"id": "p45", "days": 45, "roi": 5},
        {"id": "p60", "days": 60, "roi": 7},
        {"id": "p90", "days": 90, "roi": 11}
    ]
}


# ==========================================================
# MODELS
# ==========================================================

class SubscribeMining(BaseModel):

    coin: str
    plan_id: str
    amount: float


# ==========================================================
# STATUS
# ==========================================================

@router.get("/status")
def mining_status(user=Depends(get_current_user)):

    user_id = user["user_id"]

    conn = db()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT *
        FROM mining_subscriptions
        WHERE user_id=?
        """,
        (user_id,)
    )

    row = cur.fetchone()

    conn.close()

    if not row:
        return {"active": False}

    return dict(row)


# ==========================================================
# SUBSCRIBE
# ==========================================================

@router.post("/subscribe")
def subscribe(req: SubscribeMining, user=Depends(get_current_user)):

    user_id = user["user_id"]

    coin = req.coin.upper()
    plan_id = req.plan_id

    plans = MINING_PLANS.get(coin)

    if not plans:
        raise HTTPException(400, "Unsupported coin")

    plan = next((p for p in plans if p["id"] == plan_id), None)

    if not plan:
        raise HTTPException(400, "Invalid plan")

    amount = req.amount

    if amount <= 0:
        raise HTTPException(400, "Invalid amount")

    # ==========================================
    # DEBIT WALLET
    # ==========================================

    debit_user(user_id, coin, amount)

    start = int(time.time())
    end = start + plan["days"] * 86400

    conn = db()
    cur = conn.cursor()

    cur.execute(
        """
        INSERT INTO mining_subscriptions
        (user_id, coin, plan_id, amount, roi, start_time, end_time)
        VALUES(?,?,?,?,?,?,?)
        """,
        (
            user_id,
            coin,
            plan_id,
            amount,
            plan["roi"],
            start,
            end
        )
    )

    conn.commit()
    conn.close()

    return {
        "status": "subscribed",
        "coin": coin,
        "plan": plan_id
    }


# ==========================================================
# CLAIM PROFITS
# ==========================================================

@router.post("/claim")
def claim_profit(user=Depends(get_current_user)):

    user_id = user["user_id"]

    conn = db()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT *
        FROM mining_subscriptions
        WHERE user_id=?
        """,
        (user_id,)
    )

    row = cur.fetchone()

    if not row:
        raise HTTPException(400, "No mining subscription")

    now = int(time.time())

    elapsed = now - row["start_time"]

    if elapsed <= 0:
        raise HTTPException(400, "Nothing to claim")

    days_passed = elapsed / 86400

    total_profit = row["amount"] * (row["roi"] / 100)

    daily_profit = total_profit / (row["end_time"] - row["start_time"]) * 86400

    payout = daily_profit * days_passed

    # ==========================================
    # CREDIT WALLET
    # ==========================================

    credit_user(user_id, row["coin"], payout)

    cur.execute(
        """
        UPDATE mining_subscriptions
        SET start_time=?
        WHERE user_id=?
        """,
        (now, user_id)
    )

    conn.commit()
    conn.close()

    return {
        "profit": round(payout, 6),
        "coin": row["coin"]
    }
