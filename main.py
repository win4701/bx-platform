import sqlite3, time, random
from fastapi import FastAPI, HTTPException

DB_PATH = "db.sqlite"
app = FastAPI()

# =====================
# DB
# =====================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

@app.on_event("startup")
def init():
    with open("schema.sql") as f:
        db().executescript(f.read())

# =====================
# CONFIG
# =====================
BX_PRICE_USDT = 0.02
CASINO_RTP = 0.96
REF_REWARD_BX = 5

# =====================
# CORE HELPERS
# =====================
def ensure(uid:int):
    c = db().cursor()
    c.execute(
        "INSERT OR IGNORE INTO users(uid,last_tick) VALUES(?,?)",
        (uid, time.time())
    )
    db().commit()

def mine_tick(uid:int):
    c = db().cursor()
    bx, rate, last = c.execute(
        "SELECT bx,mine_rate,last_tick FROM users WHERE uid=?",(uid,)
    ).fetchone()
    now = time.time()
    earned = (now - last) * rate
    c.execute(
        "UPDATE users SET bx=bx+?, last_tick=? WHERE uid=?",
        (earned, now, uid)
    )
    db().commit()

# =====================
# LEADERBOARD
# =====================
def get_leaderboard(limit=10):
    c=db().cursor()
    rows = c.execute(
        "SELECT uid,bx FROM users ORDER BY bx DESC LIMIT ?",
        (limit,)
    ).fetchall()
    return [
        {"rank": i+1, "uid": u, "bx": round(bx,2)}
        for i,(u,bx) in enumerate(rows)
    ]

# =====================
# STATE (BRAIN)
# =====================
@app.get("/state")
def state(uid:int):
    ensure(uid)
    mine_tick(uid)

    c=db().cursor()
    bx, usdt, ton, rate = c.execute(
        "SELECT bx,usdt,ton,mine_rate FROM users WHERE uid=?",
        (uid,)
    ).fetchone()

    wd_pending = c.execute(
        "SELECT 1 FROM withdrawals WHERE uid=? AND status='pending'",
        (uid,)
    ).fetchone()

    ref_count = c.execute(
        "SELECT COUNT(*) FROM referrals WHERE referrer=?",(uid,)
    ).fetchone()[0]

    return {
        "user": {
            "uid": uid,
            "level": int(bx // 1000) + 1,
            "title": "Miner" if bx < 5000 else "Pro Miner",
            "mining_active": True
        },
        "wallet": {
            "bx": round(bx,4),
            "usdt": round(usdt,2),
            "ton": round(ton,4)
        },
        "mining": {
            "rate": rate,
            "earned_today": round(rate * 86400, 2)
        },
        "leaderboard": get_leaderboard(),
        "airdrop": {
            "enabled": True,
            "progress_pct": min(round((bx/10000)*100,1),100),
            "message": "Early miners will be rewarded"
        },
        "casino": {
            "enabled": True,
            "rtp": CASINO_RTP,
            "fair": True
        },
        "referral": {
            "count": ref_count,
            "reward_bx": REF_REWARD_BX,
            "link": f"https://t.me/YOUR_BOT?start=ref_{uid}"
        },
        "status": {
            "withdraw_pending": bool(wd_pending)
        }
    }

# =====================
# BUY / SELL
# =====================
@app.post("/buy/bx")
def buy_bx(uid:int, usdt:float):
    ensure(uid); mine_tick(uid)
    bx = usdt / BX_PRICE_USDT

    c=db().cursor()
    c.execute(
        "UPDATE users SET usdt=usdt-?, bx=bx+? WHERE uid=?",
        (usdt, bx, uid)
    )
    c.execute(
        "INSERT INTO buys(uid,usdt,bx,price,ts) VALUES(?,?,?,?,?)",
        (uid, usdt, bx, BX_PRICE_USDT, time.time())
    )
    db().commit()
    return {"ok":True,"bx":round(bx,4)}

@app.post("/sell/bx")
def sell_bx(uid:int, bx:float):
    ensure(uid); mine_tick(uid)
    usdt = bx * BX_PRICE_USDT * CASINO_RTP

    c=db().cursor()
    bal = c.execute(
        "SELECT bx FROM users WHERE uid=?",(uid,)
    ).fetchone()[0]
    if bal < bx:
        raise HTTPException(400,"not enough bx")

    c.execute(
        "UPDATE users SET bx=bx-?, usdt=usdt+? WHERE uid=?",
        (bx, usdt, uid)
    )
    c.execute(
        "INSERT INTO sells(uid,bx,usdt,price,fee,method,ts)"
        "VALUES(?,?,?,?,?,?,?)",
        (uid, bx, usdt, BX_PRICE_USDT, 0, "market", time.time())
    )
    db().commit()
    return {"ok":True,"usdt":round(usdt,2)}

# =====================
# WITHDRAW
# =====================
@app.post("/withdraw/usdt")
def withdraw(uid:int, amount:float, method:str, target:str):
    ensure(uid)
    c=db().cursor()

    bal = c.execute(
        "SELECT usdt FROM users WHERE uid=?",(uid,)
    ).fetchone()[0]
    if bal < amount:
        raise HTTPException(400,"not enough usdt")

    c.execute(
        "UPDATE users SET usdt=usdt-? WHERE uid=?",
        (amount, uid)
    )
    c.execute(
        "INSERT INTO withdrawals(uid,amount,method,target,status,ts)"
        "VALUES(?,?,?,?,?,?)",
        (uid, amount, method, target, "pending", time.time())
    )
    db().commit()
    return {"ok":True,"status":"pending"}
