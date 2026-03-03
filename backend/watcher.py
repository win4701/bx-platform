# ======================================================
# watcher.py — PRODUCTION SAFE v3
# Atomic • Idempotent • Ledger Safe • Withdraw Queue
# ======================================================

import os
import time
import uuid
import sqlite3
import logging
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from key import api_guard, admin_guard
from risk_engine import evaluate_withdraw

# ======================================================
# CONFIG
# ======================================================

DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")
MIN_WITHDRAW_USDT = float(os.getenv("MIN_WITHDRAW_USDT", 10))

ALLOWED_ASSETS = {
    "usdt","usdc","ton","bnb","eth",
    "avax","sol","btc","zec","ltc","bx"
}

logger = logging.getLogger("watcher")
router = APIRouter(prefix="/finance", dependencies=[Depends(api_guard)])

# ======================================================
# DB SAFE CONTEXT
# ======================================================

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"DB ERROR: {e}")
        raise
    finally:
        conn.close()

# ======================================================
# LEDGER DOUBLE ENTRY
# ======================================================

def ledger(ref: str, debit: str, credit: str, amount: float):
    if amount <= 0:
        return
    ts = int(time.time())
    with get_db() as conn:
        conn.execute(
            "INSERT INTO ledger(ref,account,debit,credit,ts) VALUES (?,?,?,?,?)",
            (ref, debit, amount, 0, ts)
        )
        conn.execute(
            "INSERT INTO ledger(ref,account,debit,credit,ts) VALUES (?,?,?,?,?)",
            (ref, credit, 0, amount, ts)
        )

# ======================================================
# WALLET FETCH
# ======================================================

@router.get("/wallet")
def wallet(uid: int):
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM wallets WHERE uid=?",
            (uid,)
        ).fetchone()

        if not row:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        return dict(row)

# ======================================================
# DEPOSIT ADDRESS (STATIC / HOT WALLET MODE)
# ======================================================

@router.get("/deposit/address")
def deposit_address(asset: str, uid: int):

    asset = asset.lower()
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")

    # يمكن لاحقًا تخصيص address لكل مستخدم
    HOT_WALLET = os.getenv("HOT_WALLET_ADDRESS")

    if not HOT_WALLET:
        raise HTTPException(500, "DEPOSIT_NOT_CONFIGURED")

    return {
        "asset": asset,
        "address": HOT_WALLET,
        "memo": str(uid)
    }

# ======================================================
# CREDIT DEPOSIT (IDEMPOTENT)
# ======================================================

def credit_deposit(uid: int, asset: str, amount: float, txid: str):

    if amount <= 0:
        return

    asset = asset.lower()

    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")

    with get_db() as conn:

        exists = conn.execute(
            "SELECT 1 FROM used_txs WHERE txid=?",
            (txid,)
        ).fetchone()

        if exists:
            return

        updated = conn.execute(
            f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
            (amount, uid)
        )

        if updated.rowcount == 0:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        conn.execute(
            "INSERT INTO used_txs(txid,asset,ts) VALUES (?,?,?)",
            (txid, asset, int(time.time()))
        )

        ledger(
            ref=f"deposit:{txid}",
            debit=f"treasury_{asset}",
            credit=f"user_{asset}",
            amount=amount
        )

    logger.info(f"Deposit OK | UID={uid} | {asset} | {amount}")

# ======================================================
# WITHDRAW REQUEST (QUEUE SAFE)
# ======================================================

@router.post("/withdraw")
def request_withdraw(uid: int, amount: float, address: str):

    if amount < MIN_WITHDRAW_USDT:
        raise HTTPException(400, "MIN_WITHDRAW")

    risk = evaluate_withdraw(uid, amount, address)

    with get_db() as conn:

        updated = conn.execute(
            """UPDATE wallets
               SET usdt = usdt - ?
               WHERE uid=? AND usdt >= ?""",
            (amount, uid, amount)
        )

        if updated.rowcount == 0:
            raise HTTPException(400, "INSUFFICIENT_BALANCE")

        status = "approved" if risk["approved"] else "manual_review"

        withdraw_id = str(uuid.uuid4())

        conn.execute(
            """INSERT INTO withdraw_queue
               (id,uid,asset,amount,address,status,ts)
               VALUES (?,?,?,?,?,?,?)""",
            (withdraw_id, uid, "usdt", amount,
             address, status, int(time.time()))
        )

        ledger(
            ref=f"withdraw:{withdraw_id}",
            debit="user_usdt",
            credit="treasury_usdt",
            amount=amount
        )

    return {
        "withdraw_id": withdraw_id,
        "status": status,
        "risk_score": risk["risk_score"]
    }

# ======================================================
# WITHDRAW STATUS
# ======================================================

@router.get("/withdraw/status")
def withdraw_status(withdraw_id: str, uid: int):

    with get_db() as conn:
        row = conn.execute(
            "SELECT status FROM withdraw_queue WHERE id=? AND uid=?",
            (withdraw_id, uid)
        ).fetchone()

        if not row:
            raise HTTPException(404, "NOT_FOUND")

        return {"status": row["status"]}

# ======================================================
# USER HISTORY
# ======================================================

@router.get("/history")
def user_history(uid: int):

    with get_db() as conn:
        rows = conn.execute(
            """SELECT action,asset,amount,ref,ts
               FROM history WHERE uid=?
               ORDER BY ts DESC LIMIT 50""",
            (uid,)
        ).fetchall()

        return [dict(r) for r in rows]

# ======================================================
# ADMIN LEDGER EXPORT
# ======================================================

@router.get("/admin/ledger/export", dependencies=[Depends(admin_guard)])
def export_ledger():

    with get_db() as conn:
        rows = conn.execute(
            "SELECT ref,account,debit,credit,ts FROM ledger ORDER BY ts"
        )

        def stream():
            yield "ref,account,debit,credit,ts\n"
            for r in rows:
                yield ",".join(map(str, r)) + "\n"

        return StreamingResponse(
            stream(),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=ledger.csv"
            }
        )
