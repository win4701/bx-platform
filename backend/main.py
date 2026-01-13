import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers
from finance import router as finance_router, rtp_stats
from market import router as market_router
from casino import router as casino_router

# Pricing / Public
from pricing import pricing_snapshot

# ======================================================
# APP
# ======================================================
app = FastAPI(
    title="Bloxio Core API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None
)

# ======================================================
# CORS (UI / Bot / Mini App)
# ======================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # يمكن تقييدها لاحقًا
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# ROUTERS (CORE)
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

# ======================================================
# HEALTH (API ONLY)
# ======================================================
@app.get("/health")
def health():
    """
    Health خاص بالـ API فقط.
    watcher له Health مستقل على :9090
    """
    return {
        "status": "ok",
        "service": "api",
        "ts": int(time.time())
    }

# ======================================================
# PUBLIC SNAPSHOTS (READ-ONLY)
# ======================================================
@app.get("/public/prices", tags=["public"])
def public_prices():
    """
    Snapshot موحّد للأسعار:
    - BX internal fixed
    - External assets (USDT / TON / SOL / BTC)
    """
    return pricing_snapshot()

@app.get("/public/rtp", tags=["public"])
def public_rtp():
    """
    RTP شفافية (قراءة فقط)
    """
    return rtp_stats()

# ======================================================
# ROOT (OPTIONAL)
# ======================================================
@app.get("/")
def root():
    return {
        "name": "Bloxio Core API",
        "status": "running",
        "ts": int(time.time())
    }

# ======================================================
# NOTES
# ======================================================
"""
تشغيل الخدمات على Fly.io:

- API:
  uvicorn main:app --host 0.0.0.0 --port 8080

- Watcher (process مستقل):
  python watcher.py

ممنوع:
- تشغيل watcher داخل FastAPI
- Threads / background loops هنا
"""
