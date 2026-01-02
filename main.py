import os, random, asyncio, time
from datetime import datetime
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from aiogram import Bot, Dispatcher, types
import asyncpg, httpx

# ================= CONFIG =================
BOT_TOKEN = os.getenv("BOT_TOKEN")
DATABASE_URL = os.getenv("DATABASE_URL")
APP_URL = os.getenv("APP_URL","")

ADMIN_TON_WALLET = "UQARo43EOAPcJs_839ntozSAv_Nktb-bvWJADqM0z9Gg8xad"
BINANCE_ID = "35885398"
REDOTPAY_ID = "1962397417"
ADMIN_IDS = {123456789}  # ضع Telegram ID الأدمن

BX_RATE_TON = 2.0
BX_RATE_USDT = 1.5

RTP_CRASH = 0.97
RTP_CHICKEN = 0.96
RTP_DICE = 0.95

BNB_MINING_RATE = 0.0003
SOL_MINING_RATE = 0.0030

INVITE_ONLY = False

if not BOT_TOKEN or not DATABASE_URL:
    raise RuntimeError("Missing ENV")

# ================= APP =================
app = FastAPI()
bot = Bot(BOT_TOKEN)
dp = Dispatcher(bot)

# ================= DB =================
pool = None
async def db():
    global pool
    if not pool:
        pool = await asyncpg.create_pool(DATABASE_URL)
    return pool

# ================= UI =================
@app.get("/")
@app.get("/app")
async def ui():
    return HTMLResponse(open("index.html","r",encoding="utf-8").read())

@app.get("/health")
async def health():
    return {"ok": True}

# ================= ANTI ABUSE =================
RATE = {}
@app.middleware("http")
async def rate_limit(req, call_next):
    ip = req.client.host
    RATE[ip] = RATE.get(ip, 0) + 1
    if RATE[ip] > 120:
        return HTMLResponse("Too many requests", status_code=429)
    res = await call_next(req)
    asyncio.get_event_loop().call_later(60, lambda: RATE.update({ip: max(0,RATE[ip]-1)}))
    return res

# ================= CASINO =================
@app.post("/casino/crash/start")
async def crash():
    return {"point": round(1 + random.random()*(1/RTP_CRASH),2)}

@app.post("/casino/dice")
async def dice(p:dict):
    roll = random.randint(1,6)
    win = p["bet"]*2 if roll>=4 else 0
    return {"roll":roll,"win":win}

@app.post("/casino/chicken")
async def chicken(p:dict):
    bet=p["bet"]; steps=0
    while random.random()>0.18 and steps<10: steps+=1
    win = round(bet*(1+steps*0.35),2) if steps else 0
    return {"steps":steps,"win":win}

@app.post("/casino/pvp")
async def pvp(p:dict):
    win = p["bet"]*1.9 if random.random()>0.5 else 0
    return {"win":win}

# ================= MINING =================
@app.post("/mining/claim")
async def mining(p:dict):
    user=p["user"]
    async with (await db()).acquire() as c:
        r=await c.fetchrow("SELECT * FROM cloud_mining WHERE user_id=$1",user)
        if not r:
            await c.execute("INSERT INTO cloud_mining (user_id) VALUES ($1)",user)
            return {"bnb":0,"sol":0}
        hours=(datetime.utcnow()-r["last"]).total_seconds()/3600
        bnb=min(hours*BNB_MINING_RATE,0.003)
        sol=min(hours*SOL_MINING_RATE,0.03)
        await c.execute("UPDATE cloud_mining SET bnb=bnb+$1,sol=sol+$2,last=now() WHERE user_id=$3",
                        bnb,sol,user)
    return {"bnb":round(bnb,6),"sol":round(sol,6)}

# ================= AIRDROP =================
@app.post("/airdrop")
async def airdrop(p:dict):
    async with (await db()).acquire() as c:
        await c.execute("UPDATE users SET bx=bx+$1 WHERE id=$2",p["reward"],p["user"])
    return {"ok":True}

# ================= BUY TON =================
@app.post("/buy/ton")
async def buy_ton(p:dict):
    bx=p["ton"]*BX_RATE_TON
    async with (await db()).acquire() as c:
        await c.execute("UPDATE users SET bx=bx+$1 WHERE id=$2",bx,p["user"])
    return {"send_to":ADMIN_TON_WALLET,"bx":bx}

# ================= BUY USDT (APPROVE) =================
@app.post("/buy/usdt")
async def buy_usdt(p:dict):
    async with (await db()).acquire() as c:
        await c.execute(
            "INSERT INTO usdt_orders (user_id,provider,amount,proof) VALUES ($1,$2,$3,$4)",
            p["user"],p["provider"],p["amount"],p.get("proof","")
        )
    return {"pending":True}

# ================= PROOF =================
@app.get("/proof")
async def proof():
    async with (await db()).acquire() as c:
        r=await c.fetchrow("SELECT * FROM proof_cache WHERE id=1")
    return dict(r)

# ================= BOT =================
@dp.message_handler(commands=["start"])
async def start(m:types.Message):
    async with (await db()).acquire() as c:
        await c.execute("INSERT INTO users (id) VALUES ($1) ON CONFLICT DO NOTHING",m.from_user.id)
    await m.answer(
        "🎰 Bloxio Casino\nPlay & Earn",
        reply_markup=types.InlineKeyboardMarkup().add(
            types.InlineKeyboardButton("🚀 Open App",
                web_app=types.WebAppInfo(url=APP_URL))
        )
    )

@app.on_event("startup")
async def startup():
    asyncio.create_task(dp.start_polling())
