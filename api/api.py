import os
import time
import random
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# ======================================================
# CONFIG (FROM ENV)
# ======================================================
DB_PATH = os.getenv("DB_PATH", "db.sqlite")

BX_PRICE = float(os.getenv("BX_PRICE", "0.95"))

MINING_RATE = {
    "bx": float(os.getenv("MINING_RATE_BX", "0.001")),
    "ton": float(os.getenv("MINING_RATE_TON", "0.00002")),
}

HOUSE_EDGE = {
    "dice": float(os.getenv("HOUSE_EDGE_DICE", "0.02")),
    "slots": float(os.getenv("HOUSE_EDGE_SLOTS", "0.05")),
    "pvp": float(os.getenv("HOUSE_EDGE_PVP", "0.03")),
    "chicken": float(os.getenv("HOUSE_EDGE_CHICKEN", "0.04")),
    "crash": float(os.getenv("HOUSE_EDGE_CRASH", "0.02")),
}

# ======================================================
# APP
# ======================================================
app = FastAPI(title="BX Platform API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# DATABASE
# ======================================================
def db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    c = db().cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS wallets(
        uid INTEGER PRIMARY KEY,
        bx REAL DEFAULT 0,
        ton REAL DEFAULT 0,
        usdt REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS mining(
        uid INTEGER PRIMARY KEY,
        last_claim INTEGER
    );
    """)
    c.connection.commit()

def ensure_user(uid: int):
    c = db().cursor()
    if not c.execute("SELECT 1 FROM wallets WHERE uid=?", (uid,)).fetchone():
        now = int(time.time())
        c.execute("INSERT INTO wallets VALUES (?,?,?,?)", (uid, 0, 0, 0))
        c.execute("INSERT INTO mining VALUES (?,?)", (uid, now))
        c.connection.commit()

def get_wallet(uid: int):
    ensure_user(uid)
    c = db().cursor()
    r = c.execute(
        "SELECT bx, ton, usdt FROM wallets WHERE uid=?",
        (uid,)
    ).fetchone()
    return dict(r)

init_db()

# ======================================================
# MINING
# ======================================================
def apply_mining(uid: int):
    c = db().cursor()
    now = int(time.time())
    last = c.execute(
        "SELECT last_claim FROM mining WHERE uid=?",
        (uid,)
    ).fetchone()[0]

    elapsed = max(0, now - last)
    if elapsed == 0:
        return

    c.execute("""
        UPDATE wallets
        SET bx = bx + ?, ton = ton + ?
        WHERE uid = ?
    """, (
        elapsed * MINING_RATE["bx"],
        elapsed * MINING_RATE["ton"],
        uid
    ))

    c.execute(
        "UPDATE mining SET last_claim=? WHERE uid=?",
        (now, uid)
    )
    c.connection.commit()

# ======================================================
# MODELS
# ======================================================
class MarketOrder(BaseModel):
    uid: int
    amount: float = Field(gt=0)

class CasinoReq(BaseModel):
    uid: int
    game: str
    bet: float = Field(gt=0)

# ======================================================
# STATE
# ======================================================
@app.get("/state")
def state(uid: int):
    apply_mining(uid)
    return get_wallet(uid)

# ======================================================
# MARKET (INTERNAL PRICE LAYER)
# ======================================================
@app.post("/market/buy")
def market_buy(order: MarketOrder):
    apply_mining(order.uid)
    w = get_wallet(order.uid)

    cost = order.amount * BX_PRICE
    if w["usdt"] < cost:
        raise HTTPException(400, "INSUFFICIENT_USDT")

    c = db().cursor()
    c.execute("""
        UPDATE wallets
        SET usdt = usdt - ?, bx = bx + ?
        WHERE uid = ?
    """, (cost, order.amount, order.uid))
    c.connection.commit()

    return {"ok": True, "price": BX_PRICE}

@app.post("/market/sell")
def market_sell(order: MarketOrder):
    apply_mining(order.uid)
    w = get_wallet(order.uid)

    if w["bx"] < order.amount:
        raise HTTPException(400, "INSUFFICIENT_BX")

    # safety limit 20%
    if order.amount > w["bx"] * 0.2:
        raise HTTPException(400, "SELL_LIMIT_20_PERCENT")

    gain = order.amount * BX_PRICE

    c = db().cursor()
    c.execute("""
        UPDATE wallets
        SET bx = bx - ?, usdt = usdt + ?
        WHERE uid = ?
    """, (order.amount, gain, order.uid))
    c.connection.commit()

    return {"ok": True, "received": gain}

# ======================================================
# CASINO
# ======================================================
@app.post("/casino/play")
def casino_play(req: CasinoReq):
    apply_mining(req.uid)
    if req.game not in HOUSE_EDGE:
        raise HTTPException(400, "INVALID_GAME")

    c = db().cursor()
    bx = c.execute(
        "SELECT bx FROM wallets WHERE uid=?",
        (req.uid,)
    ).fetchone()[0]

    if bx < req.bet:
        raise HTTPException(400, "INSUFFICIENT_BX")

    c.execute(
        "UPDATE wallets SET bx = bx - ? WHERE uid=?",
        (req.bet, req.uid)
    )

    win = random.random() > (0.5 + HOUSE_EDGE[req.game])
    payout = req.bet * 2 if win else 0

    if win:
        c.execute(
            "UPDATE wallets SET bx = bx + ? WHERE uid=?",
            (payout, req.uid)
        )

    c.connection.commit()
    return {"ok": True, "win": win, "payout": payout}

# ======================================================
# AIRDROP
# ======================================================
@app.post("/airdrop/claim")
def airdrop(uid: int):
    c = db().cursor()
    c.execute(
        "UPDATE wallets SET bx = bx + 5 WHERE uid=?",
        (uid,)
    )
    c.connection.commit()
    return {"ok": True, "reward": 5}

# ======================================================
# HEALTH
# ======================================================
@app.get("/")
def root():
    return {"status": "running"}

# ======================================================
# RUN
# ======================================================
if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000)),
    )
