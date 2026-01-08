import os, time, sqlite3, hmac, hashlib, requests, csv
from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import FileResponse
from pydantic import BaseModel

# ======================================================
# CONFIG
# ======================================================
DB_PATH = "db.sqlite"

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")
BINANCE_MERCHANT_ID = os.getenv("BINANCE_MERCHANT_ID")
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")
BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET")

BINANCE_BASE = "https://api.binance.com"

app = FastAPI(title="Unified Admin Service")

# ======================================================
# DB
# ======================================================
def db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

# ======================================================
# AUDIT
# ======================================================
def audit(action, uid, meta):
    c = db().cursor()
    c.execute("""
        INSERT INTO audit_logs (action, user_id, meta, ts)
        VALUES (?,?,?,?)
    """, (action, uid, meta, int(time.time())))
    c.connection.commit()

# ======================================================
# ADMIN GUARD (TOKEN ONLY)
# ======================================================
def admin_guard(token):
    if token != ADMIN_TOKEN:
        raise HTTPException(401, "ADMIN_ONLY")

# ======================================================
# BINANCE SIGN
# ======================================================
def binance_sign(params: dict):
    query = "&".join(f"{k}={params[k]}" for k in sorted(params))
    sig = hmac.new(
        BINANCE_API_SECRET.encode(),
        query.encode(),
        hashlib.sha256
    ).hexdigest()
    return query + "&signature=" + sig

# ======================================================
# MODELS
# ======================================================
class WithdrawRequest(BaseModel):
    uid: int
    asset: str
    amount: float
    address: str
    network: str = "TRX"

class AdminWithdrawAuto(BaseModel):
    withdraw_id: int

class AdminWithdrawManual(BaseModel):
    withdraw_id: int
    txid: str

# ======================================================
# USER → WITHDRAW REQUEST
# ======================================================
@app.post("/withdraw/request")
def withdraw_request(req: WithdrawRequest):
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
    """, (
        req.uid, req.asset, req.amount, req.address,
        "pending", int(time.time())
    ))

    c.connection.commit()
    audit("withdraw_request", req.uid, str(req.amount))
    return {"ok": True, "status": "pending"}

# ======================================================
# ADMIN → BINANCE AUTO WITHDRAW
# ======================================================
@app.post("/admin/withdraw/binance/auto")
def admin_withdraw_auto(
    req: AdminWithdrawAuto,
    x_admin_token: str = Header(None)
):
    admin_guard(x_admin_token)
    c = db().cursor()

    w = c.execute("""
        SELECT user_id, asset, amount, address
        FROM withdrawals
        WHERE id=? AND status='pending'
    """, (req.withdraw_id,)).fetchone()

    if not w:
        raise HTTPException(404, "WITHDRAW_NOT_FOUND")

    params = {
        "coin": w["asset"].upper(),
        "amount": w["amount"],
        "address": w["address"],
        "timestamp": int(time.time() * 1000)
    }

    query = binance_sign(params)
    headers = {"X-MBX-APIKEY": BINANCE_API_KEY}

    r = requests.post(
        f"{BINANCE_BASE}/sapi/v1/capital/withdraw/apply?{query}",
        headers=headers,
        timeout=15
    )

    if r.status_code != 200:
        raise HTTPException(500, r.text)

    order_id = r.json().get("id")

    c.execute("""
        UPDATE withdrawals
        SET status='processing', proof_value=?
        WHERE id=?
    """, (order_id, req.withdraw_id))

    c.connection.commit()
    audit("withdraw_auto_binance", w["user_id"], order_id)

    return {"ok": True, "binance_order_id": order_id}

# ======================================================
# ADMIN → MANUAL WITHDRAW COMPLETE
# ======================================================
@app.post("/admin/withdraw/manual/complete")
def admin_withdraw_manual(
    req: AdminWithdrawManual,
    x_admin_token: str = Header(None)
):
    admin_guard(x_admin_token)
    c = db().cursor()

    c.execute("""
        UPDATE withdrawals
        SET status='completed', proof_value=?, processed_at=?
        WHERE id=? AND status='pending'
    """, (req.txid, int(time.time()), req.withdraw_id))

    if c.rowcount == 0:
        raise HTTPException(404, "NOT_FOUND")

    c.connection.commit()
    audit("withdraw_manual_complete", None, req.txid)
    return {"ok": True}

# ======================================================
# ADMIN → EXPORT AUDIT CSV
# ======================================================
@app.get("/admin/audit/export")
def export_audit_csv(x_admin_token: str = Header(None)):
    admin_guard(x_admin_token)
    c = db().cursor()

    rows = c.execute("""
        SELECT id, action, user_id, meta, ts FROM audit_logs
        ORDER BY id DESC
    """).fetchall()

    file_path = "/tmp/audit_logs.csv"
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "action", "user_id", "meta", "timestamp"])
        for r in rows:
            writer.writerow([
                r["id"], r["action"], r["user_id"],
                r["meta"], r["ts"]
            ])

    return FileResponse(
        file_path,
        filename="audit_logs.csv",
        media_type="text/csv"
    )

# ======================================================
# HEALTH
# ======================================================
@app.get("/")
def root():
    return {"status": "running"}
