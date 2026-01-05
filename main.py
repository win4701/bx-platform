from fastapi import FastAPI, HTTPException
import sqlite3, time, random

app = FastAPI()
DB = "db.sqlite"

def db():
    return sqlite3.connect(DB, check_same_thread=False)

# ===== CONSTANTS =====
SELL_FEE = 0.05
SELL_BURN = 0.10
DAILY_SELL_LIMIT = 5000

MINING = {
  "silver": {"bx": 0.01, "ton": 0.0002},
  "gold":   {"bx": 0.03, "ton": 0.0006}
}

CASINO_GAMES = ["dice","chicken","pvp","slots","crash"]
PROVIDERS = ["binance","redotpay","ton"]
TON_WALLET_ADDRESS = "TON_MAIN_WALLET_ADDRESS"

# ===== USER =====
def ensure_user(tg_id: str):
    c = db().cursor()
    r = c.execute("SELECT id FROM users WHERE tg_id=?", (tg_id,)).fetchone()
    if r:
        return r[0]
    now = int(time.time())
    c.execute("INSERT INTO users VALUES(NULL,?,?)", (tg_id, now))
    uid = c.lastrowid
    c.execute("INSERT INTO wallets VALUES(?,?,?,?)", (uid,0,0,0))
    c.execute("INSERT INTO subscriptions VALUES(?,?,?)", (uid,"silver", now))
    c.execute("INSERT INTO mining_state VALUES(?,?)", (uid, now))
    c.connection.commit()
    return uid

# ===== STATE =====
@app.get("/state")
def state(uid: str):
    c = db().cursor()
    u = ensure_user(uid)
    w = c.execute("SELECT bx,usdt,ton FROM wallets WHERE user_id=?", (u,)).fetchone()
    tier = c.execute("SELECT tier FROM subscriptions WHERE user_id=?", (u,)).fetchone()[0]
    return {
      "wallet": {"bx": w[0], "usdt": w[1], "ton": w[2]},
      "subscription": tier,
      "mining": MINING[tier]
    }

# ===== MARKET =====
@app.post("/market/sell")
def sell(uid: str, amount: float, against: str):
    if against not in ("usdt","ton"):
        raise HTTPException(400)
    c = db().cursor()
    u = ensure_user(uid)
    sold = c.execute(
      "SELECT COALESCE(SUM(amount_bx),0) FROM trades WHERE user_id=? AND side='sell' AND ts>?",
      (u, int(time.time())-86400)
    ).fetchone()[0]
    if sold + amount > DAILY_SELL_LIMIT:
        raise HTTPException(400, "LIMIT")
    price = 0.72 if against=="usdt" else 0.95
    fee = amount * SELL_FEE
    burn = amount * SELL_BURN
    net = (amount - fee - burn) * price
    c.execute("UPDATE wallets SET bx=bx-? WHERE user_id=?", (amount, u))
    c.execute(f"UPDATE wallets SET {against}={against}+? WHERE user_id=?", (net, u))
    c.execute("INSERT INTO trades VALUES(NULL,?,?,?,?,?,?,?)",
              (u,"sell",amount,against,price,fee,burn,int(time.time())))
    c.connection.commit()
    return {"ok": True}

# ===== CASINO =====
@app.post("/casino/play")
def casino(uid: str, game: str, bet: float):
    if game not in CASINO_GAMES:
        raise HTTPException(400)
    c = db().cursor()
    u = ensure_user(uid)
    win = random.random() < 0.47
    payout = bet * 1.9 if win else 0
    burn = bet * 0.15 if not win else 0
    c.execute("UPDATE wallets SET bx=bx-?+? WHERE user_id=?", (bet, payout, u))
    c.execute("INSERT INTO casino_rounds VALUES(NULL,?,?,?,?,?)",
              (u, game, bet, payout, burn, int(time.time())))
    c.connection.commit()
    return {"win": win, "payout": payout}

# ===== MINING =====
@app.post("/mining/claim")
def claim(uid: str):
    c = db().cursor()
    u = ensure_user(uid)
    tier, last = c.execute(
      "SELECT tier,last_claim FROM subscriptions JOIN mining_state USING(user_id) WHERE user_id=?",
      (u,)
    ).fetchone()
    hours = (time.time() - last) / 3600
    bx = hours * MINING[tier]["bx"]
    ton = hours * MINING[tier]["ton"]
    c.execute("UPDATE wallets SET bx=bx+?, ton=ton+? WHERE user_id=?", (bx, ton, u))
    c.execute("UPDATE mining_state SET last_claim=? WHERE user_id=?", (int(time.time()), u))
    c.connection.commit()
    return {"bx": bx, "ton": ton}

# ===== DEPOSIT ADDRESS =====
@app.get("/deposit/address")
def deposit_address(provider: str, asset: str):
    if provider not in PROVIDERS or asset not in ("usdt","ton"):
        raise HTTPException(400)
    if provider == "ton":
        return {"address": TON_WALLET_ADDRESS}
    return {"address": f"{provider.upper()}_{asset.upper()}_ADDRESS"}

# ===== CONFIRM DEPOSIT (LISTENER) =====
@app.post("/deposit/confirm")
def confirm(uid: str, provider: str, asset: str, amount: float, txid: str):
    c = db().cursor()
    u = ensure_user(uid)
    c.execute("INSERT INTO deposits VALUES(NULL,?,?,?,?,?,?)",
              (u, provider, asset, amount, txid, "confirmed", int(time.time())))
    c.execute(f"UPDATE wallets SET {asset}={asset}+? WHERE user_id=?", (amount, u))
    c.connection.commit()
    return {"ok": True}

# ===== WITHDRAW REQUEST =====
@app.post("/withdraw")
def withdraw(uid: str, provider: str, asset: str, amount: float, address: str):
    if provider not in PROVIDERS or asset not in ("usdt","ton"):
        raise HTTPException(400)
    c = db().cursor()
    u = ensure_user(uid)
    bal = c.execute(f"SELECT {asset} FROM wallets WHERE user_id=?", (u,)).fetchone()[0]
    if bal < amount:
        raise HTTPException(400)
    c.execute(f"UPDATE wallets SET {asset}={asset}-? WHERE user_id=?", (amount, u))
    c.execute("INSERT INTO withdrawals VALUES(NULL,?,?,?,?,?,?)",
              (u, provider, asset, amount, address, "pending", int(time.time())))
    c.connection.commit()
    return {"ok": True}

# ===== AIRDROP =====
@app.get("/airdrop/tasks")
def airdrop_tasks():
    c = db().cursor()
    rows = c.execute("SELECT id,platform,reward_bx FROM airdrop_tasks").fetchall()
    return [{"id":r[0],"platform":r[1],"reward":r[2]} for r in rows]

@app.post("/airdrop/claim")
def airdrop_claim(uid: str, task_id: int):
    c = db().cursor()
    u = ensure_user(uid)
    if c.execute("SELECT 1 FROM airdrop_claims WHERE user_id=? AND task_id=?", (u, task_id)).fetchone():
        raise HTTPException(400)
    r = c.execute("SELECT reward_bx FROM airdrop_tasks WHERE id=?", (task_id,)).fetchone()
    if not r:
        raise HTTPException(404)
    c.execute("INSERT INTO airdrop_claims VALUES(?,?,?)", (u, task_id, int(time.time())))
    c.execute("UPDATE wallets SET bx=bx+? WHERE user_id=?", (r[0], u))
    c.connection.commit()
    return {"ok": True, "reward": r[0]}
