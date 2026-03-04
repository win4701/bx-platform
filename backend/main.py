# ==========================================================
# BLOXIO MAIN SERVER
# FastAPI Core
# ==========================================================

import os
import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ==========================================================
# IMPORT MODULES
# ==========================================================

from auth import router as auth_router
from finance import router as finance_router
from casino import router as casino_router
from mining import router as mining_router
from market import router as market_router, start_market
from exchange import router as exchange_router
from pricing import router as pricing_router
from airdrop import router as airdrop_router
from bot import start_bot

# ==========================================================
# APP
# ==========================================================

app = FastAPI(
    title="BLOXIO API",
    version="1.0"
)

# ==========================================================
# CORS (frontend render)
# ==========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================================
# ROUTERS
# ==========================================================

app.include_router(auth_router)
app.include_router(finance_router)
app.include_router(casino_router)
app.include_router(mining_router)
app.include_router(market_router)
app.include_router(exchange_router)
app.include_router(pricing_router)
app.include_router(airdrop_router)

# ==========================================================
# ROOT
# ==========================================================

@app.get("/")
def root():
    return {
        "service": "BLOXIO API",
        "status": "running"
    }

# ==========================================================
# HEALTH
# ==========================================================

@app.get("/health")
def health():
    return {"status": "ok"}

# ==========================================================
# STARTUP
# ==========================================================

@app.on_event("startup")
async def startup_event():

    logging.info("Starting BLOXIO")

    # start market engine
    start_market()

    # start telegram bot async
    asyncio.create_task(start_bot())

# ==========================================================
# SHUTDOWN
# ==========================================================

@app.on_event("shutdown")
async def shutdown_event():

    logging.info("Server shutting down")

# ==========================================================
# RUN
# ==========================================================

if __name__ == "__main__":

    import uvicorn

    port = int(os.getenv("PORT", 8000))

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )
