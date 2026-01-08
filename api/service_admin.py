import os
import time
import sqlite3
from fastapi import FastAPI, HTTPException, Header, Request
from pydantic import BaseModel

# ======================================================
# CONFIG
# ======================================================
DB_PATH = "db.sqlite"

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")
BINANCE_MERCHANT_ID = os.getenv("BINANCE_MERCHANT_ID")
BINANCE_PAY_WEBHOOK_SECRET = os.getenv("BINANCE_PAY_WEBHOOK_SECRET")

app = FastAPI(title="Unified Admin & Webhook Service")

# ======================================================
# DB
# ======================================================
def db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

# ======================================================
# ADMIN GUARD
# ======================================================
def admin_guard(token: str | None):
    if token != ADMIN_TOKEN:
        raise HTTPException(401, "ADMIN_ONLY")

# ======================================================
# MODELS
# ======================================================
class RedotPayDepositRequest(BaseModel):
    uid: int
    amount: float
    reference: str

class AdminConfirmRedotPay(BaseModel):
    payment_id: int

# ======================================================
# 1️⃣ BINANCE PAY WEBHOOK (AUTO DEPOSIT)
# ======================================================
@app.post("/webhook/binance-pay")
async def binance_pay_webhook(request: Request):
    data = await request.json()

    # تحقق Merchant ID
    if str(data.get("merchantId")) != str(BINANCE_MERCHANT_ID):
        raise HTTPException(403, "INVALID_MERCHANT")

    if data.get("status") != "SUCCESS":
        return {"ok": True}

    uid = int(data["merchantTradeNo"])
    amount = float(data["amount"])
    order_id = data["orderId"]

    c = db().cursor()

    # منع التكرار
    if c.execute(
        "SELECT 1 FROM payments WHERE proof_value=?",
        (order_id,)
    ).fetchone():
        return {"ok": True}

    # تسجيل الإيداع
    c.execute("""
        INSERT INTO payments
        (user_id, provider, asset, amount,
         proof_type, proof_value,
         status, verified_by,
         created_at, confirmed_at)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    """, (
        uid,
        "binance_pay",
        "usdt",
        amount,
        "order_id",
        order_id,
        "confirmed",
        "api",
        int(time.time()),
        int(time.time())
    ))

    # إضافة الرصيد
    c.execute(
        "UPDATE wallets SET usdt=usdt+? WHERE uid=?",
        (amount, uid)
    )

    c.connection.commit()
    return {"ok": True}

# ======================================================
# 2️⃣ REDOTPAY → USER REQUEST (PENDING ONLY)
# ======================================================
@app.post("/deposit/redotpay")
def redotpay_request(req: RedotPayDepositRequest):
    c = db().cursor()

    c.execute("""
        INSERT INTO payments
        (user_id, provider, asset, amount,
         proof_type, proof_value,
         status, verified_by,
         created_at)
        VALUES (?,?,?,?,?,?,?,?,?)
    """, (
        req.uid,
        "redotpay",
        "usdt",
        req.amount,
        "manual",
        req.reference,
        "pending",
        "system",
        int(time.time())
    ))

    c.connection.commit()
    return {
        "ok": True,
        "status": "pending",
        "message": "Waiting for admin confirmation"
    }

# ======================================================
# 3️⃣ ADMIN → CONFIRM REDOTPAY
# ======================================================
@app.post("/admin/redotpay/confirm")
def admin_confirm_redotpay(
    req: AdminConfirmRedotPay,
    x_admin_token: str = Header(None)
):
    admin_guard(x_admin_token)

    c = db().cursor()
    p = c.execute("""
        SELECT user_id, amount
        FROM payments
        WHERE id=? AND provider='redotpay' AND status='pending'
    """, (req.payment_id,)).fetchone()

    if not p:
        raise HTTPException(404, "PAYMENT_NOT_FOUND")

    # إضافة الرصيد
    c.execute(
        "UPDATE wallets SET usdt=usdt+? WHERE uid=?",
        (p["amount"], p["user_id"])
    )

    # تحديث الحالة
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
        "message": "RedotPay deposit confirmed"
    }

# ======================================================
# HEALTH
# ======================================================
@app.get("/")
def root():
    return {"status": "running"}
