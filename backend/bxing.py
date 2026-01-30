import sqlite3
import requests
from fastapi import HTTPException
from decimal import Decimal
from time import time
from typing import Dict

# ======================================================
# CONFIG
# ======================================================
DB_PATH = "db/bxing.db"

ALLOWED_ASSETS = {"bx", "usdt", "ton", "bnb", "sol", "btc", "eth"}

# ======================================================
# DB HELPERS
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def close_connection(conn):
    conn.commit()
    conn.close()

# ======================================================
# STON.FI (RECORD ONLY – NO REAL EXECUTION)
# ======================================================
def buy_bx(amount: float, token: str) -> Dict:
    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    token = token.lower()
    if token not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")

    # NOTE: Backend does NOT execute swaps
    return {
        "status": "recorded",
        "side": "buy",
        "amount": amount,
        "from": token,
        "to": "bx"
    }

def sell_bx(amount: float, token: str) -> Dict:
    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    token = token.lower()
    if token not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")

    return {
        "status": "recorded",
        "side": "sell",
        "amount": amount,
        "from": "bx",
        "to": token
    }

# ======================================================
# AIRDROP (SIMPLE / IN-MEMORY)
# ======================================================
AIRDROP_USERS: Dict[int, Dict] = {}

def airdrop_status(uid: int) -> Dict:
    return AIRDROP_USERS.get(uid, {
        "claimed": False,
        "referrals": 0,
        "reward": 2.5
    })

def airdrop_claim(uid: int) -> Dict:
    user = AIRDROP_USERS.get(uid)

    if user and user.get("claimed"):
        raise HTTPException(400, "AIRDROP_ALREADY_CLAIMED")

    AIRDROP_USERS[uid] = {
        "claimed": True,
        "referrals": user["referrals"] if user else 0,
        "reward": 2.5
    }

    return {"status": "ok", "reward": 2.5}

# ======================================================
# TRANSACTIONS
# ======================================================
def record_transaction(uid: int, action: str, asset: str, amount: float, ref: str):
    asset = asset.lower()
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")

    conn = db()
    c = conn.cursor()
    try:
        c.execute(
            """INSERT INTO history (uid, action, asset, amount, ref, ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, action, asset, amount, ref, int(time()))
        )
        conn.commit()
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        close_connection(conn)

def update_wallet(uid: int, asset: str, amount: float, action: str):
    asset = asset.lower()
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")

    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    conn = db()
    c = conn.cursor()
    try:
        if action in ("buy", "airdrop"):
            c.execute(
                f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
                (amount, uid)
            )
        elif action == "sell":
            c.execute(
                f"UPDATE wallets SET {asset} = {asset} - ? WHERE uid=?",
                (amount, uid)
            )
        else:
            raise HTTPException(400, "INVALID_ACTION")

        conn.commit()
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        close_connection(conn)

# ======================================================
# MINING
# ======================================================
MINING_PLANS = {
    "BX": [
        {"name": "Starter", "roi": Decimal("0.025"), "min": 10, "max": 100, "days": 10},
        {"name": "Basic", "roi": Decimal("0.05"), "min": 50, "max": 300, "days": 21},
        {"name": "Golden", "roi": Decimal("0.08"), "min": 200, "max": 800, "days": 30},
        {"name": "Advanced", "roi": Decimal("0.12"), "min": 400, "max": 2500, "days": 45},
        {"name": "Platine", "roi": Decimal("0.17"), "min": 750, "max": 9000, "days": 60},
        {"name": "Infinity", "roi": Decimal("0.25"), "min": 1000, "max": 20000, "days": 90}
    ],
    "SOL": [
        {"name": "Starter", "roi": Decimal("0.01"), "min": 1, "max": 5, "days": 10},
        {"name": "Basic", "roi": Decimal("0.028"), "min": 10, "max": 50, "days": 21},
        {"name": "Golden", "roi": Decimal("0.04"), "min": 40, "max": 160, "days": 30},
    ],
    "BNB": [
        {"name": "Starter", "roi": Decimal("0.008"), "min": 0.05, "max": 1, "days": 10},
        {"name": "Basic", "roi": Decimal("0.018"), "min": 1, "max": 4, "days": 21},
    ]
}

def find_mining_plan(investment: Decimal, asset: str):
    plans = MINING_PLANS.get(asset.upper())
    if not plans:
        raise HTTPException(400, "MINING_NOT_AVAILABLE")

    for plan in plans:
        if plan["min"] <= investment <= plan["max"]:
            return plan
    return None

def start_mining(investment: float, asset: str) -> Dict:
    asset = asset.upper()
    investment = Decimal(str(investment))

    if investment <= 0:
        raise HTTPException(400, "INVALID_INVESTMENT")

    plan = find_mining_plan(investment, asset)
    if not plan:
        raise HTTPException(400, "NO_MATCHING_PLAN")

    total_roi = investment * plan["roi"] * plan["days"]

    return {
        "asset": asset,
        "plan": plan["name"],
        "days": plan["days"],
        "investment": float(investment),
        "estimated_return": float(total_roi)
    }
