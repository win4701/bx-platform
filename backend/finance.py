from fastapi import APIRouter, HTTPException
import sqlite3
import time
from collections import defaultdict

router = APIRouter()
DB = "db.sqlite"

# =========================
# DB helpers
# =========================
def db():
    return sqlite3.connect(DB, check_same_thread=False)

# =========================
# WALLET
# =========================
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

# =========================
# LEDGER (Double Entry)
# =========================
def ledger(ref: str, debit: str, credit: str, amount: float):
    c = db().cursor()
    ts = int(time.time())
    c.execute(
        "INSERT INTO ledger(ref,account,debit,credit,ts) VALUES(?,?,?,?,?)",
        (ref, debit, amount, 0, ts)
    )
    c.execute(
        "INSERT INTO ledger(ref,account,debit,credit,ts) VALUES(?,?,?,?,?)",
        (ref, credit, 0, amount, ts)
    )
    c.connection.commit()

# =========================
# BX helpers
# =========================
def bx_balance(uid: int) -> float:
    c = db().cursor()
    return c.execute(
        "SELECT bx FROM wallets WHERE uid=?", (uid,)
    ).fetchone()[0]

def update_bx(uid: int, delta: float):
    c = db().cursor()
    c.execute(
        "UPDATE wallets SET bx = bx + ? WHERE uid=?",
        (delta, uid)
    )
    c.connection.commit()

# =========================
# CASINO INTERFACE
# =========================
def casino_debit(uid: int, amount: float, game: str):
    if bx_balance(uid) < amount:
        raise ValueError("INSUFFICIENT_BX")
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

# =========================
# LIVE RTP MONITOR (ADMIN)
# =========================
def rtp_stats():
    c = db().cursor()
    rows = c.execute(
        """SELECT game,
                  SUM(bet) total_bet,
                  SUM(payout) total_payout
           FROM game_history GROUP BY game"""
    ).fetchall()

    out = {}
    for g, b, p in rows:
        out[g] = {
            "total_bet": b or 0,
            "total_payout": p or 0,
            "rtp_real": round((p / b), 4) if b else 0
        }
    return out

# =========================
# CHART DATA
# =========================
@router.get("/chart")
def chart():
    c = db().cursor()
    return {
        "volume": c.execute("SELECT SUM(bet) FROM game_history").fetchone()[0] or 0,
        "payouts": c.execute("SELECT SUM(payout) FROM game_history").fetchone()[0] or 0,
        "rounds": c.execute("SELECT COUNT(*) FROM game_history").fetchone()[0],
    }

# =========================
# AIRDROP (ADMIN)
# =========================
@router.post("/airdrop")
def airdrop(uid: int, amount: float):
    update_bx(uid, amount)
    ledger("airdrop", "system", "user_bx", amount)
    casino_history(uid, "airdrop", 0, amount, True)
    return {"status": "ok", "amount": amount}
