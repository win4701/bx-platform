# =====================================================
# BX PLATFORM — FASTAPI BACKEND (FINAL v1.0)
# =====================================================

import sqlite3
import time
import logging
import os
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

# =====================================================
# CONFIG
# =====================================================
DB_PATH = "db.sqlite"
BX_PRICE_USDT = 0.02
CASINO_RTP = 0.96
REF_REWARD_BX = 5
ADMIN_KEY = os.getenv("ADMIN_KEY", "CHANGE_ME")

# =====================================================
# APP INIT
# =====================================================
app = FastAPI(title="BX Platform API")

# =====================================================
# CORS
# =====================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten after launch
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# SECURITY HEADERS
# =====================================================
@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

# =====================================================
# LOGGING
# =====================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)
log = logging.getLogger("bx")

# =====================================================
# STATIC / UI
# =====================================================
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/", response_class=HTMLResponse)
def home():
    with open("index.html", encoding="utf-8") as f:
        return f.read()

# =====================================================
# DB HELPERS
# =====================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

@app.on_event("startup")
def init_db():
    with open("schema.sql") as f:
        db().executescript(f.read())
    log.info("DB initialized")

# =====================================================
# RATE LIMIT (LIGHT)
# =====================================================
_last_call = {}

def rate_limit(uid: int, limit: float = 0.5):
    now = time.time()
    last = _last_call.get(uid, 0)
    if now - last < limit:
        raise HTTPException(429, "Too many requests")
    _last_call[uid] = now

# =====================================================
# USER CORE
# =====================================================
def ensure_user(uid: int):
    c = db().cursor()
    c.execute(
        "INSERT OR IGNORE INTO users(uid,last_tick) VALUES(?,?)",
        (uid, time.time())
    )
    db().commit()

def mining_tick(uid: int):
    c = db().cursor()
    row = c.execute(
        "SELECT bx,mine_rate,last_tick FROM users WHERE uid=?",
        (uid,)
    ).fetchone()
    if not row:
        return

    bx, rate, last = row
    now = time.time()
    earned = min((now - last) * rate, rate * 86400 * 1.2)

    c.execute(
        "UPDATE users SET bx=bx+?, last_tick=? WHERE uid=?",
        (earned, now, uid)
    )
    db().commit()

# =====================================================
# LEADERBOARD
# =====================================================
def get_leaderboard(limit: int = 10):
    c = db().cursor()
    rows = c.execute(
        "SELECT uid,bx FROM users ORDER BY bx DESC LIMIT ?",
        (limit,)
    ).fetchall()
    return [
        {"rank": i + 1, "uid": uid, "bx": round(bx, 2)}
        for i, (uid, bx) in enumerate(rows)
    ]

