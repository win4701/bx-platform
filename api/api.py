from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sqlite3, time, random

app = FastAPI()

DB = "db.sqlite"

def db():
    return sqlite3.connect(DB, check_same_thread=False)

def ensure_user(uid: str):
    c = db().cursor()
    c.execute("INSERT OR IGNORE INTO users(uid) VALUES(?)", (uid,))
    c.execute("INSERT OR IGNORE INTO wallets(uid) VALUES(?)", (uid,))
    c.connection.commit()

# ================== CONSTANTS ==================

BX_TON = 0.955489564
BX_USDT = 0.717872729

HOUSE_EDGE = {
    "dice": 0.03,
    "crash": 0.04,
    "slots": 0.06,
    "pvp": 0.02,
    "chicken": 0.05
}

# ================== MODELS ==================

class BaseReq(BaseModel):
    uid: str

class MarketReq(BaseReq):
    amount: float
    against: str   # ton | usdt

class DepositReq(BaseReq):
    provider: str  # binance | redotpay | ton
    amount: float

class WithdrawReq(BaseReq):
    provider: str
    amount: float
    address: str

class CasinoReq(BaseReq):
    game: str
    bet: float
    cashout: float | None = None

class MiningReq(BaseReq):
    bx: float | None = None
    ton: float | None = None

class AirdropTaskReq(BaseReq):
    task_id: int

# ================== STATE ==================

@app.get("/state")
def get_state(uid: str):
    ensure_user(uid)
    c = db().cursor()
    c.execute("SELECT bx, ton, usdt FROM wallets WHERE uid=?", (uid,))
    bx, ton, usdt = c.fetchone()
    return {"bx": bx, "ton": ton, "usdt": usdt}

# ================== WALLET ==================

@app.post("/wallet/deposit")
def deposit(req: DepositReq):
    ensure_user(req.uid)
    asset = "usdt" if req.provider in ("binance", "redotpay") else "ton"
    c = db().cursor()
    c.execute(f"UPDATE wallets SET {asset}={asset}+? WHERE uid=?",
              (req.amount, req.uid))
    c.connection.commit()
    return {"ok": True}

@app.post("/wallet/withdraw")
def withdraw(req: WithdrawReq):
    ensure_user(req.uid)
    asset = "usdt" if req.provider in ("binance", "redotpay") else "ton"
    c = db().cursor()
    c.execute(f"SELECT {asset} FROM wallets WHERE uid=?", (req.uid,))
    bal = c.fetchone()[0]
    if bal < req.amount:
        raise HTTPException(400, "INSUFFICIENT_FUNDS")
    c.execute(f"UPDATE wallets SET {asset}={asset}-? WHERE uid=?",
              (req.amount, req.uid))
    c.connection.commit()
    return {"ok": True}

# ================== MARKET ==================

@app.post("/market/buy")
def market_buy(req: MarketReq):
    ensure_user(req.uid)
    price = BX_TON if req.against == "ton" else BX_USDT
    c = db().cursor()
    c.execute(f"SELECT {req.against} FROM wallets WHERE uid=?", (req.uid,))
    bal = c.fetchone()[0]
    cost = req.amount * price
    if bal < cost:
        raise HTTPException(400, "NO_FUNDS")
    c.execute(f"""
        UPDATE wallets
        SET {req.against}={req.against}-?, bx=bx+?
        WHERE uid=?
    """, (cost, req.amount, req.uid))
    c.connection.commit()
    return {"ok": True}

@app.post("/market/sell")
def market_sell(req: MarketReq):
    ensure_user(req.uid)
    c = db().cursor()
    c.execute("SELECT bx FROM wallets WHERE uid=?", (req.uid,))
    bx = c.fetchone()[0]
    if req.amount > bx * 0.2:
        raise HTTPException(400, "SELL_LIMIT")
    gain = req.amount * (BX_TON if req.against == "ton" else BX_USDT)
    c.execute(f"""
        UPDATE wallets
        SET bx=bx-?, {req.against}={req.against}+?
        WHERE uid=?
    """, (req.amount, gain, req.uid))
    c.connection.commit()
    return {"ok": True}

# ================== CASINO ==================

_last_play = {}

