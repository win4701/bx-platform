import time
import sqlite3
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

DB_PATH = "db.sqlite"

app = FastAPI(title="Wallet Real Deposit & Withdraw")

# ======================================================
# DB
# ======================================================
def db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

# ======================================================
# MODELS
# ======================================================
class DepositRequest(BaseModel):
    uid: int
    provider: str          # ton | binance | redotpay
    amount: float = Field(gt=0)

class WithdrawRequest(BaseModel):
    uid: int
    asset: str             # usdt | ton
    amount: float = Field(gt=0)
    address: str

class AdminConfirmDeposit(BaseModel):
    payment_id: int

class AdminCompleteWithdraw(BaseModel):
    withdraw_id: int
    txid: str

# ======================================================
# 1️⃣ USER → DEPOSIT REQUEST (NO BALANCE CHANGE)
# ======================================================
@app.post("/deposit/request")
def deposit_request(req: DepositRequest):
    asset = "ton" if req.provider == "ton" else "usdt"

    c = db().cursor()
    c.execute("""
        INSERT INTO payments
        (user_id, provider, asset, amount,
         proof_type, proof_value, status,
         verified_by, created_at)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        req.uid,
        req.provider,
        asset,
        req.amount,
        "manual",
        None,
        "pending",
        "system",
        int(time.time())
    ))
    c.connection.commit()

    return {
        "ok": True,
        "message": "Deposit request created",
        "status": "pending"
    }

# ======================================================
# 2️⃣ USER → WITHDRAW REQUEST (BALANCE RESERVED)
# ======================================================
@app.post("/withdraw/request")
def withdraw_request(req: WithdrawRequest):
    if req.asset not in ("usdt", "ton"):
        raise HTTPException(400, "INVALID_ASSET")

    c = db().cursor()
    bal = c.execute(
        f"SELECT {req.asset} FROM wallets WHERE uid=?",
        (req.uid,)
    ).fetchone()

    if not bal or bal[0] < req.amount:
        raise HTTPException(400, "INSUFFICIENT_BALANCE")

    # reserve balance
    c.execute(
        f"UPDATE wallets SET {req.asset}={req.asset}-? WHERE uid=?",
        (req.amount, req.uid)
    )

    c.execute("""
        INSERT INTO withdrawals
        (user_id, provider, asset, amount, address,
         status, created_at)
        VALUES (?,?,?,?,?,?,?)
    """, (
        req.uid,
        "manual",
        req.asset,
        req.amount,
        req.address,
        "pending",
        int(time.time())
    ))

    c.connection.commit()

    return {
        "ok": True,
        "message": "Withdraw request submitted",
        "status": "pending"
    }

# ======================================================
# 3️⃣ ADMIN → CONFIRM DEPOSIT (ADD BALANCE)
# ======================================================
@app.post("/admin/deposit/confirm")
def admin_confirm_deposit(req: AdminConfirmDeposit):
    c = db().cursor()
    p = c.execute("""
        SELECT user_id, asset, amount
        FROM payments
        WHERE id=? AND status='pending'
    """, (req.payment_id,)).fetchone()

    if not p:
        raise HTTPException(404, "DEPOSIT_NOT_FOUND")

    c.execute(
        f"UPDATE wallets SET {p['asset']}={p['asset']}+? WHERE uid=?",
        (p["amount"], p["user_id"])
    )

    c.execute("""
        UPDATE payments
        SET status='confirmed',
            verified_by='admin',
            confirmed_at=?
        WHERE id=?
    """, (int(time.time()), req.payment_id))

    c.connection.commit()

    return {
        "ok": True,
        "message": "Deposit confirmed"
    }

# ======================================================
# 4️⃣ ADMIN → COMPLETE WITHDRAW
# ======================================================
@app.post("/admin/withdraw/complete")
def admin_complete_withdraw(req: AdminCompleteWithdraw):
    c = db().cursor()
    c.execute("""
        UPDATE withdrawals
        SET status='completed',
            proof_value=?,
            processed_at=?
        WHERE id=? AND status='pending'
    """, (req.txid, int(time.time()), req.withdraw_id))

    if c.rowcount == 0:
        raise HTTPException(404, "WITHDRAW_NOT_FOUND")

    c.connection.commit()

    return {
        "ok": True,
        "message": "Withdraw completed"
    }

# ======================================================
# HEALTH
# ======================================================
@app.get("/")
def root():
    return {"status": "running"}
