import os
import time
import random
import sqlite3
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# ======================================================
# CONFIG
# ======================================================
DB_PATH = "db.sqlite"
BX_PRICE = 0.955489564

MINING_RATE = {
    "bx": 0.001,      # per second
    "ton": 0.00002
}

# ======================================================
# APP
# ======================================================
app = FastAPI(title="Bloxio MiniApp API", version="1.0.0")

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
    return sqlite3.connect(DB_PATH, check_same_thread=False)

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
        c.execute("INSERT INTO wallets VALUES(?,?,?,?)", (uid, 0, 0, 0))
        c.execute("INSERT INTO mining VALUES(?,?)", (uid, now))
        c.connection.commit()

def get_wallet(uid: int):
    ensure_user(uid)
    c = db().cursor()
    bx, ton, usdt = c.execute(
        "SELECT bx,ton,usdt FROM wallets WHERE uid=?", (uid,)
    ).fetchone()
    return {"bx": bx, "ton": ton, "usdt": usdt}

init_db()

# ======================================================
# MINING
# ======================================================
def apply_mining(uid: int):
    c = db().cursor()
    now = int(time.time())

    last = c.execute(
        "SELECT last_claim FROM mining WHERE uid=?", (uid,)
    ).fetchone()[0]

    elapsed = max(0, now - last)
    if elapsed == 0:
        return

    gain_bx = elapsed * MINING_RATE["bx"]
    gain_ton = elapsed * MINING_RATE["ton"]

    c.execute("""
        UPDATE wallets
        SET bx=bx+?, ton=ton+?
        WHERE uid=?
    """, (gain_bx, gain_ton, uid))

    c.execute(
        "UPDATE mining SET last_claim=? WHERE uid=?",
        (now, uid)
    )
    c.connection.commit()

# ======================================================
# MODELS (MATCH Deposit.html 100%)
# ======================================================
class MarketOrder(BaseModel):
    uid: int
    amount: float = Field(gt=0)

class DepositReq(BaseModel):
    uid: int
    provider: str
    amount: float = Field(gt=0)

class WithdrawReq(BaseModel):
    uid: int
    asset: str
    amount: float = Field(gt=0)
    address: str

class CasinoReq(BaseModel):
    uid: int

class MiningReq(BaseModel):
    uid: int

# ======================================================
# STATE (Wallet Refresh)
# ======================================================
@app.get("/state")
def state(uid: int):
    apply_mining(uid)
    return get_wallet(uid)

# ======================================================
# MARKET
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
        SET usdt=usdt-?, bx=bx+?
        WHERE uid=?
    """, (cost, order.amount, order.uid))
    c.connection.commit()

    return {"ok": True}

@app.post("/market/sell")
def market_sell(order: MarketOrder):
    apply_mining(order.uid)
    w = get_wallet(order.uid)

    if w["bx"] < order.amount:
        raise HTTPException(400, "INSUFFICIENT_BX")

    gain = order.amount * BX_PRICE

    c = db().cursor()
    c.execute("""
        UPDATE wallets
        SET bx=bx-?, usdt=usdt+?
        WHERE uid=?
    """, (order.amount, gain, order.uid))
    c.connection.commit()

    return {"ok": True}

# ======================================================
# WALLET
# ======================================================
@app.post("/wallet/deposit")
def deposit(req: DepositReq):
    ensure_user(req.uid)

    if req.provider in ("binance", "redotpay"):
        asset = "usdt"
    elif req.provider == "ton":
        asset = "ton"
    else:
        raise HTTPException(400, "INVALID_PROVIDER")

    c = db().cursor()
    c.execute(
        f"UPDATE wallets SET {asset}={asset}+? WHERE uid=?",
        (req.amount, req.uid)
    )
    c.connection.commit()

    return {"ok": True}

@app.post("/wallet/withdraw")
def withdraw(req: WithdrawReq):
    apply_mining(req.uid)
    w = get_wallet(req.uid)

    if req.asset not in ("ton", "usdt"):
        raise HTTPException(400, "INVALID_ASSET")

    if w[req.asset] < req.amount:
        raise HTTPException(400, "INSUFFICIENT_BALANCE")

    c = db().cursor()
    c.execute(
        f"UPDATE wallets SET {req.asset}={req.asset}-? WHERE uid=?",
        (req.amount, req.uid)
    )
    c.connection.commit()

    return {"ok": True}

# ======================================================
# CASINO
# ======================================================
@app.post("/casino/play")
def casino_play(req: CasinoReq):
    apply_mining(req.uid)

    reward = random.choice([0, 0, 1, 2])

    c = db().cursor()
    c.execute(
        "UPDATE wallets SET bx=bx+? WHERE uid=?",
        (reward, req.uid)
    )
    c.connection.commit()

    return {"reward": reward}

# ======================================================
# AIRDROP
# ======================================================
@app.post("/airdrop/claim")
def airdrop(uid: int):
    c = db().cursor()
    c.execute(
        "UPDATE wallets SET bx=bx+5 WHERE uid=?",
        (uid,)
    )
    c.connection.commit()
    return {"ok": True, "reward": 5}

# ======================================================
# HEALTH (Render)
# ======================================================
@app.get("/")
def root():
    return {"status": "running"}

# ======================================================
# RUN (Render Safe)
# ======================================================
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 10000)),
    )
