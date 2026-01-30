import sqlite3
from fastapi import APIRouter, HTTPException
from decimal import Decimal
from time import time

router = APIRouter(prefix="/bxing", tags=["bxing"])

DB_PATH = "db/bxing.db"

# ======================================================
# DB
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

# ======================================================
# AIRDROP
# ======================================================
@router.get("/airdrop/status")
def airdrop_status(uid: int):
    conn = db()
    c = conn.cursor()

    row = c.execute(
        "SELECT claimed, referrals, reward FROM airdrops WHERE uid=?",
        (uid,)
    ).fetchone()

    if not row:
        return {"claimed": False, "referrals": 0, "reward": 2.5}

    return {
        "claimed": bool(row[0]),
        "referrals": row[1],
        "reward": row[2]
    }


@router.post("/airdrop/claim")
def airdrop_claim(uid: int):
    conn = db()
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

    conn.commit()
    conn.close()

    return {"status": "ok", "reward": 2.5}

# ======================================================
# MINING
# ======================================================
MINING_PLANS = {
    "BX": [
        {"name": "Starter", "roi": Decimal("0.025"), "min": 10, "max": 100, "days": 10},
        {"name": "Basic", "roi": Decimal("0.05"), "min": 50, "max": 300, "days": 21},
        {"name": "Golden", "roi": Decimal("0.08"), "min": 200, "max": 800, "days": 30},
    ],
    "BNB": [
        {"name": "Starter", "roi": Decimal("0.008"), "min": 0.05, "max": 1, "days": 10},
        {"name": "Basic", "roi": Decimal("0.018"), "min": 1, "max": 4, "days": 21},
    ],
    "SOL": [
        {"name": "Starter", "roi": Decimal("0.01"), "min": 1, "max": 5, "days": 10},
    ]
}

def find_plan(asset: str, investment: Decimal):
    plans = MINING_PLANS.get(asset)
    if not plans:
        raise HTTPException(400, "MINING_NOT_AVAILABLE")

    for p in plans:
        if p["min"] <= investment <= p["max"]:
            return p

    raise HTTPException(400, "NO_MATCHING_PLAN")


@router.post("/mining/start")
def start_mining(uid: int, asset: str, investment: float):
    investment = Decimal(str(investment))
    asset = asset.upper()

    plan = find_plan(asset, investment)

    roi = investment * plan["roi"] * plan["days"]
    now = int(time())

    conn = db()
    c = conn.cursor()

    c.execute(
        """INSERT INTO mining_orders
           (uid, asset, plan, investment, roi, days, started_at, ends_at, status)
           VALUES (?,?,?,?,?,?,?,?,?)""",
        (
            uid,
            asset,
            plan["name"],
            float(investment),
            float(roi),
            plan["days"],
            now,
            now + plan["days"] * 86400,
            "active"
        )
    )

    conn.commit()
    conn.close()

    return {
        "status": "started",
        "asset": asset,
        "plan": plan["name"],
        "investment": float(investment),
        "estimated_return": float(roi),
        "days": plan["days"]
    }


@router.get("/mining/active")
def active_mining(uid: int):
    conn = db()
    c = conn.cursor()

    rows = c.execute(
        """SELECT asset, plan, investment, roi, days, ends_at
           FROM mining_orders
           WHERE uid=? AND status='active'""",
        (uid,)
    ).fetchall()

    conn.close()

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
