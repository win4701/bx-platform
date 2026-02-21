import os
import time
import sqlite3
import secrets
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from key import api_guard, admin_guard
from risk_engine import evaluate_withdraw

DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")
MIN_WITHDRAW_USDT = float(os.getenv("MIN_WITHDRAW_USDT", 10))

ALLOWED_ASSETS = {
    "usdt","usdc","ton","bnb","eth",
    "avax","sol","btc","zec","ltc","bx"
}

router = APIRouter(prefix="/finance", dependencies=[Depends(api_guard)])

# ======================================================
# DB (ATOMIC)
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
# LEDGER
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
# WALLET READ
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
# DEBIT (SAFE)
# ======================================================

def debit_wallet(uid: int, asset: str, amount: float, ref: str):

    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    asset = asset.lower()

    with get_db() as conn:
        c = conn.cursor()

        c.execute(
            f"""UPDATE wallets
                SET {asset} = {asset} - ?
                WHERE uid=? AND {asset} >= ?""",
            (amount, uid, amount)
        )

        if c.rowcount == 0:
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
# REQUEST WITHDRAW (RISK ENGINE INTEGRATED)
# ======================================================

@router.post("/withdraw")
def request_withdraw(uid: int, amount: float, address: str):

    if amount < MIN_WITHDRAW_USDT:
        raise HTTPException(400, "MIN_WITHDRAW")

    risk = evaluate_withdraw(uid, amount, address)

    # خصم الرصيد فورًا لمنع double-spend
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
# ADMIN APPROVE
# ======================================================

@router.post("/admin/withdraw/approve", dependencies=[Depends(admin_guard)])
def approve_withdraw(withdraw_id: int):

    with get_db() as conn:
        conn.execute(
            "UPDATE withdraw_queue SET status='approved' WHERE id=?",
            (withdraw_id,)
        )

    return {"status": "approved"}

# ======================================================
# ADMIN REJECT
# ======================================================

@router.post("/admin/withdraw/reject", dependencies=[Depends(admin_guard)])
def reject_withdraw(withdraw_id: int):

    with get_db() as conn:
        row = conn.execute(
            "SELECT uid,amount FROM withdraw_queue WHERE id=?",
            (withdraw_id,)
        ).fetchone()

        if not row:
            raise HTTPException(404, "NOT_FOUND")

        # إعادة الرصيد
        conn.execute(
            "UPDATE wallets SET usdt = usdt + ? WHERE uid=?",
            (row["amount"], row["uid"])
        )

        conn.execute(
            "UPDATE withdraw_queue SET status='rejected' WHERE id=?",
            (withdraw_id,)
        )

    return {"status": "rejected"}

# ======================================================
# TELEGRAM LINK (FIXED UID BUG)
# ======================================================

def generate_telegram_code(uid: int) -> str:
    code = secrets.token_hex(3).upper()
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET telegram_code=? WHERE uid=?",
            (code, uid)
        )
    return code

def link_telegram_account(telegram_id: int, code: str) -> bool:
    with get_db() as conn:
        row = conn.execute(
            "SELECT uid FROM users WHERE telegram_code=?",
            (code,)
        ).fetchone()

        if not row:
            return False

        conn.execute(
            "UPDATE users SET telegram_id=?, telegram_code=NULL WHERE uid=?",
            (telegram_id, row["uid"])
        )
    return True
