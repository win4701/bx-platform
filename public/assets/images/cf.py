import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers
from market import router as market_router
from finance import router as finance_router
from casino import router as casino_router

# Pricing / Transparency
from pricing import pricing_snapshot
from finance import rtp_stats

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
# HEALTH CHECK (LB / Fly / Render)
# ======================================================
@app.get("/health")
def health():
    """
    Health خاص بالـ API فقط
    (watcher له health مستقل على 9090)
    """
    return {
        "status": "ok",
        "service": "api",
        "ts": int(time.time())
    }

# ======================================================
# PUBLIC SNAPSHOTS (READ ONLY)
# ======================================================
@app.get("/public/prices")
def public_prices():
    """
    Snapshot موحّد للأسعار:
    - BX internal fixed
    - External prices (USDT)
    - Conversion transparency
    """
    return pricing_snapshot()

@app.get("/public/rtp")
def public_rtp():
    """
    RTP شفافية (قراءة فقط)
    """
    return rtp_stats()

# ======================================================
# NOTES
# ======================================================
"""
تشغيل watcher.py:
- يتم كـ Service مستقل
- process منفصل
- port 9090
- لا يُستدعى من هنا
"""
