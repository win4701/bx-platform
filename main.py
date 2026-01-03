# ======================= Bloxio Production =======================
# FastAPI single-file | SQLite | Render-safe
# Wallet | Casino | Mining | USDT Approvals | Webhook | Proof
# ================================================================

import os, time, random, threading, sqlite3, hmac, hashlib
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel

app = FastAPI(title="Bloxio")

# ---------------- ENV ----------------
PORT = int(os.getenv("PORT", "8000"))
DB_PATH = os.getenv("DB_PATH", "bloxio.db")

ADMIN_IDS = set(int(x) for x in os.getenv("ADMIN_IDS","").split(",") if x)

BX_PRICE_TON = float(os.getenv("BX_PRICE_TON", "0.2"))
BX_PER_USDT = float(os.getenv("BX_PER_USDT", "1.6"))

WITHDRAW_MIN_BX = float(os.getenv("WITHDRAW_MIN_BX", "10"))
WITHDRAW_FEE_BX = float(os.getenv("WITHDRAW_FEE_BX", "0.5"))
WITHDRAW_MAX_DAILY_BX = float(os.getenv("WITHDRAW_MAX_DAILY_BX", "2000"))

CIRCUIT_MAX_DAILY_TON = float(os.getenv("CIRCUIT_MAX_DAILY_TON","5000"))
WEBHOOK_SECRET = os.getenv("WEBHOOK_SECRET","")

# ---------------- DB ----------------
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

con = db()
cur = con.cursor()
cur.executescript("""
CREATE TABLE IF NOT EXISTS users(
  uid INTEGER PRIMARY KEY,
  bx REAL DEFAULT 5,
  ton REAL DEFAULT 0,
  usdt REAL DEFAULT 0,
  mine_rate REAL DEFAULT 0.06,
  last_mine REAL DEFAULT 0,
  wd_today REAL DEFAULT 0,
  wd_day INTEGER DEFAULT 0,
  bnb REAL DEFAULT 0,
  sol REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS casino_logs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER, game TEXT, bet REAL, result TEXT, ts REAL
);

CREATE TABLE IF NOT EXISTS usdt_orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  provider TEXT,
  amount REAL,
  proof TEXT,
  status TEXT DEFAULT 'pending',
  ts REAL
);

CREATE TABLE IF NOT EXISTS analytics(
  k TEXT PRIMARY KEY,
  v REAL
);
""")
con.commit()

