import os
import time
import sqlite3
from contextlib import contextmanager
from fastapi import HTTPException
from fastapi.responses import StreamingResponse
from decimal import Decimal
import secrets

from key import api_guard, admin_guard

# ======================================================
# CONFIGURATION
# ======================================================
DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")

MIN_WITHDRAW_USDT = 10.0
MAX_WITHDRAW_RATIO = 0.5
MAX_WITHDRAW_MONTH = 15

ALLOWED_ASSETS = {"usdt", "usdc", "ton", "bnb", "eth", "avax", "sol", "btc", "zec", "ltc", "bx"}

# ======================================================
# DATABASE HELPER (ATOMIC & SAFE)
# ======================================================
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# ======================================================
# LEDGER (DOUBLE ENTRY SYSTEM)
# ======================================================
def ledger(ref: str, debit_account: str, credit_account: str, amount: float):
    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    ts = int(time.time())
    with get_db() as conn:
        c = conn.cursor()
        c.execute(
            "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
            (ref, debit_account, amount, 0, ts)
        )
        c.execute(
            "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
            (ref, credit_account, 0, amount, ts)
        )

# ======================================================
# CREDIT DEPOSIT (IDEMPOTENT & SAFE)
# ======================================================
def credit_deposit(uid: int, asset: str, amount: float, txid: str):
    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    asset = asset.lower()
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")

    with get_db() as conn:
        c = conn.cursor()

        # Ensuring the deposit is idempotent
        if c.execute(
            "SELECT 1 FROM used_txs WHERE txid=?",
            (txid,)
        ).fetchone():
            return

        # Update wallet balance
        c.execute(
            f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
            (amount, uid)
        )

        if c.rowcount == 0:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        # Transaction history
        c.execute(
            """INSERT INTO history (uid, action, asset, amount, ref, ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, "deposit", asset, amount, txid, int(time.time()))
        )

        # Ledger update
        ledger(
            ref=f"deposit:{asset}",
            debit_account=f"treasury_{asset}",
            credit_account=f"user_{asset}",
            amount=amount
        )

        # Mark transaction as used
        c.execute(
            "INSERT INTO used_txs(txid, asset, ts) VALUES (?,?,?)",
            (txid, asset, int(time.time()))
        )

# ======================================================
# DEBIT WALLET (USED FOR WITHDRAW & EXCHANGE)
# ======================================================
def debit_wallet(uid: int, asset: str, amount: float, ref: str):
    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    asset = asset.lower()
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")

    with get_db() as conn:
        c = conn.cursor()

        # Checking wallet balance before debit
        c.execute(
            f"SELECT {asset} FROM wallets WHERE uid=?",
            (uid,)
        )
        row = c.fetchone()
        if not row or row[asset] < amount:
            raise HTTPException(400, "INSUFFICIENT_BALANCE")

        # Update wallet balance
        c.execute(
            f"UPDATE wallets SET {asset} = {asset} - ? WHERE uid=? AND {asset} >= ?",
            (amount, uid, amount)
        )

        # Transaction history
        c.execute(
            """INSERT INTO history (uid, action, asset, amount, ref, ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, "debit", asset, amount, ref, int(time.time()))
        )

        # Ledger update
        ledger(
            ref=ref,
            debit_account=f"user_{asset}",
            credit_account=f"treasury_{asset}",
            amount=amount
        )

# ======================================================
# WALLET (READ USER BALANCE)
# ======================================================
@router.get("/me")
def wallet_me(uid: int):
    with get_db() as conn:
        c = conn.cursor()
        row = c.execute(
            "SELECT usdt, usdc, ton, bnb, eth, avax, sol, zec, ltc, btc, bx FROM wallets WHERE uid=?",
            (uid,)
        ).fetchone()

        if not row:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        return {
            "wallet": dict(row),
            "deposit_status": "confirmed"
        }

# ======================================================
# WITHDRAWAL VALIDATION
# ======================================================
def validate_withdraw(uid: int, amount: float):
    if amount < MIN_WITHDRAW_USDT:
        raise HTTPException(400, "MIN_WITHDRAW_10")

    with get_db() as conn:
        c = conn.cursor()

        bal = c.execute(
            "SELECT usdt FROM wallets WHERE uid=?",
            (uid,)
        ).fetchone()

        if not bal:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        if amount > bal["usdt"] * MAX_WITHDRAW_RATIO:
            raise HTTPException(400, "WITHDRAW_LIMIT_50_PERCENT")

        month_start = int(time.time()) - 30 * 86400
        count = c.execute(
            """SELECT COUNT(*) AS c FROM withdrawals
               WHERE uid=? AND status='sent' AND ts>?""",
            (uid, month_start)
        ).fetchone()["c"]

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
# ADMIN — LEDGER EXPORT
# ======================================================
@router.get("/admin/ledger/export", dependencies=[Depends(admin_guard)])
def export_ledger():
    with get_db() as conn:
        c = conn.cursor()
        rows = c.execute(
            "SELECT ref, account, debit, credit, ts FROM ledger ORDER BY ts"
        )

        def gen():
            yield "ref,account,debit,credit,ts\n"
            for r in rows:
                yield ",".join(map(str, r)) + "\n"

        return StreamingResponse(
            gen(),
            media_type="text/csv",
            headers={
                "Content-Disposition": "attachment; filename=ledger.csv"
            }
        )
