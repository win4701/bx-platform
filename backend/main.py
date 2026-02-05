import os
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ======================================================
# FEATURE FLAGS (GLOBAL SAFETY)
# ======================================================
FEATURES = {
    "walletconnect": False,        # ❌ disabled
    "binancepay_direct": False,    # ❌ disabled
    "stonfi_trade": False,         # ❌ disabled
}

# ======================================================
# Routers
# ======================================================
from finance import router as finance_router, rtp_stats
from market import router as market_router
from exchange import ORDER_BOOKS, TRADES, place_order
from casino import router as casino_router
from pricing import pricing_snapshot
from bxing import router as bxing_router

# kyc (optional)
try:
    from kyc import router as kyc_router
except Exception:
    kyc_router = None

# ======================================================
# APP CONFIG
# ======================================================
app = FastAPI(
    title="Bloxio API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ======================================================
# CORS (FLY SAFE)
# ======================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.bloxio.online",
        "https://bloxio.online"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# ROUTERS (CORE API)
# ======================================================
app.include_router(finance_router, prefix="/finance", tags=["finance"])
app.include_router(market_router, prefix="/market", tags=["market"])
app.include_router(casino_router, prefix="/casino", tags=["casino"])
app.include_router(bxing_router)

if kyc_router:
    app.include_router(kyc_router, prefix="/kyc", tags=["kyc"])

# ======================================================
# HEALTH CHECKS (REQUIRED BY FLY)
# ======================================================
@app.get("/")
def root():
    return {
        "status": "running",
        "service": "bloxio-api",
        "env": os.getenv("ENV", "production")
    }

@app.get("/health")
def health():
    return {"status": "ok"}

# ======================================================
# WALLET (READ-ONLY PLACEHOLDER)
# ======================================================
@app.get("/finance/wallet")
def wallet():
    return {
        "BX": 0, "USDT": 0, "BNB": 0,
        "ETH": 0, "TON": 0, "SOL": 0, "BTC": 0
    }

# ======================================================
# DUMMY DATA (SAFE / DEMO)
# ======================================================
recent_casino_data = [
    {"game": "Roulette", "bet": 50, "reward": 100},
    {"game": "Blackjack", "bet": 30, "reward": 0},
]

recent_market_data = [
    {"pair": "BX/USDT", "side": "buy", "amount": 10, "price": 100},
    {"pair": "BX/USDT", "side": "sell", "amount": 5, "price": 105},
]

# ======================================================
# MARKET / CASINO (READ-ONLY DEMO)
# ======================================================
@app.get("/casino/recent")
def get_recent_casino():
    return {"recent_casino": recent_casino_data}

@app.get("/market/recent")
def get_recent_market():
    return {"recent_market": recent_market_data}

# ======================================================
# BXING (MINING / AIRDROP — DEMO SAFE)
# ======================================================
class MiningOrder(BaseModel):
    asset: str
    plan: str
    investment: float
    user_id: int

@app.get("/bxing/airdrop/status")
def airdrop_status(uid: int):
    return {"claimed": False, "reward": 50}

@app.post("/bxing/airdrop/claim")
def claim_airdrop(uid: int):
    return {"status": "ok", "reward": 50}

@app.get("/bxing/referral/link")
def get_referral_link(uid: int):
    return {"link": f"https://bloxio.online/referral/{uid}"}

@app.get("/bxing/referral/leaderboard")
def get_referral_leaderboard():
    return [
        {"id": 1, "referrals": 50},
        {"id": 2, "referrals": 30},
        {"id": 3, "referrals": 10},
    ]

@app.post("/bxing/mining/start")
def start_mining(order: MiningOrder):
    if order.investment < 10:
        raise HTTPException(400, "Minimum investment is 10.")
    return {"status": "started", "estimated_return": order.investment * 1.2}

@app.get("/bxing/mining/active")
def get_active_mining(uid: int):
    return [
        {"asset": "BX", "plan": "Starter", "roi": 2.5},
        {"asset": "SOL", "plan": "Infinity", "roi": 14}
    ]

# ======================================================
# WALLETCONNECT (DISABLED SAFELY)
# ======================================================
@app.post("/walletconnect/connect")
def connect_wallet(*args, **kwargs):
    if not FEATURES["walletconnect"]:
        raise HTTPException(410, "WalletConnect disabled")

# ======================================================
# BINANCE PAY (DISABLED SAFELY)
# ======================================================
@app.post("/binancepay/pay")
def binance_pay(*args, **kwargs):
    if not FEATURES["binancepay_direct"]:
        raise HTTPException(410, "Direct Binance Pay disabled")

# ======================================================
# EXCHANGE (LIVE WEBSOCKET)
# ======================================================
@app.websocket("/ws/exchange")
async def exchange_ws(ws: WebSocket):
    await ws.accept()

    while True:
        data = await ws.receive_json()

        if data.get("type") == "order":
            place_order(
                uid=data["uid"],
                pair=data["pair"],
                side=data["side"],
                price=data["price"],
                amount=data["amount"]
            )

            await ws.send_json({
                "type": "update",
                "pair": data["pair"],
                "book": ORDER_BOOKS[data["pair"]],
                "trades": TRADES[data["pair"]][-50:]
            })

# ======================================================
# STON.FI (READ ONLY — ADMIN / INTERNAL)
# ======================================================
class BuyBXOrder(BaseModel):
    ton_amount: float

@app.get("/stonfi/bx_price")
def get_bx_price():
    return {"price": 8}

@app.post("/stonfi/buy")
def buy_bx(order: BuyBXOrder):
    if not FEATURES["stonfi_trade"]:
        raise HTTPException(410, "STON.FI trading disabled")

# ======================================================
# PUBLIC (SAFE / READ ONLY)
# ======================================================
@app.get("/public/prices", tags=["public"])
def public_prices():
    return pricing_snapshot()

@app.get("/public/rtp", tags=["public"])
def public_rtp():
    return rtp_stats()

# ======================================================
# INTERNAL (WATCHER → API)
# ======================================================
@app.post("/internal/event")
def internal_event(event: dict):
    return {"status": "received"}
