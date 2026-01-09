import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

# ======================================================
# CONFIG
# ======================================================
MAIN_API = os.getenv("MAIN_API", "http://localhost:8000")
WALLET_API = os.getenv("WALLET_API", "http://localhost:8001")
ADMIN_API = os.getenv("ADMIN_API", "http://localhost:8002")

app = FastAPI(title="Bloxio Public API Gateway", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# HELPERS
# ======================================================
def proxy(method: str, base: str, path: str, **kwargs):
    url = base.rstrip("/") + path
    r = requests.request(method, url, timeout=15, **kwargs)
    return r.json(), r.status_code

# ======================================================
# CORE (main.py)
# ======================================================

@app.get("/state")
def state(uid: int):
    return proxy("GET", MAIN_API, f"/state?uid={uid}")

@app.get("/market/price")
def market_price():
    return proxy("GET", MAIN_API, "/market/price")

@app.post("/market/buy")
def market_buy(payload: dict):
    return proxy("POST", MAIN_API, "/market/buy", json=payload)

@app.post("/market/sell")
def market_sell(payload: dict):
    return proxy("POST", MAIN_API, "/market/sell", json=payload)

@app.post("/casino/play")
def casino_play(payload: dict):
    return proxy("POST", MAIN_API, "/casino/play", json=payload)

@app.post("/mining/start")
def mining_start(payload: dict):
    return proxy("POST", MAIN_API, "/mining/start", json=payload)

@app.post("/mining/stop")
def mining_stop(payload: dict):
    return proxy("POST", MAIN_API, "/mining/stop", json=payload)

@app.post("/mining/claim")
def mining_claim(payload: dict):
    return proxy("POST", MAIN_API, "/mining/claim", json=payload)

# ======================================================
# WALLET (wallet_api.py)
# ======================================================

@app.post("/wallet/deposit")
def wallet_deposit(payload: dict):
    return proxy("POST", WALLET_API, "/wallet/deposit", json=payload)

@app.post("/wallet/withdraw")
def wallet_withdraw(payload: dict):
    return proxy("POST", WALLET_API, "/wallet/withdraw", json=payload)

@app.get("/wallet/state")
def wallet_state(uid: int):
    return proxy("GET", WALLET_API, f"/wallet/state?uid={uid}")

# ======================================================
# AIRDROP (main.py)
# ======================================================

@app.get("/airdrop/state")
def airdrop_state(uid: int):
    return proxy("GET", MAIN_API, f"/airdrop/state?uid={uid}")

@app.post("/airdrop/complete")
def airdrop_complete(payload: dict):
    return proxy("POST", MAIN_API, "/airdrop/complete", json=payload)

@app.post("/airdrop/claim")
def airdrop_claim(payload: dict):
    return proxy("POST", MAIN_API, "/airdrop/claim", json=payload)

# ======================================================
# HEALTH
# ======================================================

@app.get("/")
def root():
    return {
        "status": "api gateway ready",
        "services": {
            "main": MAIN_API,
            "wallet": WALLET_API,
            "admin": ADMIN_API
        }
    }
