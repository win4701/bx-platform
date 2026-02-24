import os
import logging
import threading
from bot_telegram import start_bot
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel

# ======================================================
# ENV
# ======================================================

ENV = os.getenv("ENV", "production").lower()
PORT = int(os.getenv("PORT", 8080))
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "")

# ======================================================
# FEATURE FLAGS
# ======================================================

FEATURES = {
    "walletconnect": True,
    "binancepay_direct": True,
    "stonfi_trade": False,
    "casino": True,
    "market": True,
    "mining": True,
}

# ======================================================
# LOGGING
# ======================================================

logging.basicConfig(
    level=logging.INFO if ENV != "dev" else logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger("bloxio")

# ======================================================
# IMPORT ROUTERS
# ======================================================

from finance import router as finance_router, rtp_stats
from market import router as market_router
from exchange import ORDER_BOOKS, TRADES, place_order
from casino import router as casino_router
from pricing import pricing_snapshot
from bxing import router as bxing_router

try:
    from kyc import router as kyc_router
except Exception:
    kyc_router = None

# ======================================================
# APP
# ======================================================

app = FastAPI(
    title="Bloxio API",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ======================================================
# LIFECYCLE EVENTS
# ======================================================

@app.on_event("startup")
async def startup_event():
    logger.info(f"🚀 Bloxio API started | ENV={ENV} | PORT={PORT}")

    bot_thread = threading.Thread(
        target=start_bot,
        daemon=True
    )
    bot_thread.start()
    
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Bloxio API shutting down")

# ======================================================
# GLOBAL ERROR HANDLER
# ======================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# ======================================================
# CORS
# ======================================================

if ENV == "dev":
    allow_origins = ["*"]
else:
    allow_origins = [
        "https://www.bloxio.online",
        "https://bloxio.online"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# SECURITY HEADERS
# ======================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Server"] = "Bloxio"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ======================================================
# ROUTERS
# ======================================================

app.include_router(finance_router, prefix="/finance", tags=["finance"])
app.include_router(market_router, prefix="/market", tags=["market"])
app.include_router(casino_router, prefix="/casino", tags=["casino"])
app.include_router(bxing_router)

if kyc_router:
    app.include_router(kyc_router, prefix="/kyc", tags=["kyc"])

# ======================================================
# HEALTH
# ======================================================

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy"}
    
# ======================================================
# BXING DEMO SAFE
# ======================================================

class MiningOrder(BaseModel):
    asset: str
    plan: str
    investment: float
    user_id: int

@app.get("/bxing/airdrop/status")
def airdrop_status(uid: int):
    return {"claimed": False, "reward": 50}

@app.post("/bxing/airdrop/claim")
def claim_airdrop(uid: int):
    return {"status": "ok", "reward": 50}

@app.get("/bxing/referral/link")
def get_referral_link(uid: int):
    return {"link": f"https://bloxio.online/referral/{uid}"}

@app.get("/bxing/referral/leaderboard")
def get_referral_leaderboard():
    return [
        {"id": 1, "referrals": 50},
        {"id": 2, "referrals": 30},
        {"id": 3, "referrals": 10},
    ]

@app.post("/bxing/mining/start")
def start_mining(order: MiningOrder):
    if order.investment < 10:
        raise HTTPException(400, "Minimum investment is 10.")
    return {"status": "started", "estimated_return": order.investment * 1.2}

@app.get("/bxing/mining/active")
def get_active_mining(uid: int):
    return [
        {"asset": "BX", "plan": "Starter", "roi": 2.5},
        {"asset": "SOL", "plan": "Infinity", "roi": 14}
    ]

# ======================================================
# WALLETCONNECT
# ======================================================

@app.post("/walletconnect/connect")
def connect_wallet():
    if not FEATURES["walletconnect"]:
        raise HTTPException(410, "WalletConnect disabled")
    return {"status": "connected"}

# ======================================================
# BINANCE PAY
# ======================================================

@app.post("/wallet/binancepay")
def binance_pay():
    if not FEATURES["binancepay_direct"]:
        raise HTTPException(410, "Direct Binance Pay disabled")
    return {"status": "processing"}

# ======================================================
# STON
# ======================================================

@app.get("/ston/price")
def ston_price():
    return {"price": 8, "liquidity": 100000}

@app.get("/ston/quote")
def ston_quote(amount: float):
    price = 8
    ton_out = amount * price
    fee = ton_out * 0.003
    return {
        "bx_in": amount,
        "ton_out": ton_out - fee,
        "fee": fee
    }

# ======================================================
# EXCHANGE WEBSOCKET
# ======================================================

@app.websocket("/ws/exchange")
async def exchange_ws(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()

            if data.get("type") == "order" and all(
                k in data for k in ["uid", "pair", "side", "price", "amount"]
            ):
                place_order(
                    uid=data["uid"],
                    pair=data["pair"],
                    side=data["side"],
                    price=data["price"],
                    amount=data["amount"]
                )

                await ws.send_json({
                    "type": "update",
                    "pair": data["pair"],
                    "book": ORDER_BOOKS.get(data["pair"], {}),
                    "trades": list(TRADES.get(data["pair"], []))[-50:]
                })

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")

# ======================================================
# PUBLIC
# ======================================================

@app.get("/public/prices")
def public_prices():
    return pricing_snapshot()

@app.get("/public/rtp")
def public_rtp():
    return rtp_stats()

# ======================================================
# INTERNAL
# ======================================================

@app.post("/internal/event")
def internal_event(event: dict):
    if ENV != "dev" and event.get("secret") != INTERNAL_SECRET:
        raise HTTPException(403, "Unauthorized")
    return {"status": "received"}

# ======================================================
# RUN (Fly Compatible)
# ======================================================

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=PORT)
