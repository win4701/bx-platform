# ==========================================================
# BLOXIO PRICING ENGINE
# Market Prices • BX Internal Price • Oracle Layer
# ==========================================================

import requests
import time
import threading

from fastapi import APIRouter

router = APIRouter(prefix="/pricing", tags=["pricing"])

# ==========================================================
# PRICE STATE
# ==========================================================

PRICE_CACHE = {
    "BX": 1.0,

    "BTC": 0,
    "ETH": 0,
    "BNB": 0,
    "SOL": 0,
    "AVAX": 0,
    "LTC": 0,
    "ZEC": 0,
    "TON": 0,

    "USDT": 1,
    "USDC": 1
}

LAST_UPDATE = 0


# ==========================================================
# PRICE SOURCES
# ==========================================================

COINGECKO_MAP = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "BNB": "binancecoin",
    "SOL": "solana",
    "AVAX": "avalanche-2",
    "LTC": "litecoin",
    "ZEC": "zcash",
    "TON": "the-open-network"
}


# ==========================================================
# FETCH PRICES
# ==========================================================

def fetch_prices():

    global LAST_UPDATE

    try:

        ids = ",".join(COINGECKO_MAP.values())

        url = f"https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd"

        r = requests.get(url, timeout=10)

        data = r.json()

        for symbol, cg in COINGECKO_MAP.items():

            PRICE_CACHE[symbol] = data.get(cg, {}).get("usd", 0)

        # BX internal peg
        PRICE_CACHE["BX"] = 1

        LAST_UPDATE = int(time.time())

    except Exception as e:
        print("PRICE FETCH ERROR", e)


# ==========================================================
# PRICE LOOP
# ==========================================================

def price_loop():

    while True:

        fetch_prices()

        time.sleep(60)


# ==========================================================
# API — ALL PRICES
# ==========================================================

@router.get("/all")
def get_prices():

    return {
        "prices": PRICE_CACHE,
        "updated": LAST_UPDATE
    }


# ==========================================================
# API — SINGLE
# ==========================================================

@router.get("/{symbol}")
def get_price(symbol: str):

    symbol = symbol.upper()

    if symbol not in PRICE_CACHE:
        return {"price": 0}

    return {
        "symbol": symbol,
        "price": PRICE_CACHE[symbol],
        "updated": LAST_UPDATE
    }


# ==========================================================
# CONVERT
# ==========================================================

@router.get("/convert/{asset}/{amount}")
def convert(asset: str, amount: float):

    asset = asset.upper()

    price = PRICE_CACHE.get(asset)

    if not price:
        return {"usd": 0}

    return {
        "asset": asset,
        "amount": amount,
        "usd": amount * price
    }


# ==========================================================
# BX CONVERSION
# ==========================================================

@router.get("/bx/{usd}")
def usd_to_bx(usd: float):

    bx_price = PRICE_CACHE["BX"]

    if bx_price == 0:
        return {"bx": 0}

    return {
        "usd": usd,
        "bx": usd / bx_price
    }


# ==========================================================
# START ENGINE
# ==========================================================

def start_pricing():

    t = threading.Thread(target=price_loop, daemon=True)

    t.start()

    print("Pricing engine started")
