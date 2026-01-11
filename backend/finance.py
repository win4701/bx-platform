import time
import sqlite3
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict

from key import api_guard, admin_guard

router = APIRouter(dependencies=[Depends(api_guard)])

DB_PATH = "db.sqlite"

# ======================================================
# DB
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

# ======================================================
# WALLET
# ======================================================
@router.get("/state")
def wallet_state(uid: int):
    c = db().cursor()
    r = c.execute(
        "SELECT usdt, ton, sol, btc, bx FROM wallets WHERE uid=?",
        (uid,)
    ).fetchone()
    if not r:
        raise HTTPException(404, "WALLET_NOT_FOUND")
    return {
        "usdt": r[0],
        "ton": r[1],
        "sol": r[2],
        "btc": r[3],
        "bx": r[4],
    }

# ======================================================
# LEDGER (DOUBLE ENTRY)
# ======================================================
def ledger(ref: str, debit_account: str, credit_account: str, amount: float):
    ts = int(time.time())
    c = db().cursor()
    c.execute(
        "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
        (ref, debit_account, amount, 0, ts)
    )
    c.execute(
        "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
        (ref, credit_account, 0, amount, ts)
    )
    c.connection.commit()

# ======================================================
# BX HELPERS
# ======================================================
def get_bx(uid: int) -> float:
    c = db().cursor()
    r = c.execute(
        "SELECT bx FROM wallets WHERE uid=?",
        (uid,)
    ).fetchone()
    return r[0] if r else 0.0

def update_bx(uid: int, delta: float):
    c = db().cursor()
    c.execute(
        "UPDATE wallets SET bx = bx + ? WHERE uid=?",
        (delta, uid)
    )
    c.connection.commit()

# ======================================================
# CASINO INTERFACE (NO MERCY)
# ======================================================
def casino_debit(uid: int, amount: float, game: str):
    if get_bx(uid) < amount:
        raise HTTPException(400, "INSUFFICIENT_BX")
    update_bx(uid, -amount)
    ledger(f"casino:{game}", "user_bx", "casino_pool", amount)

def casino_credit(uid: int, amount: float, game: str):
    update_bx(uid, amount)
    ledger(f"casino:{game}", "casino_pool", "user_bx", amount)

def casino_history(uid: int, game: str, bet: float, payout: float, win: bool):
    c = db().cursor()
    c.execute(
        """INSERT INTO game_history
           (uid, game, bet, payout, win, created_at)
           VALUES (?,?,?,?,?,?)""",
        (uid, game, bet, payout, int(win), int(time.time()))
    )
    c.connection.commit()

# ======================================================
# WITHDRAW RULES
# ======================================================
MIN_WITHDRAW_USDT = 10.0
MAX_WITHDRAW_RATIO = 0.5
MAX_WITHDRAW_MONTH = 10

@router.post("/withdraw")
def withdraw(uid: int, asset: str, amount: float):
    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    c = db().cursor()
    bal = c.execute(
        f"SELECT {asset} FROM wallets WHERE uid=?",
        (uid,)
    ).fetchone()
    if not bal:
        raise HTTPException(404, "WALLET_NOT_FOUND")

    balance = bal[0]
    if amount > balance * MAX_WITHDRAW_RATIO:
        raise HTTPException(400, "WITHDRAW_LIMIT_RATIO")

    # عدد السحوبات هذا الشهر
    month_start = int(time.time()) - 30 * 86400
    count = c.execute(
        """SELECT COUNT(*) FROM history
           WHERE uid=? AND action='withdraw' AND ts>?""",
        (uid, month_start)
    ).fetchone()[0]

    if count >= MAX_WITHDRAW_MONTH:
        raise HTTPException(400, "WITHDRAW_MONTH_LIMIT")

    # خصم الرصيد
    c.execute(
        f"UPDATE wallets SET {asset} = {asset} - ? WHERE uid=?",
        (amount, uid)
    )
    c.execute(
        """INSERT INTO history
           (uid, action, asset, amount, ref, ts)
           VALUES (?,?,?,?,?,?)""",
        (uid, "withdraw", asset, amount, "user_request", int(time.time()))
    )
    c.connection.commit()

    ledger(f"withdraw:{asset}", "user_asset", "admin_wallet", amount)

    return {"status": "pending", "asset": asset, "amount": amount}

# ======================================================
# AIRDROP ENGINE
# ======================================================
WELCOME_BX = 1.2
AIRDROP_POOL_RATIO = 0.08  # من أرباح النظام

def grant_welcome_airdrop(uid: int):
    update_bx(uid, WELCOME_BX)
    ledger("airdrop:welcome", "airdrop_pool", "user_bx", WELCOME_BX)

@router.post("/airdrop/claim", dependencies=[Depends(admin_guard)])
def airdrop_claim(uid: int, amount: float, reason: str):
    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    update_bx(uid, amount)
    ledger("airdrop:manual", "airdrop_pool", "user_bx", amount)

    c = db().cursor()
    c.execute(
        """INSERT INTO history
           (uid, action, asset, amount, ref, ts)
           VALUES (?,?,?,?,?,?)""",
        (uid, "airdrop", "bx", amount, reason, int(time.time()))
    )
    c.connection.commit()

    return {"status": "ok", "bx": amount}

# ======================================================
# RTP STATS (READ ONLY)
# ======================================================
def rtp_stats() -> Dict:
    c = db().cursor()
    rows = c.execute(
        """SELECT game,
                  SUM(bet) AS total_bet,
                  SUM(payout) AS total_payout
           FROM game_history
           GROUP BY game"""
    ).fetchall()

    out = {}
    for g, b, p in rows:
        out[g] = {
            "total_bet": b or 0,
            "total_payout": p or 0,
            "rtp_real": round((p / b), 4) if b else 0
        }
    return out

# ======================================================
# CHART DATA
# ======================================================
@router.get("/chart")
def chart_data():
    c = db().cursor()
    return {
        "volume": c.execute("SELECT SUM(bet) FROM game_history").fetchone()[0] or 0,
        "payouts": c.execute("SELECT SUM(payout) FROM game_history").fetchone()[0] or 0,
        "rounds": c.execute("SELECT COUNT(*) FROM game_history").fetchone()[0],
    }
