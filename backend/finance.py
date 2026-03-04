import os
import time
import sqlite3
import secrets
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException, Depends, Query

from auth import get_current_user
from key import api_guard

# ======================================================
# CONFIG
# ======================================================

DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")
MIN_WITHDRAW_USDT = float(os.getenv("MIN_WITHDRAW_USDT", 10))

ALLOWED_ASSETS = {
    "usdt","usdc","ton","bnb","eth",
    "avax","sol","btc","zec","ltc","bx"
}

router = APIRouter(
    prefix="/api",
    tags=["finance"],
    dependencies=[Depends(api_guard)]
)

# ======================================================
# DATABASE
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
# ASSET VALIDATION
# ======================================================

def validate_asset(asset: str):
    asset = asset.lower()

    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")

    return asset

# ======================================================
# WALLET CREATION
# ======================================================

def ensure_wallet(uid: int):

    with get_db() as conn:

        exists = conn.execute(
            "SELECT 1 FROM wallets WHERE uid=?",
            (uid,)
        ).fetchone()

        if not exists:

            conn.execute(
                """
                INSERT INTO wallets(
                    uid,usdt,usdc,ton,bnb,eth,
                    avax,sol,zec,ltc,btc,bx
                )
                VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                (uid,0,0,0,0,0,0,0,0,0,0,0)
            )

# ======================================================
# WALLET SUMMARY
# ======================================================

@router.get("/wallet")
def wallet_summary(user=Depends(get_current_user)):

    uid = user["user_id"]

    ensure_wallet(uid)

    with get_db() as conn:

        row = conn.execute(
            """
            SELECT usdt,usdc,ton,bnb,eth,
                   avax,sol,zec,ltc,btc,bx
            FROM wallets WHERE uid=?
            """,
            (uid,)
        ).fetchone()

        return dict(row)

# ======================================================
# CREDIT
# ======================================================

def credit_wallet(uid: int, asset: str, amount: float, ref: str):

    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    asset = validate_asset(asset)

    ensure_wallet(uid)

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
            (uid,"credit",asset,amount,ref,int(time.time()))
        )

# ======================================================
# DEBIT
# ======================================================

def debit_wallet(uid: int, asset: str, amount: float, ref: str):

    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    asset = validate_asset(asset)

    ensure_wallet(uid)

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
            (uid,"debit",asset,amount,ref,int(time.time()))
        )

# ======================================================
# TRANSFER BETWEEN USERS
# ======================================================

@router.post("/transfer")
def transfer(asset: str, amount: float, to_uid: int, user=Depends(get_current_user)):

    uid = user["user_id"]

    if uid == to_uid:
        raise HTTPException(400, "SELF_TRANSFER")

    asset = validate_asset(asset)

    debit_wallet(uid, asset, amount, f"transfer_to_{to_uid}")
    credit_wallet(to_uid, asset, amount, f"transfer_from_{uid}")

    return {"status": "success"}

# ======================================================
# DEPOSIT ADDRESS
# ======================================================

@router.get("/deposit/address")
def deposit_address(asset: str, user=Depends(get_current_user)):

    uid = user["user_id"]

    asset = validate_asset(asset)

    address = f"{asset}_{uid}_{secrets.token_hex(5)}"

    with get_db() as conn:

        conn.execute(
            """
            INSERT INTO deposit_addresses(uid,asset,address,ts)
            VALUES (?,?,?,?)
            """,
            (uid,asset,address,int(time.time()))
        )

    return {
        "asset": asset,
        "address": address
    }

# ======================================================
# WITHDRAW
# ======================================================

@router.post("/withdraw")
def withdraw(asset: str, amount: float, address: str, user=Depends(get_current_user)):

    uid = user["user_id"]

    asset = validate_asset(asset)

    if amount < MIN_WITHDRAW_USDT:
        raise HTTPException(400,"MIN_WITHDRAW")

    if len(address) < 6:
        raise HTTPException(400,"INVALID_ADDRESS")

    debit_wallet(uid,asset,amount,"withdraw_request")

    with get_db() as conn:

        conn.execute(
            """
            INSERT INTO withdraw_queue(uid,asset,amount,address,status,ts)
            VALUES (?,?,?,?,?,?)
            """,
            (uid,asset,amount,address,"pending",int(time.time()))
        )

    return {"status":"pending"}

# ======================================================
# CASINO INTEGRATION
# ======================================================

def casino_debit(uid: int, amount: float, game: str):

    debit_wallet(uid,"bx",amount,f"casino_{game}_bet")


def casino_credit(uid: int, amount: float, game: str):

    credit_wallet(uid,"bx",amount,f"casino_{game}_win")


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
                "bx",
                payout if win else bet,
                f"{game}_{'win' if win else 'lose'}",
                int(time.time())
            )
        )
