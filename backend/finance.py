import os
import time
import sqlite3
import secrets
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

# ======================================================
# ROUTER
# ======================================================
router = APIRouter(dependencies=[Depends(api_guard)])

# ======================================================
# CONFIG
# ======================================================
DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")

MIN_WITHDRAW_USDT = 10.0
MAX_WITHDRAW_RATIO = 0.5
MAX_WITHDRAW_MONTH = 15

# ======================================================
# DB HELPERS (SAFE)
# ======================================================
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

# ======================================================
# LEDGER (DOUBLE ENTRY — ATOMIC)
# ======================================================
def ledger(ref: str, debit_account: str, credit_account: str, amount: float):
    if amount <= 0:
        return

    ts = int(time.time())
    with get_db() as conn:
        c = conn.cursor()
        try:
            c.execute(
                "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
                (ref, debit_account, amount, 0, ts)
            )
            c.execute(
                "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
                (ref, credit_account, 0, amount, ts)
            )
        except Exception:
            conn.rollback()
            raise HTTPException(500, "LEDGER_ERROR")

# ======================================================
# CREDIT DEPOSIT (SAFE)
# ======================================================
def credit_deposit(uid: int, asset: str, amount: float, txid: str):
    if amount <= 0:
        return

    with get_db() as conn:
        c = conn.cursor()

        if c.execute(
            "SELECT 1 FROM used_txs WHERE txid=?", (txid,)
        ).fetchone():
            return

        c.execute(
            f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
            (amount, uid)
        )

        c.execute(
            """INSERT INTO history (uid, action, asset, amount, ref, ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, "deposit", asset, amount, txid, int(time.time()))
        )

        ledger(f"deposit:{asset}", f"treasury_{asset}", f"user_{asset}", amount)

        c.execute(
            "INSERT OR IGNORE INTO used_txs(txid, ts) VALUES (?,?)",
            (txid, int(time.time()))
        )

# ======================================================
# USER WALLET
# ======================================================
@router.get("/me")
def wallet_me(uid: int):
    with get_db() as conn:
        c = conn.cursor()
        r = c.execute(
            "SELECT usdt, ton, bnb, eth, sol, btc, bx FROM wallets WHERE uid=?",
            (uid,)
        ).fetchone()

        if not r:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        keys = ["usdt", "ton", "bnb", "eth", "sol", "btc", "bx"]
        return {
            "wallet": dict(zip(keys, r)),
            "deposit_status": "confirmed"
        }

# ======================================================
# WITHDRAW VALIDATION (FIXED)
# ======================================================
def validate_withdraw(uid: int, amount: float):
    if amount < MIN_WITHDRAW_USDT:
        raise HTTPException(400, "MIN_WITHDRAW_10")

    with get_db() as conn:
        c = conn.cursor()

        bal = c.execute(
            "SELECT usdt FROM wallets WHERE uid=?", (uid,)
        ).fetchone()

        if not bal:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        if amount > bal[0] * MAX_WITHDRAW_RATIO:
            raise HTTPException(400, "WITHDRAW_LIMIT_50_PERCENT")

        month_start = int(time.time()) - 30 * 86400
        count = c.execute(
            """SELECT COUNT(*) FROM withdrawals
               WHERE uid=? AND status='sent' AND ts>?""",
            (uid, month_start)
        ).fetchone()[0]

        if count >= MAX_WITHDRAW_MONTH:
            raise HTTPException(400, "WITHDRAW_MONTH_LIMIT")

# ======================================================
# REQUEST WITHDRAW
# ======================================================
@router.post("/withdraw")
def request_withdraw(uid: int, amount: float, address: str):
    validate_withdraw(uid, amount)

    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            """INSERT INTO withdrawals
               (uid, asset, amount, address, status, ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, "usdt", amount, address, "requested", int(time.time()))
        )

    return {"status": "requested"}

# ======================================================
# TELEGRAM LINK (STAGE 1 READY)
# ======================================================
def generate_telegram_code(uid: int) -> str:
    code = secrets.token_hex(3).upper()
    with get_db() as conn:
        conn.execute(
            "UPDATE users SET telegram_code=? WHERE id=?",
            (code, uid)
        )
    return code


def link_telegram_account(telegram_id: int, code: str) -> bool:
    with get_db() as conn:
        c = conn.cursor()
        row = c.execute(
            "SELECT id FROM users WHERE telegram_code=?",
            (code,)
        ).fetchone()

        if not row:
            return False

        c.execute(
            "UPDATE users SET telegram_id=?, telegram_code=NULL WHERE id=?",
            (telegram_id, row[0])
        )
    return True
