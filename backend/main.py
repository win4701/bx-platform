import threading
import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers
from market import router as market_router
from finance import router as finance_router
from casino import router as casino_router

# Watchers
from watcher import start_watchers

# Pricing / Transparency
from pricing import pricing_snapshot
from finance import rtp_stats

# ======================================================
# APP
# ======================================================
app = FastAPI(
    title="Bloxio API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None
)

# ======================================================
# CORS
# ======================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # يمكن تقييدها لاحقًا
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# ROUTERS
# ======================================================
app.include_router(market_router, prefix="/market", tags=["market"])
app.include_router(finance_router, prefix="/finance", tags=["finance"])
app.include_router(casino_router, prefix="/casino", tags=["casino"])

# ======================================================
# HEALTH CHECK (RENDER REQUIRED)
# ======================================================
@app.get("/health")
def health():
    return {
        "status": "ok",
        "ts": int(time.time())
    }

# ======================================================
# PUBLIC SNAPSHOTS
# ======================================================
@app.get("/public/prices")
def public_prices():
    """
    Snapshot موحّد للأسعار:
    - السعر الداخلي الثابت لـ BX
    - الأسعار الخارجية (USDT)
    - تحويلها إلى BX
    """
    return pricing_snapshot()

@app.get("/public/rtp")
def public_rtp():
    """
    شفافية RTP (قراءة فقط)
    """
    return rtp_stats()

# ======================================================
# STARTUP: WATCHERS
# ======================================================
@app.on_event("startup")
def startup():
    """
    تشغيل Watchers في Thread منفصل
    (TON / SOL / BTC)
    """
    t = threading.Thread(
        target=start_watchers,
        daemon=True
    )
    t.start()

# ======================================================
# SHUTDOWN
# ======================================================
@app.on_event("shutdown")
def shutdown():
    pass
