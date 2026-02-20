import os
import time
import sqlite3
from decimal import Decimal
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException
from finance import credit_deposit  # 🔥 إصلاح الاستيراد

# ======================================================
# ROUTER
# ======================================================
router = APIRouter(prefix="/bxing", tags=["bxing"])

DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")

# ======================================================
# DB (ATOMIC SAFE)
# ======================================================
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except:
        conn.rollback()
        raise
    finally:
        conn.close()

# ======================================================
# AIRDROP
# ======================================================
@router.get("/airdrop/status")
def airdrop_status(uid: int):
    with get_db() as conn:
        row = conn.execute(
            "SELECT claimed, referrals, reward FROM airdrops WHERE uid=?",
            (uid,)
        ).fetchone()

    if not row:
        return {"claimed": False, "referrals": 0, "reward": 0.33}

    return {
        "claimed": bool(row["claimed"]),
        "referrals": row["referrals"],
        "reward": row["reward"]
    }

@router.post("/airdrop/claim")
def airdrop_claim(uid: int):
    reward = 0.33

    with get_db() as conn:
        row = conn.execute(
            "SELECT claimed FROM airdrops WHERE uid=?",
            (uid,)
        ).fetchone()

        if row and row["claimed"]:
            raise HTTPException(400, "AIRDROP_ALREADY_CLAIMED")

        conn.execute(
            """INSERT INTO airdrops (uid, claimed, referrals, reward, ts)
               VALUES (?,1,0,?,?)
               ON CONFLICT(uid)
               DO UPDATE SET claimed=1, reward=?""",
            (uid, reward, int(time.time()), reward)
        )

    # credit خارج transaction wallet الخاص به
    credit_deposit(uid, "bx", reward, f"airdrop_claim_{uid}")

    return {"status": "ok", "reward": reward}

# ======================================================
# REFERRAL
# ======================================================
@router.post("/airdrop/refer")
def refer_bonus(uid: int, referrer_uid: int):
    if uid == referrer_uid:
        raise HTTPException(400, "INVALID_REFERRAL")

    reward = 0.25

    with get_db() as conn:

        # منع تكرار نفس الإحالة
        exists = conn.execute(
            "SELECT 1 FROM referral_logs WHERE uid=?",
            (uid,)
        ).fetchone()

        if exists:
            raise HTTPException(400, "ALREADY_REFERRED")

        conn.execute(
            "INSERT INTO referral_logs(uid, referrer_uid, ts) VALUES (?,?,?)",
            (uid, referrer_uid, int(time.time()))
        )

        conn.execute(
            "UPDATE airdrops SET referrals = referrals + 1 WHERE uid=?",
            (referrer_uid,)
        )

    credit_deposit(referrer_uid, "bx", reward, f"referral_{uid}")

    return {"status": "ok", "reward": reward}

# ======================================================
# MINING PLANS
# ======================================================
MINING_PLANS = {
    "BX": [
        {"id":"p10","name":"Starter","roi":Decimal("0.025"),"min":5,"max":60,"days":10},
        {"id":"p21","name":"Basic","roi":Decimal("0.05"),"min":50,"max":250,"days":21},
        {"id":"p30","name":"Golden","roi":Decimal("0.08"),"min":200,"max":800,"days":30},
        {"id":"p45","name":"Advanced","roi":Decimal("0.12"),"min":400,"max":2500,"days":45},
        {"id":"p60","name":"Platine","roi":Decimal("0.17"),"min":750,"max":9000,"days":60},
        {"id":"p90","name":"Infinity","roi":Decimal("0.25"),"min":1000,"max":20000,"days":90},
    ]
}

def find_plan(asset: str, plan_id: str):
    plans = MINING_PLANS.get(asset.upper())
    if not plans:
        raise HTTPException(400, "MINING_NOT_AVAILABLE")

    for p in plans:
        if p["id"] == plan_id:
            return p

    raise HTTPException(400, "PLAN_NOT_FOUND")

# ======================================================
# START MINING (مربوط بالـ wallet)
# ======================================================
@router.post("/mining/start")
def start_mining(uid: int, asset: str, plan_id: str, investment: float):

    asset = asset.upper()
    investment = Decimal(str(investment))
    plan = find_plan(asset, plan_id)

    if not (plan["min"] <= investment <= plan["max"]):
        raise HTTPException(400, "INVALID_INVESTMENT_RANGE")

    with get_db() as conn:

        # منع وجود تعدين نشط
        active = conn.execute(
            "SELECT 1 FROM mining_orders WHERE uid=? AND status='active'",
            (uid,)
        ).fetchone()

        if active:
            raise HTTPException(400, "MINING_ALREADY_ACTIVE")

        # خصم من wallet
        updated = conn.execute(
            f"""UPDATE wallets
                SET {asset.lower()} = {asset.lower()} - ?
                WHERE uid=? AND {asset.lower()} >= ?""",
            (float(investment), uid, float(investment))
        )

        if updated.rowcount == 0:
            raise HTTPException(400, "INSUFFICIENT_BALANCE")

        roi_total = investment * plan["roi"] * plan["days"]
        now = int(time.time())

        conn.execute(
            """INSERT INTO mining_orders
               (uid, asset, plan, investment, roi, days,
                started_at, ends_at, status)
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
