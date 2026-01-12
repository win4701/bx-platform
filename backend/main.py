import time
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ======================================================
# ROUTERS
# ======================================================
from finance import router as finance_router
from market import router as market_router
from casino import router as casino_router

# ======================================================
# WATCHERS (ON-CHAIN ONLY)
# ======================================================
from watcher import start_watchers

# ======================================================
# PUBLIC HELPERS (READ ONLY)
# ======================================================
from finance import rtp_stats
from pricing import get_price

# ======================================================
# APP INIT
# ======================================================
app = FastAPI(
    title="Bloxio API",
    version="1.0.0",
    description="BX Platform Backend",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ======================================================
# CORS
# ======================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://bloxio.online",
        "https://www.bloxio.online",
        "https://api.bloxio.online",
        "*"  # يمكن تشديدها لاحقًا
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# ROUTER MOUNTING
# ======================================================
app.include_router(finance_router, prefix="/wallet", tags=["wallet"])
app.include_router(finance_router, prefix="/finance", tags=["finance"])

app.include_router(market_router, prefix="/market", tags=["market"])
app.include_router(casino_router, prefix="/casino", tags=["casino"])

# ======================================================
# HEALTH CHECK
# ======================================================
@app.get("/health")
def health():
    return {
        "status": "ok",
        "ts": int(time.time())
    }

# ======================================================
# PUBLIC PRICES (READ ONLY)
# ======================================================
@app.get("/public/prices")
def public_prices():
    return {
        "bx": get_price("bx"),
        "usdt": 1.0,
        "ton": get_price("ton"),
        "sol": get_price("sol"),
        "btc": get_price("btc")
    }

# ======================================================
# PUBLIC RTP (TRANSPARENCY)
# ======================================================
@app.get("/public/rtp")
def public_rtp():
    return rtp_stats()

# ======================================================
# STARTUP EVENT
# ======================================================
@app.on_event("startup")
def on_startup():
    """
    - Start blockchain watchers
    - No blocking calls
    """
    threading.Thread(
        target=start_watchers,
        daemon=True
    ).start()

    print("[BOOT] Watchers started")
    print("[BOOT] API ready")

# ======================================================
# SHUTDOWN EVENT
# ======================================================
@app.on_event("shutdown")
def on_shutdown():
    print("[SHUTDOWN] API stopped")
