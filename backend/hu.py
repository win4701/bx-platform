import os
import time
import sqlite3
from fastapi import APIRouter, HTTPException, Depends
from decimal import Decimal
from time import time
from contextlib import contextmanager
from fastapi.responses import StreamingResponse

# ======================================================
# ROUTER
# ======================================================
router = APIRouter(prefix="/bxing", tags=["bxing"])

DB_PATH = "db/bxing.db"

# ======================================================
# DB (SAFE)
# ======================================================
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

# ======================================================
# AIRDROP AND REFERRALS
# ======================================================
@router.get("/airdrop/status")
def airdrop_status(uid: int):
    with get_db() as conn:
        c = conn.cursor()
        row = c.execute(
            "SELECT claimed, referrals, reward FROM airdrops WHERE uid=?",
            (uid,)
        ).fetchone()

    if not row:
        return {"claimed": False, "referrals": 0, "reward": 1}

    return {
        "claimed": bool(row[0]),
        "referrals": row[1],
        "reward": row[2]
    }

@router.post("/airdrop/claim")
def airdrop_claim(uid: int):
    # Direct claim reward for users in the casino section
    reward = 0.33  # Claim reward for the user

    with get_db() as conn:
        c = conn.cursor()
        row = c.execute(
            "SELECT claimed FROM airdrops WHERE uid=?",
            (uid,)
        ).fetchone()

        if row and row[0]:
            raise HTTPException(400, "AIRDROP_ALREADY_CLAIMED")

        c.execute(
            """INSERT INTO airdrops (uid, claimed, referrals, reward, ts)
               VALUES (?,1,0,?,?)
               ON CONFLICT(uid) DO UPDATE SET claimed=1, reward=?""",
            (uid, reward, int(time()), reward)
        )
        
        # Credit the reward directly to the user’s wallet
        credit_deposit(uid, "BX", reward, f"casino_claim_{uid}")
        
    return {"status": "ok", "reward": reward}

@router.post("/airdrop/refer")
def refer_bonus(uid: int, referrer_uid: int):
    # Referral reward: 0.25 BX for each successful referral
    reward = 0.25  # Referral bonus

    with get_db() as conn:
        c = conn.cursor()
        
        # Check if the referral has been tracked
        c.execute(
            "SELECT 1 FROM airdrops WHERE uid=?",
            (referrer_uid,)
        )
        
        if not c.fetchone():
            raise HTTPException(400, "REFERRER_NOT_FOUND")
        
        # Credit the referral bonus to the user’s wallet
        credit_deposit(referrer_uid, "BX", reward, f"casino_referral_{uid}")
        
        # Update the referral count for the referrer
        c.execute(
            "UPDATE airdrops SET referrals = referrals + 1 WHERE uid=?",
            (referrer_uid,)
        )
        
    return {"status": "ok", "referral_reward": reward}

# ======================================================
# MINING PLANS (PER COIN)
# ======================================================
MINING_PLANS = {
    "BX": [
        {"id":"p10","name":"Starter","roi":Decimal("0.025"),"min":5,"max":60,"days":10},
        {"id":"p21","name":"Basic","roi":Decimal("0.05"),"min":50,"max":250,"days":21},
        {"id":"p30","name":"Golden","roi":Decimal("0.08"),"min":200,"max":800,"days":30},
        {"id":"p45","name":"Advanced","roi":Decimal("0.12"),"min":400,"max":2500,"days":45},
        {"id":"p60","name":"Platine","roi":Decimal("0.17"),"min":750,"max":9000,"days":60},
        {"id":"p90","name":"Infinity","roi":Decimal("0.25"),"min":1000,"max":20000,"days":90,"sub":True},
    ],
    # Additional coins (SOL, BNB) here as needed
}

def get_mining_plans_by_coin(asset: str):
    return MINING_PLANS.get(asset.upper())

def find_plan(asset: str, plan_id: str):
    plans = get_mining_plans_by_coin(asset)
    if not plans:
        raise HTTPException(400, "MINING_NOT_AVAILABLE")

    for p in plans:
        if p["id"] == plan_id:
            return p

    raise HTTPException(400, "PLAN_NOT_FOUND")

# ======================================================
# START MINING
# ======================================================
@router.post("/mining/start")
def start_mining(uid: int, asset: str, plan_id: str, investment: float):
    asset = asset.upper()
    investment = Decimal(str(investment))

    plan = find_plan(asset, plan_id)

    if not (plan["min"] <= investment <= plan["max"]):
        raise HTTPException(400, "INVALID_INVESTMENT_RANGE")

    with get_db() as conn:
        c = conn.cursor()

        active = c.execute(
            "SELECT 1 FROM mining_orders WHERE uid=? AND status='active'",
            (uid,)
        ).fetchone()

        if active:
            raise HTTPException(400, "MINING_ALREADY_ACTIVE")

        roi_total = investment * plan["roi"] * plan["days"]
        now = int(time())

        c.execute(
            """INSERT INTO mining_orders
               (uid, asset, plan, investment, roi, days, started_at, ends_at, status)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            (
                uid,
                asset,
                plan["name"],
                float(investment),
                float(roi_total),
                plan["days"],
                now,
                now + plan["days"] * 86400,
                "active"
            )
        )

    return {
        "status": "started",
        "asset": asset,
        "plan": plan["name"],
        "investment": float(investment),
        "estimated_return": float(roi_total),
        "days": plan["days"]
    }

# ======================================================
# CREDIT DEPOSIT (IDEMPOTENT)
# ======================================================
def credit_deposit(uid: int, asset: str, amount: float, txid: str):
    if amount <= 0:
        return

    asset = asset.lower()
    if asset not in ["bx", "usdt", "sol", "eth", "btc", "bnb"]:  # Add other assets if needed
        raise HTTPException(400, "INVALID_ASSET")

    c, conn = get_db()
    try:
        # idempotency check: ensures a transaction is not processed twice
        if c.execute(
            "SELECT 1 FROM used_txs WHERE txid=?",
            (txid,)
        ).fetchone():
            return

        c.execute(
            f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
            (amount, uid)
        )

        c.execute(
            """INSERT INTO history
               (uid, action, asset, amount, ref, ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, "deposit", asset, amount, txid, int(time.time()))
        )

        ledger(f"deposit:{asset}", f"treasury_{asset}", f"user_{asset}", amount)

        c.execute(
            "INSERT INTO used_txs(txid, asset, ts) VALUES (?,?,?)",
            (txid, asset, int(time.time()))
        )
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        close(conn)

# ======================================================
# WALLET MANAGEMENT
# ======================================================

@router.get("/me")
def wallet_me(uid: int):
    c, conn = get_db()
    try:
        r = c.execute(
            "SELECT usdt, ton, sol, bnb, eth, avax, btc, ltc, bx FROM wallets WHERE uid=?",
            (uid,)
        ).fetchone()

        if not r:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        return {
            "wallet": dict(r),
            "deposit_status": "confirmed"
        }
    finally:
        close(conn)

# ======================================================
# DATABASE HELPERS
# ======================================================

def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def get_cursor():
    conn = db()
    conn.row_factory = sqlite3.Row
    return conn.cursor(), conn

def close(conn):
    conn.commit()
    conn.close()
