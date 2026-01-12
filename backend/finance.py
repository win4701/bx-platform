import time
import os
import hashlib
import sqlite3
from typing import Dict
from fastapi import APIRouter, HTTPException, Depends, Request

from key import api_guard, admin_guard

router = APIRouter(dependencies=[Depends(api_guard)])
DB_PATH = "db.sqlite"

# ======================================================
# CONFIG
# ======================================================
MIN_DEPOSIT_USDT = 10.0
MAX_WITHDRAW_RATIO = 0.5
MAX_WITHDRAW_MONTH = 10

# Binance ID (AUTO webhook)
BINANCE_WEBHOOK_SECRET = os.getenv("BINANCE_WEBHOOK_SECRET", "")

# WalletConnect treasury addresses
TREASURY_USDT_TON = os.getenv("TREASURY_USDT_TON", "")
TREASURY_USDT_TRC20 = os.getenv("TREASURY_USDT_TRC20", "")

# ======================================================
# DB
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

# ======================================================
# LEDGER (DOUBLE ENTRY)
# ======================================================
def ledger(ref: str, debit: str, credit: str, amount: float):
    ts = int(time.time())
    c = db().cursor()
    c.execute(
        "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
        (ref, debit, amount, 0, ts)
    )
    c.execute(
        "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
        (ref, credit, 0, amount, ts)
    )
    c.connection.commit()

# ======================================================
# DEDUP
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
# WITHDRAW RULES (USDT)
# ======================================================
def validate_withdraw(uid: int, amount: float):
    if amount < MIN_DEPOSIT_USDT:
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
# BINANCE ID — AUTO WEBHOOK
# ======================================================
def verify_binance_signature(payload: dict, signature: str):
    raw = f"{payload}".encode()
    expected = hashlib.sha256(
        raw + BINANCE_WEBHOOK_SECRET.encode()
    ).hexdigest()
    if signature != expected:
        raise HTTPException(401, "INVALID_BINANCE_SIGNATURE")

@router.post("/webhook/binance")
def binance_webhook(payload: dict, request: Request):
    verify_binance_signature(
        payload,
        request.headers.get("X-BINANCE-SIGNATURE", "")
    )

    uid = int(payload["uid"])
    amount = float(payload["amount"])
    txid = f"binance:{payload['txid']}"

    if amount < MIN_DEPOSIT_USDT:
        return "TOO_SMALL"
    if tx_used(txid):
        return "DUPLICATE"

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
    return "OK"

# ======================================================
# WALLETCONNECT — USDT (TON / TRC20)
# ======================================================
def verify_ton_usdt(txid: str) -> Dict:
    """
    تحقق on-chain عبر TON API
    يجب التأكد من:
    - العقد الرسمي USDT
    - المرسل → المستخدم
    - المستلم → TREASURY_USDT_TON
    - confirmations كافية
    """
    # pseudo
    return {
        "confirmed": True,
        "amount": 20.0,
        "to": TREASURY_USDT_TON
    }

def verify_trc20_usdt(txid: str) -> Dict:
    """
    تحقق on-chain عبر TRON API
    """
    # pseudo
    return {
        "confirmed": True,
        "amount": 25.0,
        "to": TREASURY_USDT_TRC20
    }

@router.post("/deposit/walletconnect")
def walletconnect_deposit(
    uid: int,
    network: str,   # ton | trc20
    txid: str
):
    if network not in ("ton", "trc20"):
        raise HTTPException(400, "INVALID_NETWORK")

    txkey = f"wc:{network}:{txid}"
    if tx_used(txkey):
        raise HTTPException(400, "DUPLICATE_TX")

    tx = (
        verify_ton_usdt(txid)
        if network == "ton"
        else verify_trc20_usdt(txid)
    )

    if not tx["confirmed"]:
        raise HTTPException(400, "NOT_CONFIRMED")

    if tx["amount"] < MIN_DEPOSIT_USDT:
        mark_tx_used(txkey)
        raise HTTPException(400, "MIN_DEPOSIT_10")

    c = db().cursor()
    c.execute(
        "UPDATE wallets SET usdt = usdt + ? WHERE uid=?",
        (tx["amount"], uid)
    )
    c.execute(
        """INSERT INTO history
           (uid, action, asset, amount, ref, ts)
           VALUES (?,?,?,?,?,?)""",
        (uid, "deposit", "usdt", tx["amount"], txkey, int(time.time()))
    )
    c.connection.commit()

    ledger("deposit:walletconnect", "wc_pool", "user_usdt", tx["amount"])
    mark_tx_used(txkey)

    return {"status": "confirmed"}

# ======================================================
# RTP STATS (READ ONLY)
# ======================================================
def rtp_stats() -> Dict:
    c = db().cursor()
    rows = c.execute(
        """SELECT game, SUM(bet), SUM(payout)
           FROM game_history
           GROUP BY game"""
    ).fetchall()

    return {
        g: {
            "total_bet": b or 0,
            "total_payout": p or 0,
            "rtp_real": round((p / b), 4) if b else 0
        }
        for g, b, p in rows
    }
