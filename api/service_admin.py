import os, time, sqlite3, hmac, hashlib, requests
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel, Field

# ======================================================
# CONFIG
# ======================================================
DB_PATH = "db.sqlite"

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")

# Binance
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")
BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET")
BINANCE_BASE = "https://api.binance.com"

# TON
TON_WALLET = os.getenv("TON_WALLET")
TON_API = "https://toncenter.com/api/v2/getTransactions"

app = FastAPI(title="Unified Real Money Service")

# ======================================================
# DB + AUDIT
# ======================================================
def db():
    c = sqlite3.connect(DB_PATH, check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c

def audit(action, uid, meta=""):
    c = db().cursor()
    c.execute("""
      INSERT INTO audit_logs(action, uid, meta, ts)
      VALUES (?,?,?,?)
    """, (action, uid, meta, int(time.time())))
    c.connection.commit()

def admin_guard(token):
    if token != ADMIN_TOKEN:
        raise HTTPException(401, "ADMIN_ONLY")

# ======================================================
# MODELS
# ======================================================
class DepositAuto(BaseModel):
    provider: str   # ton | binance | redotpay

class WithdrawRequest(BaseModel):
    uid: int
    asset: str      # usdt | ton
    amount: float = Field(gt=0)
    address: str

class AdminWithdrawConfirm(BaseModel):
    id: int
    txid: str | None = None

# ======================================================
# 1️⃣ TON AUTO DEPOSIT
# ======================================================
@app.post("/admin/deposit/ton/auto")
def ton_auto_deposit(x_admin_token: str = Header(None)):
    admin_guard(x_admin_token)

    r = requests.get(TON_API, params={
        "address": TON_WALLET,
        "limit": 20
    }).json()

    for tx in r.get("result", []):
        msg = tx.get("in_msg", {})
        memo = msg.get("message", "")
        if not memo.isdigit():
            continue

        uid = int(memo)
        amount = int(msg.get("value", 0)) / 1e9
        txh = tx["transaction_id"]["hash"]

        c = db().cursor()
        try:
            c.execute("""
              INSERT INTO ton_deposits(tx_hash, uid, amount, ts)
              VALUES (?,?,?,?)
            """, (txh, uid, amount, int(time.time())))

            c.execute(
              "UPDATE wallets SET ton = ton + ? WHERE uid=?",
              (amount, uid)
            )
            c.connection.commit()
            audit("ton_auto_deposit", uid, f"{amount} TON")

        except sqlite3.IntegrityError:
            pass

    return {"ok": True}

# ======================================================
# 2️⃣ BINANCE AUTO DEPOSIT (USDT)
# ======================================================
@app.post("/admin/deposit/binance/auto")
def binance_auto_deposit(x_admin_token: str = Header(None)):
    admin_guard(x_admin_token)

    # يفترض أن الإشعار يأتي من Binance Webhook
    # هنا mock جاهز للربط
    return {"ok": True, "note": "Handled via Binance Webhook"}

# ======================================================
# 3️⃣ REDOTPAY AUTO DEPOSIT (USDT)
# ======================================================
@app.post("/admin/deposit/redotpay/auto")
def redotpay_auto_deposit(x_admin_token: str = Header(None)):
    admin_guard(x_admin_token)

    # RedotPay Webhook integration placeholder
    return {"ok": True, "note": "Handled via RedotPay Webhook"}

# ======================================================
# 4️⃣ USER → WITHDRAW REQUEST (TON / USDT)
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

    c.execute(
        f"UPDATE wallets SET {req.asset}={req.asset}-? WHERE uid=?",
        (req.amount, req.uid)
    )

    c.execute("""
      INSERT INTO withdrawals
      (user_id, asset, amount, address, status, created_at)
      VALUES (?,?,?,?,?,?)
    """, (req.uid, req.asset, req.amount, req.address, "pending", int(time.time())))

    c.connection.commit()
    audit("withdraw_request", req.uid, f"{req.asset}:{req.amount}")
    return {"ok": True, "status": "pending"}

# ======================================================
# 5️⃣ ADMIN → BINANCE WITHDRAW MANUAL (USDT)
# ======================================================
def binance_sign(params):
    q = "&".join(f"{k}={params[k]}" for k in sorted(params))
    return hmac.new(
        BINANCE_API_SECRET.encode(),
        q.encode(),
        hashlib.sha256
    ).hexdigest()

@app.post("/admin/withdraw/binance/manual")
def admin_binance_withdraw(req: AdminWithdrawConfirm,
                           x_admin_token: str = Header(None)):
    admin_guard(x_admin_token)

    c = db().cursor()
    w = c.execute("""
      SELECT user_id, amount, address
      FROM withdrawals
      WHERE id=? AND asset='usdt' AND status='pending'
    """, (req.id,)).fetchone()

    if not w:
        raise HTTPException(404, "NOT_FOUND")

    params = {
        "coin": "USDT",
        "amount": w["amount"],
        "address": w["address"],
        "timestamp": int(time.time() * 1000)
    }

    sig = binance_sign(params)
    r = requests.post(
        f"{BINANCE_BASE}/sapi/v1/capital/withdraw/apply",
        params={**params, "signature": sig},
        headers={"X-MBX-APIKEY": BINANCE_API_KEY}
    )

    if r.status_code != 200:
        raise HTTPException(500, r.text)

    c.execute("""
      UPDATE withdrawals
      SET status='completed', proof_value=?
      WHERE id=?
    """, (r.json().get("id"), req.id))

    c.connection.commit()
    audit("binance_withdraw_manual", w["user_id"], str(w["amount"]))
    return {"ok": True}

# ======================================================
# 6️⃣ ADMIN → TON WITHDRAW MANUAL
# ======================================================
@app.post("/admin/withdraw/ton/manual")
def admin_ton_withdraw(req: AdminWithdrawConfirm,
                       x_admin_token: str = Header(None)):
    admin_guard(x_admin_token)

    c = db().cursor()
    c.execute("""
      UPDATE withdrawals
      SET status='completed', proof_value=?, processed_at=?
      WHERE id=? AND asset='ton' AND status='pending'
    """, (req.txid, int(time.time()), req.id))

    if c.rowcount == 0:
        raise HTTPException(404, "NOT_FOUND")

    c.connection.commit()
    audit("ton_withdraw_manual", None, req.txid)
    return {"ok": True}

# ======================================================
# HEALTH
# ======================================================
@app.get("/")
def root():
    return {"status": "service_admin ready"}
