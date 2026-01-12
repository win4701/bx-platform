import time
import os
import base64
import hashlib
import sqlite3
from typing import Dict
from fastapi import APIRouter, HTTPException, Depends, Request

from key import api_guard, admin_guard

router = APIRouter(dependencies=[Depends(api_guard)])

DB_PATH = "db.sqlite"

# ======================================================
# ENV
# ======================================================
# PAYEER
PAYEER_SHOP_ID = os.getenv("PAYEER_SHOP_ID", "")
PAYEER_SECRET_KEY = os.getenv("PAYEER_SECRET_KEY", "")
PAYEER_URL = "https://payeer.com/merchant/"

# BINANCE ID
BINANCE_MIN_DEPOSIT = 10.0

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
    return dict(zip(["usdt", "ton", "sol", "btc", "bx"], r))

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
# HELPERS
# ======================================================
def tx_used(txid: str) -> bool:
    c = db().cursor()
    return c.execute(
        "SELECT 1 FROM used_txs WHERE txid=?",
        (txid,)
    ).fetchone() is not None

def mark_tx_used(txid: str):
    c = db().cursor()
    c.execute(
        "INSERT OR IGNORE INTO used_txs(txid) VALUES(?)",
        (txid,)
    )
    c.connection.commit()

def get_bx(uid: int) -> float:
    c = db().cursor()
    r = c.execute("SELECT bx FROM wallets WHERE uid=?", (uid,)).fetchone()
    return r[0] if r else 0.0

def update_bx(uid: int, delta: float):
    c = db().cursor()
    c.execute("UPDATE wallets SET bx = bx + ? WHERE uid=?", (delta, uid))
    c.connection.commit()

# ======================================================
# CASINO INTERFACE (BX ONLY)
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
# WITHDRAW RULES (USDT)
# ======================================================
MIN_WITHDRAW_USDT = 10.0
MAX_WITHDRAW_RATIO = 0.5
MAX_WITHDRAW_MONTH = 10

def validate_withdraw(uid: int, amount: float):
    if amount < MIN_WITHDRAW_USDT:
        raise HTTPException(400, "MIN_WITHDRAW_10")

    c = db().cursor()
    bal = c.execute(
        "SELECT usdt FROM wallets WHERE uid=?",
        (uid,)
    ).fetchone()
    if not bal:
        raise HTTPException(404, "WALLET_NOT_FOUND")

    if amount > bal[0] * MAX_WITHDRAW_RATIO:
        raise HTTPException(400, "WITHDRAW_LIMIT_RATIO")

    month_start = int(time.time()) - 30 * 86400
    count = c.execute(
        """SELECT COUNT(*) FROM history
           WHERE uid=? AND action LIKE 'withdraw%' AND ts>?""",
        (uid, month_start)
    ).fetchone()[0]

    if count >= MAX_WITHDRAW_MONTH:
        raise HTTPException(400, "WITHDRAW_MONTH_LIMIT")

# ======================================================
# BINANCE ID DEPOSIT (ADMIN CONFIRM)
# ======================================================
@router.post("/deposit/binance", dependencies=[Depends(admin_guard)])
def binance_deposit_confirm(
    uid: int,
    amount: float,
    binance_txid: str
):
    """
    Confirm Binance ID transfer manually or via internal tool
    """
    if amount < BINANCE_MIN_DEPOSIT:
        raise HTTPException(400, "MIN_DEPOSIT_10")

    txid = f"binance:{binance_txid}"
    if tx_used(txid):
        raise HTTPException(400, "DUPLICATE_TX")

    c = db().cursor()
    c.execute(
        "UPDATE wallets SET usdt = usdt + ? WHERE uid=?",
        (amount, uid)
    )
    c.execute(
        """INSERT INTO history
           (uid, action, asset, amount, ref, ts)
           VALUES (?,?,?,?,?,?)""",
        (uid, "deposit", "usdt", amount, txid, int(time.time()))
    )
    c.connection.commit()

    ledger("deposit:binance", "binance_pool", "user_usdt", amount)
    mark_tx_used(txid)

    return {"status": "confirmed", "source": "binance"}

# ======================================================
# PAYEER DEPOSIT (REDIRECT)
# ======================================================
@router.post("/deposit/payeer")
def payeer_deposit(uid: int, amount: float):
    if amount < 10:
        raise HTTPException(400, "MIN_DEPOSIT_10")

    order_id = f"payeer:{uid}:{int(time.time())}"
    desc = base64.b64encode(b"Bloxio Deposit").decode()

    params = {
        "m_shop": PAYEER_SHOP_ID,
        "m_orderid": order_id,
        "m_amount": f"{amount:.2f}",
        "m_curr": "USD",
        "m_desc": desc,
    }

    sign_str = ":".join(params.values()) + f":{PAYEER_SECRET_KEY}"
    params["m_sign"] = hashlib.sha256(sign_str.encode()).hexdigest().upper()

    return {"redirect_url": PAYEER_URL, "params": params}

# ======================================================
# PAYEER WEBHOOK (CONFIRM)
# ======================================================
@router.post("/webhook/payeer")
def payeer_webhook(payload: dict):
    if payload.get("m_status") != "success":
        return "IGNORED"

    orderid = payload.get("m_orderid")
    txid = f"payeer:{orderid}"
    if tx_used(txid):
        return "DUPLICATE"

    uid = int(orderid.split(":")[1])
    amount = float(payload.get("m_amount", 0))

    if amount < 10:
        mark_tx_used(txid)
        return "TOO_SMALL"

    c = db().cursor()
    c.execute(
        "UPDATE wallets SET usdt = usdt + ? WHERE uid=?",
        (amount, uid)
    )
    c.execute(
        """INSERT INTO history
           (uid, action, asset, amount, ref, ts)
           VALUES (?,?,?,?,?,?)""",
        (uid, "deposit", "usdt", amount, txid, int(time.time()))
    )
    c.connection.commit()

    ledger("deposit:payeer", "payeer_pool", "user_usdt", amount)
    mark_tx_used(txid)
    return "OK"

# ======================================================
# PAYEER WITHDRAW
# ======================================================
@router.post("/withdraw/payeer")
def withdraw_payeer(uid: int, amount: float, payeer_account: str):
    validate_withdraw(uid, amount)

    c = db().cursor()
    c.execute(
        "UPDATE wallets SET usdt = usdt - ? WHERE uid=?",
        (amount, uid)
    )
    c.execute(
        """INSERT INTO history
           (uid, action, asset, amount, ref, ts)
           VALUES (?,?,?,?,?,?)""",
        (uid, "withdraw_request", "usdt", amount, payeer_account, int(time.time()))
    )
    c.connection.commit()

    ledger("withdraw:payeer", "user_usdt", "payeer_pending", amount)
    return {"status": "pending"}

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
