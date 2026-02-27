import os
import time
import sqlite3
import requests
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
TOPUP_API_URL = os.getenv("TOPUP_API_URL")
TOPUP_API_KEY = os.getenv("TOPUP_API_KEY")

ALLOWED_ASSETS = {
    "usdt","usdc","ton","bnb","eth",
    "avax","sol","btc","zec","ltc","bx"
}

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("watcher")

router = APIRouter(prefix="/watcher", dependencies=[Depends(api_guard)])

# ======================================================
# DB (ATOMIC – FLY SAFE)
# ======================================================

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except:
        conn.rollback()
        raise
    finally:
        conn.close()

# ======================================================
# LEDGER (DOUBLE ENTRY SAFE)
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
# CREDIT DEPOSIT (IDEMPOTENT)
# ======================================================

def credit_deposit(uid: int, asset: str, amount: float, txid: str):

    if amount <= 0:
        return

    asset = asset.lower()
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")

    with get_db() as conn:

        # idempotency check
        if conn.execute(
            "SELECT 1 FROM used_txs WHERE txid=?",
            (txid,)
        ).fetchone():
            return

        # update wallet
        updated = conn.execute(
            f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
            (amount, uid)
        )

        if updated.rowcount == 0:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        # history
        conn.execute(
            """INSERT INTO history
               (uid,action,asset,amount,ref,ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, "deposit", asset, amount, txid, int(time.time()))
        )

        ledger(
            ref=f"deposit:{asset}",
            debit=f"treasury_{asset}",
            credit=f"user_{asset}",
            amount=amount
        )

        # mark tx used
        conn.execute(
            "INSERT INTO used_txs(txid,asset,ts) VALUES (?,?,?)",
            (txid, asset, int(time.time()))
        )

    logger.info(f"Deposit credited | UID={uid} | {asset} | {amount}")

# ======================================================
# DEBIT WALLET (SAFE)
# ======================================================

def debit_wallet(uid: int, asset: str, amount: float, ref: str):

    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    asset = asset.lower()

    with get_db() as conn:

        updated = conn.execute(
            f"""UPDATE wallets
                SET {asset} = {asset} - ?
                WHERE uid=? AND {asset} >= ?""",
            (amount, uid, amount)
        )

        if updated.rowcount == 0:
            raise HTTPException(400, "INSUFFICIENT_BALANCE")

        conn.execute(
            """INSERT INTO history
               (uid,action,asset,amount,ref,ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, "debit", asset, amount, ref, int(time.time()))
        )

        ledger(
            ref=ref,
            debit=f"user_{asset}",
            credit=f"treasury_{asset}",
            amount=amount
        )

# ======================================================
# USER WALLET
# ======================================================

@router.get("/me")
def wallet_me(uid: int):

    with get_db() as conn:
        row = conn.execute(
            """SELECT usdt,usdc,ton,bnb,eth,avax,
                      sol,zec,ltc,btc,bx
               FROM wallets WHERE uid=?""",
            (uid,)
        ).fetchone()

        if not row:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        return {"wallet": dict(row)}

# ======================================================
# PHONE TOPUP (خصم مباشر من Wallet)
# ======================================================

@router.post("/topup")
def phone_topup(uid: int, phone: str, country: str, amount: float):

    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    debit_wallet(uid, "usdt", amount, f"phone_topup:{phone}")

    if not TOPUP_API_URL:
        raise HTTPException(500, "TOPUP_PROVIDER_NOT_CONFIGURED")

    try:
        r = requests.post(
            TOPUP_API_URL,
            json={
                "api_key": TOPUP_API_KEY,
                "phone": phone,
                "country": country,
                "amount": amount
            },
            timeout=10
        )

        if r.status_code != 200:
            raise HTTPException(500, "TOPUP_FAILED")

    except Exception:
        raise HTTPException(500, "TOPUP_PROVIDER_ERROR")

    return {"status": "success", "charged": amount}

# ======================================================
# WITHDRAW (RISK ENGINE + QUEUE SYSTEM)
# ======================================================

@router.post("/withdraw")
def request_withdraw(uid: int, amount: float, address: str):

    if amount < MIN_WITHDRAW_USDT:
        raise HTTPException(400, "MIN_WITHDRAW")

    risk = evaluate_withdraw(uid, amount, address)

    # خصم فوري لمنع double-spend
    debit_wallet(uid, "usdt", amount, "withdraw_request")

    status = "approved" if risk["approved"] else "manual_review"

    with get_db() as conn:
        conn.execute(
            """INSERT INTO withdraw_queue
               (uid,asset,amount,address,status,ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, "usdt", amount, address, status, int(time.time()))
        )

    return {
        "status": status,
        "risk_score": risk["risk_score"]
    }

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
