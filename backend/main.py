import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ======================================================
# Routers
# ======================================================
from finance import router as finance_router, rtp_stats
from market import router as market_router
from casino import router as casino_router

# kyc 
try:
    from kyc import router as kyc_router
except Exception:
    kyc_router = None

# Public / Pricing
from pricing import pricing_snapshot

# bxing (mining + airdrop)
from bxing import router as bxing_router

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
# CORS
# ======================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.bloxio.online", "https://bloxio.online"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# ROUTERS (CORE API)
# ======================================================
app.include_router(
    finance_router,
    prefix="/finance",
    tags=["finance"]
)

app.include_router(
    market_router,
    prefix="/market",
    tags=["market"]
)

app.include_router(
    casino_router,
    prefix="/casino",
    tags=["casino"]
)

if kyc_router:
    app.include_router(
        kyc_router,
        prefix="/kyc",
        tags=["kyc"]
    )

# bxing (airdrop + mining)
app.include_router(bxing_router)

# ======================================================
# HEALTH CHECKS (FLY)
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
# WALLET (READ ONLY / PLACEHOLDER)
# ======================================================
@app.get("/finance/wallet")
def wallet():
    """
    Read-only wallet endpoint
    (placeholders until DB is connected)
    """
    return {
        "BX": 0,
        "USDT": 0,
        "TON": 0,
        "BNB": 0,
        "BTC": 0,
        "ETH": 0,
        "SOL": 0
    }

# ======================================================
# MARKET (STON.FI RECORD ONLY)
# ======================================================
# API URLs
BINANCE_PAY_API_URL = "https://api.binancepay.com"
WALLETCONNECT_API_URL = "https://api.walletconnect.org"
STON_FI_API_BASE = "https://api.ston.fi"
API_BASE_URL = "http://localhost:8000"

# Dummy Data for Casino and Market
recent_casino_data = [
    {"game": "Roulette", "player": "User123", "bet": 50, "outcome": "Win", "reward": 100},
    {"game": "Blackjack", "player": "User456", "bet": 30, "outcome": "Lose", "reward": 0},
    {"game": "Poker", "player": "User789", "bet": 100, "outcome": "Win", "reward": 200},
]

recent_market_data = [
    {"pair": "BX/USDT", "side": "buy", "amount": 10, "price": 100},
    {"pair": "BX/USDT", "side": "sell", "amount": 5, "price": 105},
    {"pair": "BX/ETH", "side": "buy", "amount": 2, "price": 2500},
]

# ================== Models ==================

# template API 
class MiningOrder(BaseModel):
    asset: str
    plan: str
    investment: float
    user_id: int

# ================== Recent Casino ==================

@app.get("/casino/recent")
def get_recent_casino():
    """ casino recent"""
    return {"recent_casino": recent_casino_data}

# ================== Recent Market ==================

@app.get("/market/recent")
def get_recent_market():
    """ market recent"""
    return {"recent_market": recent_market_data}

# ================== Airdrop ==================

@app.get("/bxing/airdrop/status")
def airdrop_status(uid: int):
    """ sync Airdrop"""
    return {"claimed": False, "reward": 50}

@app.post("/bxing/airdrop/claim")
def claim_airdrop(uid: int):
    """ Calim Airdrop """
    return {"status": "ok", "reward": 50}

# ================== Referral ==================

@app.get("/bxing/referral/link")
def get_referral_link(uid: int):
    """ create link ref """
    return {"link": f"https://bloxio.online/referral/{uid}"}

@app.get("/bxing/referral/leaderboard")
def get_referral_leaderboard():
    """ sync board """
    return [
        {"id": 1, "referrals": 50},
        {"id": 2, "referrals": 30},
        {"id": 3, "referrals": 10},
    ]

# ================== Mining ==================

@app.post("/bxing/mining/start")
def start_mining(order: MiningOrder):
    """ start mining """
    if order.investment < 10:
        raise HTTPException(status_code=400, detail="Minimum investment is 10.")
    
    return {"status": "started", "estimated_return": order.investment * 1.2}  

@app.get("/bxing/mining/active")
def get_active_mining(uid: int):
    """ user mining """
    return [
        {"asset": "BX", "plan": "Starter", "roi": 2.5},
        {"asset": "SOL", "plan": "Infinity", "roi": 14}
    ]

# ================== WalletConnect ==================

@app.post("/walletconnect/connect")
def connect_wallet(user_id: int, wallet_address: str):
    """ WalletConnect """
    return {"status": "success", "message": f"Wallet {wallet_address} connected successfully."}

# ================== Binance Pay ==================

@app.post("/binancepay/pay")
def binance_pay(user_id: int, amount: float, recipient_address: str):
    """ Binance Pay """
    transaction_data = {
        "user_id": user_id,
        "amount": amount,
        "recipient_address": recipient_address
    }
    
    return {"status": "success", "message": f"Successfully paid {amount} to {recipient_address} via Binance Pay."}

# ================== Ston.fi ==================
class BuyBXOrder(BaseModel):
    ton_amount: float  

@app.get("/stonfi/bx_price")
def get_bx_price():
    """ Get BX price for TON/USDT """
    return {"price": 8}  # 

@app.post("/stonfi/buy")
def buy_bx(order: BuyBXOrder):
    """ Buy BX using TON/USDT """
    if order.ton_amount <= 0:
        raise HTTPException(status_code=400, detail="The TON amount must be greater than zero.")
    
    price_data = get_bx_price()  
    price = price_data["price"]
    bx_amount = order.ton_amount / price
    
    response = {"status": "success", "message": f"Bought {bx_amount} BX for {order.ton_amount} TON."}
    
    return response

# ======================================================
# PUBLIC (READ ONLY)
# ======================================================
@app.get("/public/prices", tags=["public"])
def public_prices():
    """
    Unified pricing snapshot
    """
    return pricing_snapshot()

@app.get("/public/rtp", tags=["public"])
def public_rtp():
    """
    Casino RTP transparency (read-only)
    """
    return rtp_stats()

# ======================================================
# INTERNAL (WATCHER → API)
# ======================================================
@app.post("/internal/event")
def internal_event(event: dict):
    """
    Called ONLY by watcher service
    """
    return {"status": "received"}
