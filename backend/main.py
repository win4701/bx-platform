# ==========================================================
# BLOXIO CORE SERVER
# FastAPI • WebSocket • Market Engine • Telegram Bot
# ==========================================================

import os
import asyncio
import logging

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

# ==========================================================
# ENV CONFIG
# ==========================================================

APP_NAME = os.getenv("APP_NAME", "BLOXIO")
APP_ENV = os.getenv("APP_ENV", "production")
APP_VERSION = os.getenv("APP_VERSION", "1.0")

PORT = int(os.getenv("PORT", 8000))

# ==========================================================
# LOGGING
# ==========================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

log = logging.getLogger(APP_NAME)

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
# FASTAPI APP
# ==========================================================

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION
)

# ==========================================================
# CORS (Render + Telegram WebApp)
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
        "service": APP_NAME,
        "env": APP_ENV,
        "version": APP_VERSION,
        "status": "running"
    }

# ==========================================================
# HEALTH CHECK
# ==========================================================

@app.get("/health")
def health():

    return {
        "status": "ok"
    }

# ==========================================================
# BIG WINS WEBSOCKET
# ==========================================================

big_wins_clients = []

@app.websocket("/ws/big-wins")
async def big_wins(ws: WebSocket):

    await ws.accept()
    big_wins_clients.append(ws)

    try:
        while True:
            await ws.receive_text()
    except:
        big_wins_clients.remove(ws)

# ==========================================================
# STARTUP
# ==========================================================

@app.on_event("startup")
async def startup_event():

    log.info("Starting BLOXIO server")

    try:

        # start market engine
        start_market()

        log.info("Market engine started")

    except Exception as e:

        log.error("Market engine failed", e)

    try:

        # start telegram bot
        asyncio.create_task(start_bot())

        log.info("Telegram bot started")

    except Exception as e:

        log.error("Bot startup failed", e)

# ==========================================================
# SHUTDOWN
# ==========================================================

@app.on_event("shutdown")
async def shutdown_event():

    log.info("BLOXIO shutting down")

# ==========================================================
# RUN (local only)
# ==========================================================

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=False
    )
