from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import sqlite3, os, time, random, logging, hmac, hashlib, urllib.parse

# ===============================
# CONFIG
# ===============================
DB_PATH = "db.sqlite"
BOT_TOKEN = os.environ.get("BOT_TOKEN", "DEV_TOKEN")

PRICE = {
    "ton": 0.955489564,
    "usdt": 0.717872729
}

MINING_RATE = {
    "bx": 0.001,        # per second
    "ton": 0.00002
}

RATE_LIMIT = 40  # req / minute

# ===============================
# APP
# ===============================
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

# ===============================
# DATABASE
# ===============================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def init_db():
    c = db().cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tg_id TEXT UNIQUE,
        created INTEGER
    );

    CREATE TABLE IF NOT EXISTS wallets(
        user_id INTEGER,
        bx REAL,
        ton REAL,
        usdt REAL
    );

    CREATE TABLE IF NOT EXISTS mining(
        user_id INTEGER,
        last_claim INTEGER
    );
    """)
    c.connection.commit()

def ensure_user(tg_id: str) -> int:
    c = db().cursor()
    r = c.execute("SELECT id FROM users WHERE tg_id=?", (tg_id,)).fetchone()
    if r:
        return r[0]

    now = int(time.time())
    c.execute("INSERT INTO users VALUES(NULL,?,?)", (tg_id, now))
    uid = c.lastrowid
    c.execute("INSERT INTO wallets VALUES(?,?,?,?)", (uid, 0, 0, 0))
    c.execute("INSERT INTO mining VALUES(?,?)", (uid, now))
    c.connection.commit()
    return uid

init_db()

# ===============================
# SECURITY — TELEGRAM
# ===============================
def verify_telegram(init_data: str) -> bool:
    if not init_data:
        return False
    try:
        data = dict(urllib.parse.parse_qsl(init_data))
        hash_ = data.pop("hash")
        check = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
        secret = hashlib.sha256(BOT_TOKEN.encode()).digest()
        h = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
        return h == hash_
    except Exception:
        return False

# ===============================
# RATE LIMIT
# ===============================
REQUESTS = {}

def rate_limit(key: str):
    now = int(time.time())
    window = REQUESTS.get(key, [])
    window = [t for t in window if now - t < 60]

    if len(window) >= RATE_LIMIT:
        raise HTTPException(429, "RATE_LIMIT")

    window.append(now)
    REQUESTS[key] = window

# ===============================
# MINING
# ===============================
def apply_mining(uid: int):
    now = int(time.time())
    c = db().cursor()
    last = c.execute(
        "SELECT last_claim FROM mining WHERE user_id=?",
        (uid,)
    ).fetchone()[0]

    elapsed = now - last
    if elapsed <= 0:
        return

    gain_bx = elapsed * MINING_RATE["bx"]
    gain_ton = elapsed * MINING_RATE["ton"]

    c.execute(
        "UPDATE wallets SET bx=bx+?, ton=ton+? WHERE user_id=?",
        (gain_bx, gain_ton, uid)
    )
    c.execute(
        "UPDATE mining SET last_claim=? WHERE user_id=?",
        (now, uid)
    )
    c.connection.commit()

# ===============================
# MIDDLEWARE
# ===============================
@app.middleware("http")
async def guard(request: Request, call_next):
    path = request.url.path
    if path.startswith(("/state", "/market", "/casino")):
        init_data = request.headers.get("X-TG-INIT", "")
        if not verify_telegram(init_data):
            return JSONResponse({"error": "TG_AUTH_FAILED"}, status_code=403)

        uid = request.query_params.get("uid") or request.query_params.get("tg_id")
        if uid:
            rate_limit(f"{uid}:{request.client.host}")

    return await call_next(request)

# ===============================
# FRONTEND
# ===============================
@app.get("/")
def index():
    return FileResponse("index.html")

# ===============================
# STATE
# ===============================
@app.get("/state")
def state(tg_id: str):
    uid = ensure_user(tg_id)
    apply_mining(uid)

    c = db().cursor()
    bx, ton, usdt = c.execute(
        "SELECT bx,ton,usdt FROM wallets WHERE user_id=?",
        (uid,)
    ).fetchone()

    return {
        "wallet": {
            "bx": round(bx, 6),
            "ton": round(ton, 6),
            "usdt": round(usdt, 6)
        }
    }

# ===============================
# MARKET BUY
# ===============================
@app.post("/market/buy")
def market_buy(uid: str, amount: float, pay: str):
    if pay not in PRICE or amount <= 0:
        raise HTTPException(400, "INVALID")

    user = ensure_user(uid)
    apply_mining(user)

    price = PRICE[pay]
    cost = amount * price

    c = db().cursor()
    bal = c.execute(
        f"SELECT {pay} FROM wallets WHERE user_id=?",
        (user,)
    ).fetchone()[0]

    if bal < cost:
        raise HTTPException(403, "NO_FUNDS")

    c.execute(
        f"UPDATE wallets SET {pay}={pay}-?, bx=bx+? WHERE user_id=?",
        (cost, amount, user)
    )
    c.connection.commit()

    logging.info(f"BUY uid={uid} bx={amount} via {pay}")
    return {"ok": True}

# ===============================
# MARKET SELL
# ===============================
@app.post("/market/sell")
def market_sell(uid: str, bx: float, to: str):
    if to not in PRICE or bx <= 0:
        raise HTTPException(400, "INVALID")

    user = ensure_user(uid)
    apply_mining(user)

    c = db().cursor()
    bal = c.execute(
        "SELECT bx FROM wallets WHERE user_id=?",
        (user,)
    ).fetchone()[0]

    if bal < bx:
        raise HTTPException(403, "NO_BX")

    payout = bx * PRICE[to]

    c.execute(
        f"UPDATE wallets SET bx=bx-?, {to}={to}+? WHERE user_id=?",
        (bx, payout, user)
    )
    c.connection.commit()

    logging.info(f"SELL uid={uid} bx={bx} to {to}")
    return {"ok": True}

# ===============================
# CASINO
# ===============================
@app.post("/casino/v3/play")
def casino_play(uid: str, game: str, bet: float = 1):
    user = ensure_user(uid)
    apply_mining(user)

    reward = random.choice([0, 1, 2])

    c = db().cursor()
    c.execute(
        "UPDATE wallets SET bx=bx+? WHERE user_id=?",
        (reward, user)
    )
    c.connection.commit()

    logging.info(f"CASINO uid={uid} game={game} reward={reward}")
    return {"game": game, "reward": reward}

# ===============================
# ENTRYPOINT (Render)
# ===============================
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
