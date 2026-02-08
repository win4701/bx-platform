import sqlite3
from fastapi import APIRouter, HTTPException
from decimal import Decimal
from time import time
from contextlib import contextmanager

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
# AIRDROP
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
               VALUES (?,1,0,2.5,?)
               ON CONFLICT(uid) DO UPDATE SET claimed=1""",
            (uid, int(time()))
        )

    return {"status": "ok", "reward": 1}

# ======================================================
# MINING PLANS (PER COIN)
# ======================================================
MINING_PLANS = {
    "BX": [
        {"id":"p10","name":"Starter","roi":Decimal("0.025"),"min":10,"max":100,"days":10},
        {"id":"p21","name":"Basic","roi":Decimal("0.05"),"min":50,"max":300,"days":21},
        {"id":"p30","name":"Golden","roi":Decimal("0.08"),"min":200,"max":800,"days":30},
        {"id":"p45","name":"Advanced","roi":Decimal("0.12"),"min":400,"max":2500,"days":45},
        {"id":"p60","name":"Platine","roi":Decimal("0.17"),"min":750,"max":9000,"days":60},
        {"id":"p90","name":"Infinity","roi":Decimal("0.25"),"min":1000,"max":20000,"days":90,"sub":True},
    ],
    "SOL": [
        {"id":"p10","name":"Starter","roi":Decimal("0.01"),"min":1,"max":5,"days":10},
        {"id":"p21","name":"Basic","roi":Decimal("0.028"),"min":10,"max":50,"days":21},
        {"id":"p30","name":"Golden","roi":Decimal("0.04"),"min":40,"max":160,"days":30},
        {"id":"p45","name":"Advanced","roi":Decimal("0.07"),"min":120,"max":500,"days":45},
        {"id":"p60","name":"Platine","roi":Decimal("0.09"),"min":200,"max":1000,"days":60},
        {"id":"p90","name":"Infinity","roi":Decimal("0.14"),"min":500,"max":2500,"days":90,"sub":True},
    ],
    "BNB": [
        {"id":"p10","name":"Starter","roi":Decimal("0.008"),"min":Decimal("0.05"),"max":1,"days":10},
        {"id":"p21","name":"Basic","roi":Decimal("0.018"),"min":1,"max":4,"days":21},
        {"id":"p30","name":"Golden","roi":Decimal("0.03"),"min":5,"max":50,"days":30},
        {"id":"p45","name":"Advanced","roi":Decimal("0.05"),"min":10,"max":100,"days":45},
        {"id":"p60","name":"Platine","roi":Decimal("0.07"),"min":15,"max":150,"days":60},
        {"id":"p90","name":"Infinity","roi":Decimal("0.11"),"min":25,"max":200,"days":90,"sub":True},
    ],
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
# ACTIVE MINING
# ======================================================
@router.get("/mining/active")
def active_mining(uid: int):
    with get_db() as conn:
        rows = conn.execute(
            """SELECT asset, plan, investment, roi, days, ends_at
               FROM mining_orders
               WHERE uid=? AND status='active'""",
            (uid,)
        ).fetchall()

    return [
        {
            "asset": r[0],
            "plan": r[1],
            "investment": r[2],
            "roi": r[3],
            "days": r[4],
            "ends_at": r[5]
        }
        for r in rows
]
