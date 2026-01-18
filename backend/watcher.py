# ======================================================
# watcher.py
# Blockchain & Deposit Watcher
# ======================================================

import time
import os
import hmac
import hashlib
from fastapi import APIRouter, HTTPException, Depends

from key import admin_guard
from finance import credit_deposit, db

router = APIRouter(dependencies=[Depends(admin_guard)])

# ======================================================
# CONFIG / CONSTANTS
# ======================================================

# جميع العملات المدعومة في النظام
ALLOWED_ASSETS = {"usdt", "ton", "sol", "btc", "bnb", "bx"}

# العملات التي تُؤكَّد تلقائيًا (On-chain with memo / uid)
AUTO_CONFIRM_ASSETS = {"usdt","ton", "sol", "btc", "bnb"}


# الحد الأدنى للإيداع (حماية سبام)
MIN_DEPOSIT = {
    "usdt": 10,
    "ton":  5,
    "sol":  0.065,
    "btc":  0.0001,
    "bnb":  0.01,
    "bx":   1,
}

# سر التوقيع (Webhooks)
WATCHER_SECRET = os.getenv("WATCHER_SECRET", "CHANGE_ME")

# ======================================================
# HELPERS
# ======================================================

def verify_signature(payload: bytes, signature: str):
    expected = hmac.new(
        WATCHER_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(403, "INVALID_SIGNATURE")

def validate_asset(asset: str, amount: float):
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")
    if amount < MIN_DEPOSIT.get(asset, 0):
        raise HTTPException(400, "AMOUNT_TOO_SMALL")

# ======================================================
# AUTO CONFIRM DEPOSITS (TON / SOL)
# ======================================================

@router.post("/watcher/auto")
def auto_deposit(
    uid: int,
    asset: str,
    amount: float,
    txid: str
):
    validate_asset(asset, amount)

    if asset not in AUTO_CONFIRM_ASSETS:
        raise HTTPException(400, "AUTO_CONFIRM_NOT_ALLOWED")

    credit_deposit(
        uid=uid,
        asset=asset,
        amount=amount,
        txid=txid,
        source="auto"
    )

    return {
        "status": "confirmed",
        "uid": uid,
        "asset": asset,
        "amount": amount
    }

# ======================================================
# MANUAL CONFIRM DEPOSITS (BTC / BNB)
# ======================================================

@router.post("/watcher/pending")
def pending_deposit(
    uid: int,
    asset: str,
    amount: float,
    txid: str
):
    validate_asset(asset, amount)

    if asset not in MANUAL_CONFIRM_ASSETS:
        raise HTTPException(400, "MANUAL_CONFIRM_NOT_REQUIRED")

    c = db().cursor()
    c.execute(
        """INSERT INTO pending_deposits
           (uid, asset, amount, txid, ts)
           VALUES (?,?,?,?,?)""",
        (uid, asset, amount, txid, int(time.time()))
    )
    c.connection.commit()

    return {
        "status": "pending",
        "uid": uid,
        "asset": asset,
        "amount": amount
    }

# ======================================================
# ADMIN CONFIRM PENDING DEPOSITS
# ======================================================

@router.post("/watcher/confirm")
def confirm_deposit(pending_id: int):
    c = db().cursor()

    row = c.execute(
        """SELECT uid, asset, amount, txid
           FROM pending_deposits
           WHERE id=?""",
        (pending_id,)
    ).fetchone()

    if not row:
        raise HTTPException(404, "PENDING_NOT_FOUND")

    uid, asset, amount, txid = row

    credit_deposit(
        uid=uid,
        asset=asset,
        amount=amount,
        txid=txid,
        source="manual"
    )

    c.execute(
        "DELETE FROM pending_deposits WHERE id=?",
        (pending_id,)
    )
    c.connection.commit()

    return {
        "status": "confirmed",
        "uid": uid,
        "asset": asset,
        "amount": amount
    }

# ======================================================
# LIST PENDING DEPOSITS (ADMIN)
# ======================================================

@router.get("/watcher/pending")
def list_pending():
    c = db().cursor()
    rows = c.execute(
        """SELECT id, uid, asset, amount, txid, ts
           FROM pending_deposits
           ORDER BY ts ASC"""
    ).fetchall()

    return [
        {
            "id": i,
            "uid": u,
            "asset": a,
            "amount": amt,
            "txid": t,
            "ts": ts
        }
        for i, u, a, amt, t, ts in rows
    ]
