import os
import time
import sqlite3
from datetime import datetime
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from web3 import Web3

# ==================================================
# APP
# ==================================================
app = FastAPI(title="BX Platform – FINAL")

# ==================================================
# ENV
# ==================================================
DB_PATH = os.getenv("DB_PATH", "../db.sqlite3")

BSC_RPC_URL = os.getenv("BSC_RPC_URL")
BEP20_WALLET_ADDRESS = os.getenv("BEP20_WALLET_ADDRESS")
BEP20_PRIVATE_KEY = os.getenv("BEP20_PRIVATE_KEY")

BNB_MIN_DEPOSIT = float(os.getenv("BNB_MIN_DEPOSIT", "0.01"))
BNB_MIN_WITHDRAW = float(os.getenv("BNB_MIN_WITHDRAW", "0.01"))
BNB_WITHDRAW_FEE = float(os.getenv("BNB_WITHDRAW_FEE", "0.0005"))

# ==================================================
# WEB3
# ==================================================
w3 = Web3(Web3.HTTPProvider(BSC_RPC_URL))
HOT_WALLET = Web3.to_checksum_address(BEP20_WALLET_ADDRESS)

# ==================================================
# DB
# ==================================================
def db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

# ==================================================
# SECURITY
# ==================================================
def admin_guard(token: str):
    if not token or token != ADMIN_TOKEN:
        raise HTTPException(401, "UNAUTHORIZED")

# ==================================================
# MODELS
# ==================================================
class DepositVerify(BaseModel):
    uid: int
    tx_hash: str

class WithdrawBNB(BaseModel):
    uid: int
    amount: float
    address: str

# ==================================================
# WALLET HELPERS
# ==================================================
def get_wallet(uid: int):
    c = db().cursor()
    row = c.execute(
        "SELECT bx, ton, usdt, bnb FROM wallets WHERE uid=?",
        (uid,)
    ).fetchone()
    if not row:
        raise HTTPException(404, "WALLET_NOT_FOUND")
    return dict(row)

# ==================================================
# USER – DEPOSIT BNB (BEP20)
# ==================================================
@app.post("/wallet/deposit/bnb/verify")
def verify_bnb_deposit(data: DepositVerify):
    tx = w3.eth.get_transaction(data.tx_hash)
    if not tx or tx["to"] is None:
        raise HTTPException(400, "TX_NOT_FOUND")

    if tx["to"].lower() != HOT_WALLET.lower():
        raise HTTPException(400, "NOT_TO_PLATFORM_WALLET")

    amount = float(w3.from_wei(tx["value"], "ether"))
    if amount < BNB_MIN_DEPOSIT:
        raise HTTPException(400, "AMOUNT_TOO_SMALL")

    receipt = w3.eth.get_transaction_receipt(data.tx_hash)
    if not receipt or receipt["status"] != 1:
        raise HTTPException(400, "TX_NOT_CONFIRMED")

    c = db().cursor()
    if c.execute(
        "SELECT 1 FROM bnb_deposits WHERE tx_hash=?",
        (data.tx_hash,)
    ).fetchone():
        return {"ok": True, "status": "already_confirmed"}

    c.execute("""
        INSERT INTO bnb_deposits
        (user_id, tx_hash, amount, status, ts)
        VALUES (?,?,?,?,?)
    """, (data.uid, data.tx_hash, amount, "confirmed", int(time.time())))

    c.execute("""
        UPDATE wallets SET bnb = bnb + ?
        WHERE uid=?
    """, (amount, data.uid))

    c.connection.commit()

    return {"ok": True, "amount": amount, "network": "BEP20"}

# ==================================================
# USER – WITHDRAW REQUEST
# ==================================================
@app.post("/wallet/withdraw/bnb")
def withdraw_bnb(req: WithdrawBNB):
    if req.amount < BNB_MIN_WITHDRAW:
        raise HTTPException(400, "AMOUNT_TOO_SMALL")

    total = req.amount + BNB_WITHDRAW_FEE
    c = db().cursor()

    bal = c.execute(
        "SELECT bnb FROM wallets WHERE uid=?",
        (req.uid,)
    ).fetchone()

    if not bal or bal["bnb"] < total:
        raise HTTPException(400, "INSUFFICIENT_BNB")

    c.execute("""
        UPDATE wallets SET bnb = bnb - ?
        WHERE uid=?
    """, (total, req.uid))

    c.execute("""
        INSERT INTO bnb_withdrawals
        (user_id, amount, address, status, ts)
        VALUES (?,?,?,?,?)
    """, (
        req.uid,
        req.amount,
        req.address,
        "pending",
        int(time.time())
    ))

    c.connection.commit()
    return {"ok": True, "status": "pending"}

# ==================================================
# USER – WALLET VIEW
# ==================================================
@app.get("/wallet")
def wallet(uid: int):
    return {"uid": uid, "balances": get_wallet(uid)}

# ==================================================
# ADMIN – LIST WITHDRAWALS
# ==================================================
@app.get("/admin/withdrawals/bnb")
def admin_withdrawals(x_admin_token: str = Header(None)):
    admin_guard(x_admin_token)
    c = db().cursor()
    rows = c.execute("""
        SELECT * FROM bnb_withdrawals
        WHERE status='pending'
        ORDER BY ts ASC
    """).fetchall()
    return [dict(r) for r in rows]

# ==================================================
# ADMIN – SEND BNB ON-CHAIN
# ==================================================
def send_bnb(amount: float, to_address: str):
    account = w3.eth.account.from_key(BEP20_PRIVATE_KEY)
    nonce = w3.eth.get_transaction_count(account.address)

    tx = {
        "nonce": nonce,
        "to": Web3.to_checksum_address(to_address),
        "value": w3.to_wei(amount, "ether"),
        "gas": 21000,
        "gasPrice": w3.to_wei("3", "gwei"),
        "chainId": 56
    }

    signed = account.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    return tx_hash.hex()

@app.post("/admin/withdraw/bnb/process")
def process_withdraw(
    withdraw_id: int,
    x_admin_token: str = Header(None)
):
    admin_guard(x_admin_token)
    c = db().cursor()

    w = c.execute("""
        SELECT * FROM bnb_withdrawals
        WHERE id=? AND status='pending'
    """, (withdraw_id,)).fetchone()

    if not w:
        raise HTTPException(404, "WITHDRAW_NOT_FOUND")

    try:
        tx_hash = send_bnb(w["amount"], w["address"])
    except Exception:
        raise HTTPException(500, "TX_FAILED")

    c.execute("""
        UPDATE bnb_withdrawals
        SET status='sent', tx_hash=?
        WHERE id=?
    """, (tx_hash, withdraw_id))

    c.connection.commit()
    return {"ok": True, "tx_hash": tx_hash}

# ==================================================
# ADMIN – HOT WALLET STATUS
# ==================================================
@app.get("/admin/wallet/status")
def admin_wallet_status(x_admin_token: str = Header(None)):
    admin_guard(x_admin_token)
    balance = w3.from_wei(
        w3.eth.get_balance(HOT_WALLET),
        "ether"
    )
    return {
        "wallet": HOT_WALLET,
        "bnb_balance": float(balance),
        "network": "BEP20"
    }
