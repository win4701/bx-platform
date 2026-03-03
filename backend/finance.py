import os
import time
import sqlite3
import secrets
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException, Depends, Query

from key import api_guard, admin_guard

# ======================================================
# CONFIG
# ======================================================

DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")
MIN_WITHDRAW_USDT = float(os.getenv("MIN_WITHDRAW_USDT", 10))

ALLOWED_ASSETS = {
    "usdt","usdc","ton","bnb","eth",
    "avax","sol","btc","zec","ltc","bx"
}

router = APIRouter(dependencies=[Depends(api_guard)])

# ======================================================
# DATABASE (ATOMIC SAFE)
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
# SAFE COLUMN CHECK
# ======================================================

def validate_asset(asset: str):
    asset = asset.lower()
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")
    return asset

# ======================================================
# WALLET ENDPOINT (FOR FRONTEND)
# ======================================================

@router.get("/wallet")
def wallet_summary(uid: int):

    with get_db() as conn:
        row = conn.execute(
            """
            SELECT usdt,usdc,ton,bnb,eth,
                   avax,sol,zec,ltc,btc,bx
            FROM wallets WHERE uid=?
            """,
            (uid,)
        ).fetchone()

        if not row:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        return dict(row)

# ======================================================
# SAFE DEBIT
# ======================================================

def debit_wallet(uid: int, asset: str, amount: float, ref: str):

    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    asset = validate_asset(asset)

    with get_db() as conn:
        cursor = conn.execute(
            f"""
            UPDATE wallets
            SET {asset} = {asset} - ?
            WHERE uid=? AND {asset} >= ?
            """,
            (amount, uid, amount)
        )

        if cursor.rowcount == 0:
            raise HTTPException(400, "INSUFFICIENT_BALANCE")

        conn.execute(
            """
            INSERT INTO history(uid,action,asset,amount,ref,ts)
            VALUES (?,?,?,?,?,?)
            """,
            (uid, "debit", asset, amount, ref, int(time.time()))
        )

# ======================================================
# SAFE CREDIT
# ======================================================

def credit_wallet(uid: int, asset: str, amount: float, ref: str):

    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    asset = validate_asset(asset)

    with get_db() as conn:
        conn.execute(
            f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
            (amount, uid)
        )

        conn.execute(
            """
            INSERT INTO history(uid,action,asset,amount,ref,ts)
            VALUES (?,?,?,?,?,?)
            """,
            (uid, "credit", asset, amount, ref, int(time.time()))
        )

# ======================================================
# DEPOSIT ADDRESS (REAL ENDPOINT FOR FRONTEND)
# ======================================================

@router.get("/deposit/address")
def get_deposit_address(uid: int, asset: str = Query(...)):

    asset = validate_asset(asset)

    address = f"{asset.upper()}_{uid}_{secrets.token_hex(4)}"

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO deposit_addresses(uid,asset,address,ts)
            VALUES (?,?,?,?)
            """,
            (uid, asset, address, int(time.time()))
        )

    return {"asset": asset, "address": address}

# ======================================================
# WITHDRAW REQUEST
# ======================================================

@router.post("/withdraw")
def request_withdraw(uid: int, asset: str, amount: float, address: str):

    asset = validate_asset(asset)

    if amount < MIN_WITHDRAW_USDT:
        raise HTTPException(400, "MIN_WITHDRAW")

    if not address or len(address) < 5:
        raise HTTPException(400, "INVALID_ADDRESS")

    debit_wallet(uid, asset, amount, "withdraw_request")

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO withdraw_queue(uid,asset,amount,address,status,ts)
            VALUES (?,?,?,?,?,?)
            """,
            (uid, asset, amount, address, "pending", int(time.time()))
        )

    return {"status": "pending"}

# ======================================================
# CASINO INTEGRATION
# ======================================================

def casino_debit(uid: int, amount: float, game: str):
    debit_wallet(uid, "usdt", amount, f"casino_{game}_bet")

def casino_credit(uid: int, amount: float, game: str):
    credit_wallet(uid, "usdt", amount, f"casino_{game}_win")

def casino_history(uid: int, game: str, bet: float, payout: float, win: bool):

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO history(uid,action,asset,amount,ref,ts)
            VALUES (?,?,?,?,?,?)
            """,
            (
                uid,
                "casino",
                "usdt",
                payout if win else bet,
                f"{game}_{'win' if win else 'lose'}",
                int(time.time())
            )
                          )
