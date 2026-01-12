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

# BINANCE
BINANCE_MIN_DEPOSIT = 10.0
BINANCE_WEBHOOK_SECRET = os.getenv("BINANCE_WEBHOOK_SECRET", "")

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
# AUTO BINANCE ID WEBHOOK
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

    if amount < BINANCE_MIN_DEPOSIT:
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

    sign = ":".join(params.values()) + f":{PAYEER_SECRET_KEY}"
    params["m_sign"] = hashlib.sha256(sign.encode()).hexdigest().upper()

    return {"redirect_url": PAYEER_URL, "params": params}

# ======================================================
# PAYEER SIGNATURE VERIFY
# ======================================================
def verify_payeer_signature(p: dict):
    sign_str = (
        f"{p['m_shop']}:{p['m_orderid']}:{p['m_amount']}:"
        f"{p['m_curr']}:{p['m_desc']}:{p['m_status']}:"
        f"{PAYEER_SECRET_KEY}"
    )
    expected = hashlib.sha256(sign_str.encode()).hexdigest().upper()
    if expected != p.get("m_sign"):
        raise HTTPException(401, "INVALID_PAYEER_SIGNATURE")

# ======================================================
# PAYEER WEBHOOK (AUTO)
# ======================================================
@router.post("/webhook/payeer")
def payeer_webhook(payload: dict):
    verify_payeer_signature(payload)

    if payload["m_status"] != "success":
        return "IGNORED"

    txid = f"payeer:{payload['m_orderid']}"
    if tx_used(txid):
        return "DUPLICATE"

    uid = int(payload["m_orderid"].split(":")[1])
    amount = float(payload["m_amount"])

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
# RTP STATS (READ ONLY)
# ======================================================
def rtp_stats() -> Dict:
    c = db().cursor()
    rows = c.execute(
        """SELECT game,
                  SUM(bet),
                  SUM(payout)
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