def casino_cooldown(uid: str, sec=1.5):
    now = time.time()
    last = _last_play.get(uid, 0)
    if now - last < sec:
        return False
    _last_play[uid] = now
    return True

@app.post("/casino/play")
def casino_play(req: CasinoReq):
    ensure_user(req.uid)
    if not casino_cooldown(req.uid):
        raise HTTPException(429, "COOLDOWN")
    if req.game not in HOUSE_EDGE:
        raise HTTPException(400, "INVALID_GAME")
    if req.bet <= 0:
        raise HTTPException(400, "INVALID_BET")

    c = db().cursor()
    c.execute("SELECT bx FROM wallets WHERE uid=?", (req.uid,))
    bx = c.fetchone()[0]
    if bx < req.bet:
        raise HTTPException(400, "INSUFFICIENT_BX")

    c.execute("UPDATE wallets SET bx=bx-? WHERE uid=?", (req.bet, req.uid))

    edge = HOUSE_EDGE[req.game]
    win, payout = False, 0.0

    if req.game == "dice":
        win = random.random() > (0.5 + edge)
        payout = req.bet * 2 if win else 0

    elif req.game == "slots":
        win = random.random() > (0.85 + edge)
        payout = req.bet * random.choice([3,5,10]) if win else 0

    elif req.game == "pvp":
        win = random.random() > (0.5 + edge)
        payout = req.bet * 2 if win else 0

    elif req.game == "chicken":
        win = random.random() > (0.7 + edge)
        payout = req.bet * 1.5 if win else 0

    elif req.game == "crash":
        if not req.cashout or req.cashout < 1.1:
            raise HTTPException(400, "INVALID_CASHOUT")
        crash_point = random.uniform(1.0, 5.0)
        win = crash_point >= req.cashout
        payout = req.bet * req.cashout if win else 0

    if win:
        c.execute("UPDATE wallets SET bx=bx+? WHERE uid=?",
                  (payout, req.uid))

    c.execute("""
        INSERT INTO casino_rounds(uid,game,bet,win,ts)
        VALUES(?,?,?,?,?)
    """, (req.uid, req.game, req.bet, int(win), int(time.time())))
    c.connection.commit()

    return {"ok": True, "win": win, "payout": round(payout, 6)}

# ================== MINING ==================

_last_mining = {}

@app.post("/mining/claim")
def mining_claim(req: MiningReq):
    ensure_user(req.uid)
    now = time.time()
    if now - _last_mining.get(req.uid, 0) < 60:
        raise HTTPException(429, "MINING_COOLDOWN")
    _last_mining[req.uid] = now

    c = db().cursor()
    if req.bx:
        c.execute("UPDATE wallets SET bx=bx+? WHERE uid=?",
                  (req.bx, req.uid))
    if req.ton:
        c.execute("UPDATE wallets SET ton=ton+? WHERE uid=?",
                  (req.ton, req.uid))
    c.connection.commit()
    return {"ok": True}

# ================== AIRDROP ==================

@app.get("/airdrop/state")
def airdrop_state(uid: str):
    ensure_user(uid)
    c = db().cursor()
    c.execute("SELECT COUNT(*) FROM airdrop_tasks WHERE uid=?", (uid,))
    completed = c.fetchone()[0]
    return {
        "completed": completed,
        "total": 5,
        "claimable": completed >= 5
    }

@app.post("/airdrop/complete")
def airdrop_complete(req: AirdropTaskReq):
    ensure_user(req.uid)
    c = db().cursor()
    c.execute("""
        INSERT OR IGNORE INTO airdrop_tasks(uid,task)
        VALUES(?,?)
    """, (req.uid, req.task_id))
    c.connection.commit()
    return {"ok": True}

@app.post("/airdrop/claim")
def airdrop_claim(req: BaseReq):
    ensure_user(req.uid)
    c = db().cursor()
    c.execute("SELECT COUNT(*) FROM airdrop_tasks WHERE uid=?", (req.uid,))
    if c.fetchone()[0] < 5:
        raise HTTPException(400, "NOT_READY")
    c.execute("UPDATE wallets SET bx=bx+50 WHERE uid=?", (req.uid,))
    c.connection.commit()
    return {"ok": True}
