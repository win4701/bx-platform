import time
import threading
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers
from finance import router as finance_router
from market import router as market_router
from casino import router as casino_router

# Watchers
from watcher import start_watchers

# Optional: public transparency helpers (read-only)
from finance import rtp_stats
from pricing import get_price

# ======================================================
# APP
# ======================================================
app = FastAPI(
    title="Bloxio API",
    version="1.0.0",
    description="Bloxio Core API – Wallet, Market, Casino, Airdrop, Transparency"
)

# ======================================================
# CORS (HTML5 / MiniApp)
# ======================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # قيّدها لاحقًا على الدومين
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# ROUTERS
# ======================================================
app.include_router(finance_router, prefix="/wallet", tags=["Wallet"])
app.include_router(market_router, prefix="/market", tags=["Market"])
app.include_router(casino_router, prefix="/casino", tags=["Casino"])

# ======================================================
# GLOBAL RUNTIME STATE
# ======================================================
START_TIME = int(time.time())

EPOCH_DAYS = 7 * 4  # Epoch شهري (Airdrop / Reports)
EPOCH_START = START_TIME

def current_epoch() -> int:
    return (int(time.time()) - EPOCH_START) // (EPOCH_DAYS * 86400)

# ======================================================
# STARTUP
# ======================================================
@app.on_event("startup")
def on_startup():
    # تشغيل Watchers (Deposit Gate)
    threading.Thread(
        target=start_watchers,
        daemon=True
    ).start()

    print("[BOOT] Bloxio API started")
    print("[BOOT] Deposit watchers running")
    print(f"[BOOT] Current Epoch: {current_epoch()}")

# ======================================================
# HEALTH
# ======================================================
@app.get("/health")
def health():
    return {
        "status": "ok",
        "uptime_sec": int(time.time()) - START_TIME,
        "epoch": current_epoch(),
        "service": "api.bloxio.online"
    }

# ======================================================
# METRICS (LIGHT – FOR DASHBOARD)
# ======================================================
@app.get("/metrics")
def metrics():
    # القيم التفصيلية تُستخرج من DB داخل Routers
    return {
        "service": "bloxio",
        "epoch": current_epoch(),
        "uptime_sec": int(time.time()) - START_TIME
    }

# ======================================================
# PUBLIC TRANSPARENCY (READ-ONLY)
# ======================================================
@app.get("/public/airdrop/summary")
def public_airdrop_summary():
    """
    ملخّص عام للـ Airdrop بدون أي بيانات شخصية
    """
    # هذه القيم تُربط لاحقًا بحسابات فعلية من DB
    return {
        "epoch": current_epoch(),
        "pool_bx": 0,
        "distributed_bx": 0,
        "users": 0,
        "avg_bx": 0
    }

@app.get("/public/casino/rtp")
def public_casino_rtp():
    """
    RTP فعلي مجمّع (شفافية)
    """
    return rtp_stats()

@app.get("/public/prices")
def public_prices():
    """
    أسعار حيّة (مرجعية + BX داخلي)
    """
    assets = ["btc", "sol", "ton", "bx"]
    prices = {}
    for a in assets:
        try:
            prices[a] = get_price(a)
        except Exception:
            prices[a] = None
    return prices

# ======================================================
# ROOT
# ======================================================
@app.get("/")
def root():
    return {
        "name": "Bloxio API",
        "status": "running",
        "epoch": current_epoch()
    }
