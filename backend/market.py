# ==========================================================
# BLOXIO MARKET ENGINE v2
# Price Engine • Binance Feed • Exchange Sync
# ==========================================================

import os
import json
import time
import asyncio
import logging
import sqlite3
import websockets

from collections import defaultdict, deque
from contextlib import contextmanager
from threading import Lock
from fastapi import APIRouter, HTTPException

# ==========================================================
# CONFIG
# ==========================================================

DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")

BX_REFERENCE_PRICE = 45.0

SUPPORTED_QUOTES = [
    "USDT",
    "BTC",
    "ETH",
    "BNB",
    "SOL",
    "AVAX",
    "TON",
    "LTC",
    "ZEC"
]

BINANCE_SYMBOLS = {

    "USDT": "btcusdt",
    "BTC": "btcusdt",
    "ETH": "ethusdt",
    "BNB": "bnbusdt",
    "SOL": "solusdt",
    "AVAX": "avaxusdt",
    "TON": "tonusdt",
    "LTC": "ltcusdt",
    "ZEC": "zecusdt"
}

ROWS = 15

router = APIRouter(prefix="/market", tags=["market"])

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("market")

# ==========================================================
# DATABASE
# ==========================================================

@contextmanager
def db():

    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row

    try:
        yield conn
        conn.commit()

    except:
        conn.rollback()
        raise

    finally:
        conn.close()

# ==========================================================
# GLOBAL STATE
# ==========================================================

MARKET_PRICES = {}

ORDER_BOOKS = defaultdict(lambda: {"buy": [], "sell": []})

RECENT_TRADES = defaultdict(lambda: deque(maxlen=500))

TICKERS = {}

LOCK = Lock()

# ==========================================================
# PRICE ENGINE
# ==========================================================

def compute_bx_price(quote, quote_price):

    if quote_price <= 0:
        return

    pair = f"BX/{quote}"

    bx_price = BX_REFERENCE_PRICE / quote_price

    with LOCK:

        MARKET_PRICES[pair] = bx_price

        generate_orderbook(pair, bx_price)

        update_ticker(pair, bx_price)

        store_price(pair, bx_price)

    logger.info(f"{pair} {bx_price}")

# ==========================================================
# ORDERBOOK
# ==========================================================

def generate_orderbook(pair, price):

    bids = []
    asks = []

    for i in range(ROWS):

        spread = price * 0.0005 * i

        bids.append(round(price - spread, 8))
        asks.append(round(price + spread, 8))

    ORDER_BOOKS[pair]["buy"] = bids
    ORDER_BOOKS[pair]["sell"] = asks

# ==========================================================
# TICKER
# ==========================================================

def update_ticker(pair, price):

    ticker = TICKERS.get(pair)

    if not ticker:

        ticker = {
            "open": price,
            "high": price,
            "low": price,
            "volume": 0
        }

    ticker["high"] = max(ticker["high"], price)
    ticker["low"] = min(ticker["low"], price)

    TICKERS[pair] = ticker

# ==========================================================
# TRADE RECORD
# ==========================================================

def record_trade(pair, price, amount):

    RECENT_TRADES[pair].append({

        "price": price,
        "amount": amount,
        "ts": int(time.time())
    })

    ticker = TICKERS.get(pair)

    if ticker:

        ticker["volume"] += amount

# ==========================================================
# STORE PRICE
# ==========================================================

def store_price(pair, price):

    try:

        with db() as conn:

            conn.execute(

                """
                INSERT INTO market_prices(pair,price,ts)
                VALUES(?,?,?)
                """,

                (pair, price, int(time.time()))
            )

    except Exception as e:

        logger.error(e)

# ==========================================================
# BINANCE STREAM
# ==========================================================

async def stream_symbol(quote):

    symbol = BINANCE_SYMBOLS.get(quote)

    if not symbol:
        return

    uri = f"wss://data-stream.binance.vision/ws/{symbol}@miniTicker"

    while True:

        try:

            async with websockets.connect(uri) as ws:

                logger.info(f"Connected {symbol}")

                while True:

                    msg = await ws.recv()

                    data = json.loads(msg)

                    price = float(data["c"])

                    compute_bx_price(quote, price)

        except Exception as e:

            logger.error(f"market stream error: {e}")

            await asyncio.sleep(5)

# ==========================================================
# API
# ==========================================================

@router.get("/pairs")
def pairs():

    return list(MARKET_PRICES.keys())

# ==========================================================

@router.get("/price/{pair}")
def price(pair: str):

    if pair not in MARKET_PRICES:
        raise HTTPException(404, "PAIR_NOT_FOUND")

    return {
        "pair": pair,
        "price": MARKET_PRICES[pair]
    }

# ==========================================================

@router.get("/ticker/{pair}")
def ticker(pair: str):

    return TICKERS.get(pair)

# ==========================================================

@router.get("/orderbook/{pair}")
def orderbook(pair: str):

    return ORDER_BOOKS.get(pair)

# ==========================================================

@router.get("/trades/{pair}")
def trades(pair: str):

    return list(RECENT_TRADES[pair])

# ==========================================================
# START ENGINE
# ==========================================================

def start_market():

    loop = asyncio.get_event_loop()

    for quote in SUPPORTED_QUOTES:

        loop.create_task(stream_symbol(quote))

    logger.info("Market engine started")
