import sqlite3, time, hashlib, secrets, logging
from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

DB_PATH = "db.sqlite"
BX_PRICE_USDT = 0.02
CASINO_RTP = 0.96
REF_REWARD_BX = 5

app = FastAPI()

# ------------------ CORS ------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ Security Headers ------------------
@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

# ------------------ Static / UI ------------------
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

@app.get("/", response_class=HTMLResponse)
def home():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()

# ------------------ DB ------------------
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

@app.on_event("startup")
def init():
    with open("schema.sql") as f:
        db().executescript(f.read())

# ------------------ Logging ------------------
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("bx")

# ------------------ Helpers ------------------
_last_call = {}

def rate_limit(uid, limit=0.5):
    now = time.time()
    last = _last_call.get(uid, 0)
    if now - last < limit:
        raise HTTPException(429, "Too many requests")
    _last_call[uid] = now

def ensure(uid:int):
    c=db().cursor()
    c.execute(
        "INSERT OR IGNORE INTO users(uid,last_tick) VALUES(?,?)",
        (uid, time.time())
    )
    db().commit()

def mine_tick(uid:int):
    c=db().cursor()
    bx, rate, last = c.execute(
        "SELECT bx,mine_rate,last_tick FROM users WHERE uid=?",(uid,)
    ).fetchone()
    now = time.time()
    earned = min((now-last)*rate, rate*86400*1.2)
    c.execute(
        "UPDATE users SET bx=bx+?, last_tick=? WHERE uid=?",
        (earned, now, uid)
    )
    db().commit()

def leaderboard(limit=10):
    c=db().cursor()
    rows=c.execute(
        "SELECT uid,bx FROM users ORDER BY bx DESC LIMIT ?",
        (limit,)
    ).fetchall()
    return [{"rank":i+1,"uid":u,"bx":round(bx,2)} for i,(u,bx) in enumerate(rows)]

# ------------------ STATE ------------------
@app.get("/state")
def state(uid:int):
    rate_limit(uid)
    ensure(uid)
    mine_tick(uid)

    c=db().cursor()
    bx, usdt, ton, rate = c.execute(
        "SELECT bx,usdt,ton,mine_rate FROM users WHERE uid=?",(uid,)
    ).fetchone()

    pending = c.execute(
        "SELECT 1 FROM withdrawals WHERE uid=? AND status='pending'",(uid,)
    ).fetchone()

    refs = c.execute(
        "SELECT COUNT(*) FROM referrals WHERE referrer=?",(uid,)
    ).fetchone()[0]

    return {
        "user":{
            "uid":uid,
            "level":int(bx//1000)+1,
            "title":"Miner" if bx<5000 else "Pro Miner",
            "mining_active":True
        },
        "wallet":{
            "bx":round(bx,4),
            "usdt":round(usdt,2),
            "ton":round(ton,4)
        },
        "mining":{
            "rate":rate,
            "earned_today":round(rate*86400,2)
        },
        "leaderboard":leaderboard(),
        "airdrop":{
            "enabled":True,
            "progress_pct":min(round((bx/10000)*100,1),100),
            "message":"Early miners will be rewarded"
        },
        "casino":{
            "enabled":True,
            "rtp":CASINO_RTP,
            "fair":True
        },
        "referral":{
            "count":refs,
            "reward_bx":REF_REWARD_BX,
            "link":f"https://t.me/YOUR_BOT?start=ref_{uid}"
        },
        "status":{
            "withdraw_pending":bool(pending)
        }
    }

# ------------------ BUY / SELL ------------------
@app.post("/buy/bx")
def buy(uid:int, usdt:float):
    ensure(uid); mine_tick(uid)
    bx = usdt / BX_PRICE_USDT
    c=db().cursor()
    c.execute("UPDATE users SET usdt=usdt-?, bx=bx+? WHERE uid=?",(usdt,bx,uid))
    c.execute(
        "INSERT INTO buys(uid,usdt,bx,price,ts) VALUES(?,?,?,?,?)",
        (uid,usdt,bx,BX_PRICE_USDT,time.time())
    )
    db().commit()
    return {"ok":True,"bx":round(bx,4)}

@app.post("/sell/bx")
def sell(uid:int, bx:float):
    ensure(uid); mine_tick(uid)
    usdt = bx * BX_PRICE_USDT * CASINO_RTP
    c=db().cursor()
    bal=c.execute("SELECT bx FROM users WHERE uid=?",(uid,)).fetchone()[0]
    if bal<bx: raise HTTPException(400,"not enough bx")
    c.execute("UPDATE users SET bx=bx-?, usdt=usdt+? WHERE uid=?",(bx,usdt,uid))
    c.execute(
        "INSERT INTO sells(uid,bx,usdt,price,fee,method,ts) VALUES(?,?,?,?,?,?,?)",
        (uid,bx,usdt,BX_PRICE_USDT,0,"market",time.time())
    )
    db().commit()
    return {"ok":True,"usdt":round(usdt,2)}

# ------------------ WITHDRAW ------------------
@app.post("/withdraw/usdt")
def withdraw(uid:int, amount:float, method:str, target:str):
    ensure(uid)
    c=db().cursor()
    bal=c.execute("SELECT usdt FROM users WHERE uid=?",(uid,)).fetchone()[0]
    if bal<amount: raise HTTPException(400,"not enough usdt")
    c.execute("UPDATE users SET usdt=usdt-? WHERE uid=?",(amount,uid))
    c.execute(
        "INSERT INTO withdrawals(uid,amount,method,target,status,ts) VALUES(?,?,?,?,?,?)",
        (uid,amount,method,target,"pending",time.time())
    )
    db().commit()
    return {"ok":True,"status":"pending"}

# ------------------ HEALTH ------------------
@app.get("/health")
def health():
    try:
        db().cursor().execute("SELECT 1")
        return {"status":"ok"}
    except:
        return {"status":"db_error"}