def ensure(uid:int):
    c=db().cursor()
    c.execute(
        "INSERT OR IGNORE INTO users(uid,last_mine,wd_day) VALUES(?,?,?)",
        (uid, time.time(), int(time.time()//86400))
    )
    db().commit()

# ---------------- AUTO MINING ----------------
def mining_loop():
    while True:
        now=time.time()
        c=db().cursor()
        for uid,rate,lm in c.execute("SELECT uid,mine_rate,last_mine FROM users"):
            if now-lm>=10:
                ticks=int((now-lm)//10)
                c.execute(
                    "UPDATE users SET bx=bx+?, bnb=bnb+?, sol=sol+?, last_mine=? WHERE uid=?",
                    (ticks*rate, ticks*0.00003, ticks*0.00018, now, uid)
                )
        db().commit()
        time.sleep(2)

threading.Thread(target=mining_loop,daemon=True).start()

# ---------------- MODELS ----------------
class UID(BaseModel): uid:int
class Buy(BaseModel): uid:int; ton:float
class Withdraw(BaseModel): uid:int; bx:float
class Crash(BaseModel): uid:int; bet:float; cashout:float
class Dice(BaseModel): uid:int; bet:float; under:int
class Chicken(BaseModel): uid:int; bet:float; step:int
class USDTOrder(BaseModel):
    uid:int
    provider:str
    amount:float
    proof:str=""

class AdminAction(BaseModel):
    admin:int
    order_id:int

# ---------------- UI ----------------
def load_html():
    with open("index.html","r",encoding="utf-8") as f:
        return f.read()

@app.get("/", response_class=HTMLResponse)
@app.get("/app", response_class=HTMLResponse)
def root():
    return load_html()

@app.get("/health")
def health():
    return {"ok":True}

# ---------------- WALLET ----------------
@app.post("/user")
def user(q:UID):
    ensure(q.uid)
    c=db().cursor()
    bx,ton,usdt,bnb,sol = c.execute(
        "SELECT bx,ton,usdt,bnb,sol FROM users WHERE uid=?",(q.uid,)
    ).fetchone()
    return {"bx":bx,"ton":ton,"usdt":usdt,"bnb":bnb,"sol":sol}

@app.post("/buy")
def buy(q:Buy):
    if q.ton<=0: raise HTTPException(400,"bad amount")
    ensure(q.uid)
    bx=q.ton/BX_PRICE_TON
    c=db().cursor()
    c.execute("UPDATE users SET bx=bx+?, ton=ton+? WHERE uid=?",(bx,q.ton,q.uid))
    db().commit()
    return {"bx":round(bx,6)}

@app.post("/withdraw")
def withdraw(q:Withdraw):
    ensure(q.uid)
    c=db().cursor()
    day=int(time.time()//86400)
    bx,wd,wd_day = c.execute(
        "SELECT bx,wd_today,wd_day FROM users WHERE uid=?",(q.uid,)
    ).fetchone()

    if q.bx<WITHDRAW_MIN_BX: raise HTTPException(400,"min")
    if bx<q.bx+WITHDRAW_FEE_BX: raise HTTPException(400,"no bx")
    if wd_day!=day: wd=0
    if wd+q.bx>WITHDRAW_MAX_DAILY_BX: raise HTTPException(400,"daily limit")

    ton=q.bx*BX_PRICE_TON
    a=db().cursor()
    a.execute("INSERT OR IGNORE INTO analytics(k,v) VALUES('ton_out',0)")
    ton_out=a.execute("SELECT v FROM analytics WHERE k='ton_out'").fetchone()[0]
    if ton_out+ton>CIRCUIT_MAX_DAILY_TON:
        raise HTTPException(503,"circuit breaker")

    a.execute("UPDATE analytics SET v=v+? WHERE k='ton_out'",(ton,))
    c.execute(
        "UPDATE users SET bx=bx-?, ton=ton-?, wd_today=?, wd_day=? WHERE uid=?",
        (q.bx+WITHDRAW_FEE_BX, ton, wd+q.bx, day, q.uid)
    )
    db().commit()
    return {"ton":round(ton,6)}

# ---------------- USDT ----------------
@app.post("/usdt/create")
def usdt_create(q:USDTOrder):
    ensure(q.uid)
    if q.amount<=0: raise HTTPException(400,"bad amount")
    if q.provider not in ("binance","redotpay"):
        raise HTTPException(400,"bad provider")
    c=db().cursor()
    c.execute(
        "INSERT INTO usdt_orders(uid,provider,amount,proof,ts) VALUES(?,?,?,?,?)",
        (q.uid,q.provider,q.amount,q.proof,time.time())
    )
    db().commit()
    return {"ok":True,"status":"pending"}

@app.post("/webhook/usdt")
async def usdt_webhook(req:Request):
    body=await req.body()
    sig=req.headers.get("x-signature","")
    calc=hmac.new(WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(calc, sig):
        raise HTTPException(401,"bad signature")
    data=await req.json()
    if data.get("status")!="paid": return {"ok":True}
    oid=int(data["order_id"])
    c=db().cursor()
    row=c.execute(
        "SELECT uid,amount FROM usdt_orders WHERE id=? AND status='pending'",(oid,)
    ).fetchone()
    if not row: return {"ok":True}
    uid,amount=row
    bx=amount*BX_PER_USDT
    c.execute("UPDATE users SET bx=bx+?, usdt=usdt+? WHERE uid=?",(bx,amount,uid))
    c.execute("UPDATE usdt_orders SET status='approved' WHERE id=?",(oid,))
    db().commit()
    return {"ok":True}

# ---------------- CASINO ----------------
def log(uid,game,bet,res):
    c=db().cursor()
    c.execute("INSERT INTO casino_logs(uid,game,bet,result,ts) VALUES(?,?,?,?,?)",
              (uid,game,bet,res,time.time()))
    db().commit()

@app.post("/crash")
def crash(q:Crash):
    ensure(q.uid)
    c=db().cursor()
    if c.execute("SELECT bx FROM users WHERE uid=?",(q.uid,)).fetchone()[0]<q.bet:
        raise HTTPException(400,"no bx")
    c.execute("UPDATE users SET bx=bx-? WHERE uid=?",(q.bet,q.uid))
    mult=round(random.expovariate(1.06)+1,2)
    if mult>=q.cashout:
        win=q.bet*q.cashout
        c.execute("UPDATE users SET bx=bx+? WHERE uid=?",(win,q.uid))
        db().commit(); log(q.uid,"crash",q.bet,f"win {win}")
        return {"win":round(win,6),"mult":mult}
    db().commit(); log(q.uid,"crash",q.bet,"lose")
    return {"lose":True,"mult":mult}

@app.post("/dice")
def dice(q:Dice):
    ensure(q.uid)
    c=db().cursor()
    if c.execute("SELECT bx FROM users WHERE uid=?",(q.uid,)).fetchone()[0]<q.bet:
        raise HTTPException(400,"no bx")
    c.execute("UPDATE users SET bx=bx-? WHERE uid=?",(q.bet,q.uid))
    roll=random.randint(1,100)
    if roll<q.under:
        win=q.bet*((100/q.under)*0.98)
        c.execute("UPDATE users SET bx=bx+? WHERE uid=?",(win,q.uid))
        db().commit(); log(q.uid,"dice",q.bet,f"win {win}")
        return {"roll":roll,"win":round(win,6)}
    db().commit(); log(q.uid,"dice",q.bet,"lose")
    return {"roll":roll,"win":0}

@app.post("/chicken")
def chicken(q:Chicken):
    ensure(q.uid)
    c=db().cursor()
    if c.execute("SELECT bx FROM users WHERE uid=?",(q.uid,)).fetchone()[0]<q.bet:
        raise HTTPException(400,"no bx")
    c.execute("UPDATE users SET bx=bx-? WHERE uid=?",(q.bet,q.uid))
    risk=min(0.1+q.step*0.07,0.78)
    if random.random()>risk:
        win=q.bet*(1+q.step*0.6)
        c.execute("UPDATE users SET bx=bx+? WHERE uid=?",(win,q.uid))
        db().commit(); log(q.uid,"chicken",q.bet,f"win {win}")
        return {"win":round(win,6),"step":q.step}
    db().commit(); log(q.uid,"chicken",q.bet,"lose")
    return {"lose":True,"step":q.step}

# ---------------- CHART / PROOF ----------------
@app.get("/chart")
def chart():
    return {"bx_ton":BX_PRICE_TON,"bx_usdt":BX_PER_USDT,"ts":time.time()}

@app.get("/proof")
def proof():
    c=db().cursor()
    row=c.execute("SELECT v FROM analytics WHERE k='ton_out'").fetchone()
    return {"ton_out":row[0] if row else 0,"ts":time.time()}
