import time
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# ======================================================
# Routers
# ======================================================
from finance import router as finance_router, rtp_stats
from market import router as market_router
from casino import router as casino_router
from kyc import router as kyc_router

# Public / Pricing
from pricing import pricing_snapshot
from bxing import process_airdrop, start_mining 

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

app.include_router(
    kyc_router,
    prefix="/kyc",
    tags=["kyc"]
)

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
# WALLET (READ ONLY)
# ======================================================

@app.get("/finance/wallet")
def wallet():
    """
    Read-only wallet endpoint
    (values are placeholders until DB is connected)
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
# PUBLIC (READ ONLY)
# ======================================================
@app.get("/public/prices", tags=["public"])
def public_prices():
    """
    Unified pricing snapshot:
    - BX internal floor (2 USDT)
    - External prices (USDT / BTC / BNB / ETH / SOL / TON)
    """
    return pricing_snapshot()

@app.get("/public/rtp", tags=["public"])
def public_rtp():
    """
    Casino RTP transparency (read-only).
    """
    return rtp_stats()

# ======================================================
# NEW ROUTES FOR MINING AND BUY/SELL
# ======================================================
@app.post("/start_mining")
async def mining_handler(uid: int, investment: float, asset: str):
    """
    Endpoint to start mining for supported assets (BX, SOL, BNB).
    """
    try:
        result = start_mining(investment, asset)
        return {"status": "Mining started", "result": result}
    except Exception as e:
        raise HTTPException(500, f"Error starting mining: {str(e)}")

@app.post("/buy_bx")
async def buy_bx_handler(uid: int, amount: float, token: str):
    """
    Endpoint to process the purchase of BX using the provided token (e.g., USDT,BNB,ETH,TON,SOL,BTC).
    """
    try:
        result = buy_bx(amount, token)
        return {"status": "Buy BX successful", "result": result}
    except Exception as e:
        raise HTTPException(500, f"Error buying BX: {str(e)}")

@app.post("/sell_bx")
async def sell_bx_handler(uid: int, amount: float, token: str):
    """
    Endpoint to process the sale of BX for the provided token (e.g., USDT,BNB,ETH,TON,SOL,BTC).
    """
    try:
        result = sell_bx(amount, token)
        return {"status": "Sell BX successful", "result": result}
    except Exception as e:
        raise HTTPException(500, f"Error selling BX: {str(e)}")

# ======================================================
# ROOT
# ======================================================
@app.get("/")
def root():
    return {
        "name": APP_NAME,
        "status": "running",
        "env": APP_ENV,
        "ts": int(time.time())
    }

# ======================================================
# INTERNAL (WATCHER → API)
# ======================================================

@app.post("/internal/event")
def internal_event(event: dict):
    """
    Called ONLY by watcher service
    """
    return {"status": "received"}
