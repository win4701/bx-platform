import os
import time
import random
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# ======================================================
# CONFIG (MATCH ALL ATTACHED FILES)
# ======================================================
DB_PATH = os.getenv("DB_PATH", "db.sqlite")

# BX INTERNAL FIXED PRICE (REFERENCE)
BX_PRICE_BUY = {
    "usdt": 0.51,
    "ton":  0.73
}

BX_SPREAD_SELL = {
    "usdt": 0.08,   # 8%
    "ton":  0.10    # 10%
}

def bx_sell_price(asset: str) -> float:
    return round(BX_PRICE_BUY[asset] * (1 - BX_SPREAD_SELL[asset]), 6)

MINING_RATE = {
    "bx": 0.001,
    "ton": 0.00002
}

HOUSE_EDGE = {
    "dice": 0.05,
    "slots": 0.10,
    "pvp": 0.07,
    "chicken": 0.08,
    "crash": 0.06
}

# ======================================================
# APP
# ======================================================
app = FastAPI(title="Bloxio Core API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# DATABASE (SHARED WITH wallet_api & admin)
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

    CREATE TABLE IF NOT EXISTS casino_rounds(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid INTEGER,
        game TEXT,
        bet REAL,
        win INTEGER,
        payout REAL,
        ts INTEGER
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
    return dict(
        c.execute(
            "SELECT bx, ton, usdt FROM wallets WHERE uid=?",
            (uid,)
        ).fetchone()
    )

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
# MODELS (MATCH Deposit.html)
# ======================================================
class MarketBuy(BaseModel):
    uid: int
    asset: str
    amount: float = Field(gt=0)

class MarketSell(BaseModel):
    uid: int
    asset: str
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
# MARKET BUY (INTERNAL PRICE)
# ======================================================
@app.post("/market/buy")
def market_buy(order: MarketBuy):
    apply_mining(order.uid)

    if order.asset not in BX_PRICE_BUY:
        raise HTTPException(400, "INVALID_ASSET")

    w = get_wallet(order.uid)
    price = BX_PRICE_BUY[order.asset]
    cost = order.amount * price

    if w[order.asset] < cost:
        raise HTTPException(400, "INSUFFICIENT_BALANCE")

    c = db().cursor()
    c.execute(f"""
        UPDATE wallets
        SET {order.asset} = {order.asset} - ?,
            bx = bx + ?
        WHERE uid = ?
    """, (cost, order.amount, order.uid))
    c.connection.commit()

    return {
        "ok": True,
        "bx": order.amount,
        "paid": cost,
        "asset": order.asset,
        "price": price
    }

# ======================================================
# MARKET SELL (SPREAD)
# ======================================================
@app.post("/market/sell")
def market_sell(order: MarketSell):
    apply_mining(order.uid)

    if order.asset not in BX_PRICE_BUY:
        raise HTTPException(400, "INVALID_ASSET")

    w = get_wallet(order.uid)
    if w["bx"] < order.amount:
        raise HTTPException(400, "INSUFFICIENT_BX")

    if order.amount > w["bx"] * 0.30:
        raise HTTPException(400, "SELL_LIMIT_30_PERCENT")

    price = bx_sell_price(order.asset)
    gain = order.amount * price

    c = db().cursor()
    c.execute(f"""
        UPDATE wallets
        SET bx = bx - ?,
            {order.asset} = {order.asset} + ?
        WHERE uid = ?
    """, (order.amount, gain, order.uid))
    c.connection.commit()

    return {
        "ok": True,
        "sold": order.amount,
        "received": round(gain, 6),
        "asset": order.asset,
        "price": price,
        "spread": BX_SPREAD_SELL[order.asset]
    }

# ======================================================
# CASINO (FIXED & SAFE)
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

    edge = HOUSE_EDGE[req.game]
    win = random.random() > (0.5 + edge)
    payout = req.bet if win else 0

    if win:
        c.execute(
            "UPDATE wallets SET bx = bx + ? WHERE uid=?",
            (payout, req.uid)
        )

    c.execute("""
        INSERT INTO casino_rounds
        (uid, game, bet, win, payout, ts)
        VALUES (?,?,?,?,?,?)
    """, (req.uid, req.game, req.bet, int(win), payout, int(time.time())))

    c.connection.commit()
    return {
        "ok": True,
        "win": win,
        "payout": round(payout, 6)
    }

# ======================================================
# HEALTH
# ======================================================
@app.get("/")
def root():
    return {"status": "running"}

# ======================================================
# RUN (RENDER SAFE)
# ======================================================
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000)),
    )
