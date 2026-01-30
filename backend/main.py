import os
import time
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ======================================================
# Routers
# ======================================================
from finance import router as finance_router, rtp_stats
from market import router as market_router
from casino import router as casino_router
 
try:
    from kyc import router as kyc_router
except Exception:
    kyc_router = None

# Public / Pricing
from pricing import pricing_snapshotfrom bxing import router as bxing_router
app.include_router(bxing_router)

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

if kyc_router:
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
class MarketRecord(BaseModel):
    source: str
    pair: str
    side: str
    amount: float
    base: str
    quote: str
    contract: str


@app.post("/market/record")
def record_market_action(data: MarketRecord):
    """
    Called AFTER user performs swap on ston.fi
    Backend DOES NOT execute swaps.
    """
    return {
        "status": "recorded",
        "source": data.source,
        "pair": data.pair,
        "side": data.side,
        "amount": data.amount
    }

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
# MINING
# ======================================================
@app.post("/start_mining")
def mining_handler(uid: int, investment: float, asset: str):
    """
    Start mining for supported assets (BX, SOL, BNB)
    """
    try:
        result = start_mining(investment, asset)
        return {"status": "started", "result": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

# ======================================================
# INTERNAL (WATCHER → API)
# ======================================================
@app.post("/internal/event")
def internal_event(event: dict):
    """
    Called ONLY by watcher service
    """
    return {"status": "received"}
