from fastapi import FastAPI, HTTPException
import sqlite3, time, random

app = FastAPI()

@app.get("/")
def root():
    return {"status":"ok","service":"Bloxio BX Platform","version":"1.0.0","message":"API is running"}

DB = "db.sqlite"
def db():
    return sqlite3.connect(DB, check_same_thread=False)

# ===== CONSTANTS =====
PRICE = {"usdt":0.717872729,"ton":0.955489564}
FEE, BURN = 0.05, 0.10
SELL_LIMIT = 5000

MINING = {
  "silver":{"bx":0.01,"ton":0.0002},
  "gold":{"bx":0.03,"ton":0.0006}
}

CASINO_GAMES = ["dice","chicken","pvp","slots","crash"]
PROVIDERS = ["binance","redotpay","ton"]
TON_WALLET_ADDRESS = "TON_MAIN_WALLET_ADDRESS"

# ===== USER =====
def ensure_user(tg_id: str):
    c = db().cursor()
    r = c.execute("SELECT id FROM users WHERE tg_id=?", (tg_id,)).fetchone()
    if r: return r[0]
    now = int(time.time())
    c.execute("INSERT INTO users VALUES(NULL,?,?)",(tg_id,now))
    uid = c.lastrowid
    c.execute("INSERT INTO wallets VALUES(?,?,?,?)",(uid,0,0,0))
    c.execute("INSERT INTO subscriptions VALUES(?,?,?)",(uid,"silver",now))
    c.execute("INSERT INTO mining_state VALUES(?,?)",(uid,now))
    c.connection.commit()
    return uid

# ===== STATE =====
@app.get("/state")
def state(uid:str):
    c=db().cursor(); u=ensure_user(uid)
    bx,usdt,ton = c.execute("SELECT bx,usdt,ton FROM wallets WHERE user_id=?",(u,)).fetchone()
    tier = c.execute("SELECT tier FROM subscriptions WHERE user_id=?",(u,)).fetchone()[0]
    return {"wallet":{"bx":bx,"usdt":usdt,"ton":ton},"subscription":tier,"mining":MINING[tier]}

# ===== MARKET BUY / SELL =====
@app.post("/market/{side}")
def market(side:str, uid:str, amount:float, currency:str):
    if side not in ("buy","sell") or currency not in PRICE or amount<=0:
        raise HTTPException(400,"INVALID")

    c=db().cursor(); u=ensure_user(uid); price=PRICE[currency]

    if side=="buy":
        bal=c.execute(f"SELECT {currency} FROM wallets WHERE user_id=?",(u,)).fetchone()[0]
        cost=amount*price
        if bal<cost: raise HTTPException(400,"NO_FUNDS")
        c.execute(f"UPDATE wallets SET {currency}={currency}-?, bx=bx+? WHERE user_id=?",(cost,amount,u))
        fee=burn=0

    else:
        bx=c.execute("SELECT bx FROM wallets WHERE user_id=?",(u,)).fetchone()[0]
        sold=c.execute("SELECT COALESCE(SUM(amount_bx),0) FROM trades WHERE user_id=? AND side='sell'",(u,)).fetchone()[0]
        if bx<amount or sold+amount>SELL_LIMIT:
            raise HTTPException(403,"SELL_LIMIT")
        fee, burn = amount*FEE, amount*BURN
        payout=(amount-fee-burn)*price
        c.execute("UPDATE wallets SET bx=bx-?, {}={}+? WHERE user_id=?".format(currency,currency),(amount,payout,u))

    c.execute(
        "INSERT INTO trades VALUES(NULL,?,?,?,?,?,?,?)",
        (u,side,amount,currency,price,fee,burn,int(time.time()))
    )
    c.connection.commit()
    return {"ok":True,"side":side,"amount":amount}

# ===== AIRDROP =====
@app.get("/airdrop/tasks")
def airdrop_tasks():
    c=db().cursor()
    rows=c.execute("SELECT id,platform,reward_bx FROM airdrop_tasks").fetchall()
    return [{"id":r[0],"platform":r[1],"reward":r[2]} for r in rows]

@app.post("/airdrop/claim")
def airdrop_claim(uid:str, task_id:int):
    c=db().cursor(); u=ensure_user(uid)
    if c.execute("SELECT 1 FROM airdrop_claims WHERE user_id=? AND task_id=?",(u,task_id)).fetchone():
        raise HTTPException(400,"ALREADY")
    r=c.execute("SELECT reward_bx FROM airdrop_tasks WHERE id=?",(task_id,)).fetchone()
    if not r: raise HTTPException(404,"TASK")
    c.execute("INSERT INTO airdrop_claims VALUES(?,?,?)",(u,task_id,int(time.time())))
    c.execute("UPDATE wallets SET bx=bx+? WHERE user_id=?",(r[0],u))
    c.connection.commit()
    return {"ok":True,"reward":r[0]}