# =====================================================
# STATE (CORE API)
# =====================================================
@app.get("/state")
def state(uid: int):
    rate_limit(uid)
    ensure_user(uid)
    mining_tick(uid)

    c = db().cursor()

    bx, usdt, ton, rate = c.execute(
        "SELECT bx,usdt,ton,mine_rate FROM users WHERE uid=?",
        (uid,)
    ).fetchone()

    pending = c.execute(
        "SELECT 1 FROM withdrawals WHERE uid=? AND status='pending'",
        (uid,)
    ).fetchone()

    refs = c.execute(
        "SELECT COUNT(*) FROM referrals WHERE referrer=?",
        (uid,)
    ).fetchone()[0]

    return {
        "user": {
            "uid": uid,
            "level": int(bx // 1000) + 1,
            "title": "Miner" if bx < 5000 else "Pro Miner",
            "mining_active": True
        },
        "wallet": {
            "bx": round(bx, 4),
            "usdt": round(usdt, 2),
            "ton": round(ton, 4)
        },
        "mining": {
            "rate": rate,
            "earned_today": round(rate * 86400, 2)
        },
        "leaderboard": get_leaderboard(),
        "airdrop": {
            "enabled": True,
            "progress_pct": min(round((bx / 10000) * 100, 1), 100),
            "message": "Early users are rewarded"
        },
        "casino": {
            "enabled": True,
            "rtp": CASINO_RTP,
            "fair": True
        },
        "referral": {
            "count": refs,
            "reward_bx": REF_REWARD_BX,
            "link": f"https://t.me/YOUR_BOT?start=ref_{uid}"
        },
        "status": {
            "withdraw_pending": bool(pending)
        }
    }

# =====================================================
# BUY / SELL
# =====================================================
@app.post("/buy/bx")
def buy_bx(uid: int, usdt: float):
    ensure_user(uid)
    mining_tick(uid)

    bx = usdt / BX_PRICE_USDT
    c = db().cursor()

    c.execute(
        "UPDATE users SET usdt=usdt-?, bx=bx+? WHERE uid=?",
        (usdt, bx, uid)
    )
    c.execute(
        "INSERT INTO buys(uid,usdt,bx,price,ts) VALUES(?,?,?,?,?)",
        (uid, usdt, bx, BX_PRICE_USDT, time.time())
    )
    db().commit()

    log.info(f"BUY uid={uid} usdt={usdt}")
    return {"ok": True, "bx": round(bx, 4)}

@app.post("/sell/bx")
def sell_bx(uid: int, bx: float):
    ensure_user(uid)
    mining_tick(uid)

    c = db().cursor()
    bal = c.execute(
        "SELECT bx FROM users WHERE uid=?",
        (uid,)
    ).fetchone()[0]

    if bal < bx:
        raise HTTPException(400, "not enough bx")

    usdt = bx * BX_PRICE_USDT * CASINO_RTP

    c.execute(
        "UPDATE users SET bx=bx-?, usdt=usdt+? WHERE uid=?",
        (bx, usdt, uid)
    )
    c.execute(
        "INSERT INTO sells(uid,bx,usdt,price,fee,method,ts)"
        " VALUES(?,?,?,?,?,?,?)",
        (uid, bx, usdt, BX_PRICE_USDT, 0, "market", time.time())
    )
    db().commit()

    log.info(f"SELL uid={uid} bx={bx}")
    return {"ok": True, "usdt": round(usdt, 2)}

# =====================================================
# WITHDRAW
# =====================================================
@app.post("/withdraw/usdt")
def withdraw_usdt(uid: int, amount: float, method: str, target: str):
    ensure_user(uid)
    c = db().cursor()

    bal = c.execute(
        "SELECT usdt FROM users WHERE uid=?",
        (uid,)
    ).fetchone()[0]

    if bal < amount:
        raise HTTPException(400, "not enough usdt")

    c.execute(
        "UPDATE users SET usdt=usdt-? WHERE uid=?",
        (amount, uid)
    )
    c.execute(
        "INSERT INTO withdrawals(uid,amount,method,target,status,ts)"
        " VALUES(?,?,?,?,?,?)",
        (uid, amount, method, target, "pending", time.time())
    )
    db().commit()

    log.info(f"WITHDRAW uid={uid} amount={amount} method={method}")
    return {"ok": True, "status": "pending"}

# =====================================================
# ADMIN (WITHDRAW APPROVAL)
# =====================================================
def admin_guard(key: str):
    if key != ADMIN_KEY:
        raise HTTPException(403, "forbidden")

@app.get("/admin/withdraws")
def admin_withdraws(key: str):
    admin_guard(key)
    c = db().cursor()
    rows = c.execute(
        "SELECT id,uid,amount,method,target,ts FROM withdrawals "
        "WHERE status='pending' ORDER BY ts ASC"
    ).fetchall()
    return [
        {"id": i, "uid": u, "amount": a, "method": m, "target": t, "ts": ts}
        for i, u, a, m, t, ts in rows
    ]

@app.post("/admin/withdraw/approve")
def admin_approve(wid: int, key: str):
    admin_guard(key)
    c = db().cursor()
    c.execute(
        "UPDATE withdrawals SET status='done' WHERE id=?",
        (wid,)
    )
    db().commit()
    return {"ok": True}

@app.post("/admin/withdraw/reject")
def admin_reject(wid: int, key: str):
    admin_guard(key)
    c = db().cursor()
    row = c.execute(
        "SELECT uid,amount FROM withdrawals WHERE id=?",
        (wid,)
    ).fetchone()
    if not row:
        raise HTTPException(404)

    uid, amount = row
    c.execute(
        "UPDATE users SET usdt=usdt+? WHERE uid=?",
        (amount, uid)
    )
    c.execute(
        "UPDATE withdrawals SET status='rejected' WHERE id=?",
        (wid,)
    )
    db().commit()
    return {"ok": True}

# =====================================================
# HEALTH
# =====================================================
@app.get("/health")
def health():
    try:
        db().cursor().execute("SELECT 1")
        return {"status": "ok"}
    except:
        return {"status": "db_error"}
