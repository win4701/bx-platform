# ==========================================================
# BLOXIO FINANCE ENGINE
# Wallet • Deposit • Withdraw • Transfer
# ==========================================================

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import sqlite3
import os
import time
import secrets

from security import get_current_user

router = APIRouter(prefix="/finance", tags=["finance"])

DB_PATH = os.getenv("DB_PATH", "bloxio.db")

# ==========================================================
# DATABASE
# ==========================================================

def db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ==========================================================
# ASSETS
# ==========================================================

ASSETS = [
    "BX",
    "USDT",
    "USDC",
    "BTC",
    "BNB",
    "ETH",
    "SOL",
    "TON"
]

# ==========================================================
# WALLET
# ==========================================================

@router.get("/wallet")
def get_wallet(user=Depends(get_current_user)):

    user_id = user["user_id"]

    conn = db()
    cur = conn.cursor()

    cur.execute("SELECT * FROM wallets WHERE user_id=?", (user_id,))
    row = cur.fetchone()

    if not row:

        balances = {a: 0 for a in ASSETS}

        cur.execute(
            "INSERT INTO wallets(user_id) VALUES(?)",
            (user_id,)
        )

        conn.commit()
        conn.close()

        return balances

    balances = {}

    for asset in ASSETS:
        balances[asset] = row[asset] if asset in row.keys() else 0

    conn.close()

    return balances


# ==========================================================
# DEPOSIT ADDRESS
# ==========================================================

class DepositResponse(BaseModel):
    asset: str
    address: str


@router.get("/deposit/{asset}", response_model=DepositResponse)
def deposit_address(asset: str, user=Depends(get_current_user)):

    user_id = user["user_id"]
    asset = asset.upper()

    if asset not in ASSETS:
        raise HTTPException(400, "Unsupported asset")

    conn = db()
    cur = conn.cursor()

    cur.execute(
        "SELECT address FROM deposit_addresses WHERE user_id=? AND asset=?",
        (user_id, asset)
    )

    row = cur.fetchone()

    if row:
        conn.close()
        return {"asset": asset, "address": row["address"]}

    address = "bx_" + secrets.token_hex(20)

    cur.execute(
        """
        INSERT INTO deposit_addresses
        (user_id, asset, address, created_at)
        VALUES(?,?,?,?)
        """,
        (user_id, asset, address, int(time.time()))
    )

    conn.commit()
    conn.close()

    return {"asset": asset, "address": address}


# ==========================================================
# WITHDRAW
# ==========================================================

class WithdrawRequest(BaseModel):
    asset: str
    amount: float
    address: str


@router.post("/withdraw")
def withdraw(req: WithdrawRequest, user=Depends(get_current_user)):

    user_id = user["user_id"]
    asset = req.asset.upper()
    amount = float(req.amount)

    if asset not in ASSETS:
        raise HTTPException(400, "Unsupported asset")

    if amount <= 0:
        raise HTTPException(400, "Invalid amount")

    conn = db()
    cur = conn.cursor()

    cur.execute(f"SELECT {asset} FROM wallets WHERE user_id=?", (user_id,))
    row = cur.fetchone()

    if not row:
        raise HTTPException(400, "Wallet not found")

    balance = row[asset] or 0

    if balance < amount:
        raise HTTPException(400, "Insufficient balance")

    new_balance = balance - amount

    cur.execute(
        f"UPDATE wallets SET {asset}=? WHERE user_id=?",
        (new_balance, user_id)
    )

    cur.execute(
        """
        INSERT INTO withdrawals
        (user_id, asset, amount, address, status, created_at)
        VALUES(?,?,?,?,?,?)
        """,
        (user_id, asset, amount, req.address, "pending", int(time.time()))
    )

    conn.commit()
    conn.close()

    return {
        "status": "submitted",
        "asset": asset,
        "amount": amount
    }


# ==========================================================
# TRANSFER (internal BX)
# ==========================================================

class TransferRequest(BaseModel):
    to_user: int
    asset: str
    amount: float


@router.post("/transfer")
def transfer(req: TransferRequest, user=Depends(get_current_user)):

    sender = user["user_id"]
    receiver = req.to_user
    asset = req.asset.upper()
    amount = req.amount

    if asset not in ASSETS:
        raise HTTPException(400, "Unsupported asset")

    if amount <= 0:
        raise HTTPException(400, "Invalid amount")

    conn = db()
    cur = conn.cursor()

    cur.execute(f"SELECT {asset} FROM wallets WHERE user_id=?", (sender,))
    row = cur.fetchone()

    if not row:
        raise HTTPException(400, "Wallet not found")

    balance = row[asset] or 0

    if balance < amount:
        raise HTTPException(400, "Insufficient balance")

    cur.execute(
        f"UPDATE wallets SET {asset}={asset}-? WHERE user_id=?",
        (amount, sender)
    )

    cur.execute(
        f"UPDATE wallets SET {asset}={asset}+? WHERE user_id=?",
        (amount, receiver)
    )

    cur.execute(
        """
        INSERT INTO transfers
        (from_user,to_user,asset,amount,created_at)
        VALUES(?,?,?,?,?)
        """,
        (sender, receiver, asset, amount, int(time.time()))
    )

    conn.commit()
    conn.close()

    return {"status": "sent"}


# ==========================================================
# CREDIT / DEBIT (casino / mining)
# ==========================================================

def credit_user(user_id: int, asset: str, amount: float):

    conn = db()
    cur = conn.cursor()

    cur.execute(
        f"UPDATE wallets SET {asset}={asset}+? WHERE user_id=?",
        (amount, user_id)
    )

    conn.commit()
    conn.close()


def debit_user(user_id: int, asset: str, amount: float):

    conn = db()
    cur = conn.cursor()

    cur.execute(
        f"UPDATE wallets SET {asset}={asset}-? WHERE user_id=?",
        (amount, user_id)
    )

    conn.commit()
    conn.close()


# ==========================================================
# TRANSACTIONS
# ==========================================================

@router.get("/transactions")
def transactions(user=Depends(get_current_user)):

    user_id = user["user_id"]

    conn = db()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT * FROM withdrawals
        WHERE user_id=?
        ORDER BY created_at DESC
        LIMIT 50
        """,
        (user_id,)
    )

    rows = cur.fetchall()

    conn.close()

    return [dict(r) for r in rows]
