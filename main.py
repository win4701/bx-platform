# =========================
# Bloxio BX – Render Safe
# =========================

import os
import time
import random
from collections import defaultdict
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from dotenv import load_dotenv
import psycopg2
import httpx

# =========================
# ENV
# =========================
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
ADMIN_IDS = set(
    int(x) for x in os.getenv("ADMIN_IDS", "").split(",") if x.strip().isdigit()
)

STON_POOL_ID = os.getenv("STON_POOL_ID", "")
STON_POOL_API = "https://api.ston.fi/v1/pools/"
COINGECKO = "https://api.coingecko.com/api/v3/simple/price"

BX_RATE_TON = 2.0
BX_RATE_USDT = 1.5
BX_TO_TON = 0.2

MIN_WITHDRAW_TON = 1.0
MAX_WITHDRAW_TON = 100.0
DAILY_WITHDRAW_LIMIT = 300.0

RTP_CRASH = 0.97
RTP_DICE = 0.96

# =========================
# APP
# =========================
app = FastAPI(title="Bloxio BX")

# =========================
# DB (Render-safe)
# =========================
conn = psycopg2.connect(DATABASE_URL, sslmode="require")
conn.autocommit = True

def q(sql, params=None, one=False):
    with conn.cursor() as c:
        c.execute(sql, params or ())
        return c.fetchone() if one else c.fetchall()

# =========================
# RATE LIMIT
# =========================
RATE = {"window": 60, "max": 30}
_hits = defaultdict(list)

@app.middleware("http")
async def limiter(req: Request, call_next):
    ip = req.client.host
    now = time.time()
    _hits[ip] = [t for t in _hits[ip] if now - t < RATE["window"]]
    if len(_hits[ip]) >= RATE["max"]:
        return HTMLResponse("Too many requests", status_code=429)
    _hits[ip].append(now)
    return await call_next(req)

# =========================
# UI
# =========================
@app.get("/", response_class=HTMLResponse)
def home():
    with open("index.html", encoding="utf-8") as f:
        return f.read()

@app.get("/health")
def health():
    return {"ok": True}

# =========================
# MARKET
# =========================
PRICE_CACHE = {"ts": 0}

@app.get("/market")
async def market():
    now = time.time()
    if now - PRICE_CACHE.get("ts", 0) > 30:
        async with httpx.AsyncClient(timeout=10) as x:
            ton_usdt = (
                await x.get(
                    COINGECKO,
                    params={"ids": "the-open-network", "vs_currencies": "usd"},
                )
            ).json()["the-open-network"]["usd"]

            pool = (await x.get(STON_POOL_API + STON_POOL_ID)).json()["pool"]
            bx = float(pool["reserves"][0]["balance"])
            ton = float(pool["reserves"][1]["balance"])
            bx_ton = ton / bx if bx else 0

            PRICE_CACHE.update(
                {
                    "ts": now,
                    "bx_ton": round(bx_ton, 6),
                    "bx_usdt": round(bx_ton * ton_usdt, 6),
                    "liq_ton": ton,
                    "liq_bx": bx,
                }
            )
    return PRICE_CACHE

# =========================
# USERS
# =========================
@app.post("/user/init")
def user_init(p: dict):
    q("INSERT INTO users(id) VALUES(%s) ON CONFLICT DO NOTHING", (p["user"],))
    return {"ok": True}

@app.get("/wallet/{uid}")
def wallet(uid: int):
    r = q("SELECT bx FROM users WHERE id=%s", (uid,), one=True)
    return {"bx": float(r[0]) if r else 0}

# =========================
# CASINO
# =========================
_last_play = {}

def can_play(uid):
    now = time.time()
    if now - _last_play.get(uid, 0) < 2:
        return False
    _last_play[uid] = now
    return True

@app.get("/casino/crash")
def crash(uid: int):
    if not can_play(uid):
        return {"error": "slow down"}
    r = random.random()
    if r < 0.03:
        m = random.uniform(1.01, 1.2)
    elif r < 0.25:
        m = random.uniform(1.2, 2.0)
    else:
        m = random.uniform(2.0, 6.0)
    return {"crash_at": round(m, 2), "rtp": int(RTP_CRASH * 100)}

@app.post("/casino/dice")
def dice(p: dict):
    uid = p["user"]
    if not can_play(uid):
        return {"error": "slow down"}
    roll = random.randint(1, 100)
    return {"roll": roll, "win": roll > 52, "rtp": int(RTP_DICE * 100)}

# =========================
# BUY TON
# =========================
@app.post("/buy/ton")
def buy_ton(p: dict):
    bx = p["ton"] * BX_RATE_TON
    q("UPDATE users SET bx=bx+%s WHERE id=%s", (bx, p["user"]))
    q(
        "UPDATE proof_cache SET total_ton=total_ton+%s,total_bx=total_bx+%s WHERE id=1",
        (p["ton"], bx),
    )
    return {"ok": True, "bx": bx}

# =========================
# WITHDRAW TON
# =========================
@app.post("/withdraw/ton")
def withdraw_ton(p: dict):
    uid = p["user"]
    ton = float(p["ton"])
    addr = p["address"]

    if ton < MIN_WITHDRAW_TON or ton > MAX_WITHDRAW_TON:
        return {"ok": False, "msg": "limits"}

    used = q(
        """
        SELECT COALESCE(SUM(ton),0)
        FROM ton_withdrawals
        WHERE user_id=%s AND created_at > now()-interval '24 hours'
        """,
        (uid,),
        one=True,
    )[0]

    if used + ton > DAILY_WITHDRAW_LIMIT:
        return {"ok": False, "msg": "daily limit"}

    u = q("SELECT bx FROM users WHERE id=%s", (uid,), one=True)
    need = ton / BX_TO_TON
    if not u or u[0] < need:
        return {"ok": False, "msg": "no bx"}

    q("UPDATE users SET bx=bx-%s WHERE id=%s", (need, uid))
    q(
        "INSERT INTO ton_withdrawals(user_id,ton,bx,address) VALUES(%s,%s,%s,%s)",
        (uid, ton, need, addr),
    )
    return {"ok": True, "status": "pending"}

# =========================
# ADMIN
# =========================
@app.get("/admin/pending")
def admin_pending(admin: int):
    if admin not in ADMIN_IDS:
        raise HTTPException(403)
    return {
        "withdraws": q("SELECT * FROM ton_withdrawals WHERE status='pending'"),
        "usdt": q("SELECT * FROM usdt_orders WHERE status='pending'"),
    }

# =========================
# PROOF
# =========================
@app.get("/proof")
def proof():
    r = q("SELECT * FROM proof_cache WHERE id=1", one=True)
    return dict(r) if r else {}
