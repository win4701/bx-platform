# ======================================================
# Bloxio — MAIN (Production Stable v3)
# Secure • Clean • No Circular • Verified Telegram JWT
# ======================================================

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from pydantic import BaseModel

import os
import time
import json
import hmac
import hashlib
import logging
import threading
from urllib.parse import parse_qs
from jose import jwt, JWTError

# ======================================================
# LOGGING
# ======================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
)
logger = logging.getLogger("bloxio")

# ======================================================
# ENV
# ======================================================

ENV = os.getenv("ENV", "production").lower()
PORT = int(os.getenv("PORT", 8080))
INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "")

JWT_SECRET = os.getenv("JWT_SECRET")
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")

if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET not configured")

if not TELEGRAM_TOKEN:
    raise RuntimeError("TELEGRAM_TOKEN not configured")

ALGORITHM = "HS256"
security = HTTPBearer()

# ======================================================
# APP
# ======================================================

app = FastAPI(
    title="Bloxio API",
    version="3.0.0",
    docs_url="/docs" if ENV == "dev" else None,
    redoc_url=None
)

# ======================================================
# TELEGRAM JWT (Verified)
# ======================================================

def verify_telegram_init_data(init_data: str):

    parsed = parse_qs(init_data, strict_parsing=True)

    if "hash" not in parsed:
        raise HTTPException(400, "Invalid Telegram data")

    received_hash = parsed.pop("hash")[0]

    data_check_string = "\n".join(
        f"{k}={parsed[k][0]}"
        for k in sorted(parsed.keys())
    )

    secret_key = hashlib.sha256(
        TELEGRAM_BOT_TOKEN.encode()
    ).digest()

    calculated_hash = hmac.new(
        secret_key,
        data_check_string.encode(),
        hashlib.sha256
    ).hexdigest()

    if calculated_hash != received_hash:
        raise HTTPException(401, "Telegram verification failed")

    user = json.loads(parsed["user"][0])
    return user


def create_token(user_id: int):
    now = int(time.time())
    payload = {
        "user_id": user_id,
        "iat": now,
        "exp": now + 60 * 60 * 24
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET,
            algorithms=[ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(401, "Invalid or expired token")


class TelegramInit(BaseModel):
    initData: str


@app.post("/api/auth/telegram")
def telegram_auth(data: TelegramInit):
    user = verify_telegram_init_data(data.initData)
    token = create_token(user["id"])
    return {"access_token": token, "token_type": "bearer"}


@app.get("/api/auth/me")
def auth_me(user=Depends(get_current_user)):
    return {"user_id": user["user_id"]}

# ======================================================
# SECURITY HEADERS
# ======================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Server"] = "Bloxio"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ======================================================
# CORS
# ======================================================

allow_origins = ["*"] if ENV == "dev" else [
    "https://bloxio.online",
    "https://www.bloxio.online"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
# IMPORT ROUTERS (بعد تعريف get_current_user)
# ======================================================

from finance import router as finance_router
from market import router as market_router
from casino import router as casino_router
from bxing import router as bxing_router
from pricing import pricing_snapshot
from exchange import ORDER_BOOKS, TRADES, place_order

try:
    from kyc import router as kyc_router
except Exception:
    kyc_router = None

app.include_router(finance_router, prefix="/finance")
app.include_router(market_router, prefix="/market")
app.include_router(casino_router, prefix="/casino")
app.include_router(bxing_router)

if kyc_router:
    app.include_router(kyc_router, prefix="/kyc")

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
# WEBSOCKET (Exchange)
# ======================================================

@app.websocket("/ws/exchange")
async def exchange_ws(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            data = await ws.receive_json()

            if data.get("type") == "order":
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
def rtp_stats():
    return {
        "slots": 96.5,
        "roulette": 97.2,
        "blackjack": 99.1
    }

# ======================================================
# INTERNAL
# ======================================================

@app.post("/internal/event")
def internal_event(event: dict):
    if ENV != "dev" and event.get("secret") != INTERNAL_SECRET:
        raise HTTPException(403, "Unauthorized")
    return {"status": "received"}

# ======================================================
# RUN
# ======================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=PORT,
    )
