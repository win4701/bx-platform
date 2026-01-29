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
from bxing import start_mining, process_airdrop

# ======================================================
# APP CONFIG
# ======================================================
APP_NAME = "Bloxio Core API"
APP_VERSION = "1.0.0"
APP_ENV = os.getenv("APP_ENV", "production")

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    docs_url="/docs" if APP_ENV != "production" else None,
    redoc_url=None,
)

# ======================================================
# CORS
# ======================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # يمكن تقييدها لاحقًا (Fly secrets)
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
@app.get("/health")
def health():
    """
    Health check for Fly.io.
    Used by Fly proxy & monitors.
    """
    return {
        "status": "ok",
        "service": "api",
        "env": APP_ENV,
        "ts": int(time.time())
    }

@app.get("/health/ready")
def readiness():
    """
    Readiness probe (DB, deps can be added later).
    """
    return {
        "ready": True,
        "ts": int(time.time())
    }

# ======================================================
# PUBLIC (READ ONLY)
# ======================================================
@app.get("/public/prices", tags=["public"])
def public_prices():
    """
    Unified pricing snapshot:
    - BX internal floor (2 USDT)
    - External prices (USDT / BTC / ETH / BNB / SOL / TON)
    """
    return pricing_snapshot()

@app.get("/public/rtp", tags=["public"])
def public_rtp():
    """
    Casino RTP transparency (read-only).
    """
    return rtp_stats()

# ======================================================
# NEW ROUTES FOR MINING AND AIRDROP
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

@app.post("/airdrop")
async def airdrop_handler(uid: int, asset: str, amount: float):
    """
    Endpoint to process airdrop based on the deposited amount.
    """
    try:
        process_airdrop(uid, asset, amount)
        return {"status": "Airdrop successful"}
    except Exception as e:
        raise HTTPException(500, f"Error processing airdrop: {str(e)}")

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
# NOTES (IMPORTANT)
# ======================================================
"""
Fly.io Deployment Notes:

API Service:
-------------
CMD: uvicorn main:app --host 0.0.0.0 --port 8080

Ports:
------
internal_port = 8080
external_port = 80 / 443 (Fly proxy)

Watcher:
--------
- watcher.py runs as a separate Fly app or process
- NEVER run watcher inside FastAPI
- Watcher listens to Webhooks / blockchain events only

Env Vars (Fly Secrets):
----------------------
APP_ENV
API_KEY
ADMIN_TOKEN
AUDIT_TOKEN
HMAC_SECRET
WATCHER_SECRET
DATABASE_URL
TELEGRAM_BOT_TOKEN
ADMIN_TELEGRAM_ID
"""
