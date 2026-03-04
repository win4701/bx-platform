# ==========================================================
# BLOXIO MARKET ENGINE
# Price Engine • OrderBook • Binance Stream
# Compatible with market.js
# ==========================================================

import os
import json
import time
import asyncio
import logging
import websockets
import sqlite3

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
    "USDC",
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
    "USDC": "btcusdt",
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
# DB SAFE
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

LOCK = Lock()

# ==========================================================
# PRICE ENGINE
# ==========================================================

def compute_bx_price(quote, quote_price):

    if quote_price <= 0:
        return

    bx_price = BX_REFERENCE_PRICE / quote_price

    pair = f"BX/{quote}"

    with LOCK:

        MARKET_PRICES[pair] = bx_price

        generate_orderbook(pair, bx_price)

        store_price(pair, bx_price)

    logger.info(f"{pair} {bx_price}")

# ==========================================================
# ORDERBOOK
# ==========================================================

def generate_orderbook(pair, price):

    bids = []
    asks = []

    for i in range(ROWS):

        bid = round(price - i * price * 0.0005, 8)
        ask = round(price + i * price * 0.0005, 8)

        bids.append(bid)
        asks.append(ask)

    ORDER_BOOKS[pair]["buy"] = bids
    ORDER_BOOKS[pair]["sell"] = asks

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

                (
                    pair,
                    price,
                    int(time.time())
                )
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

async with websockets.connect(uri) as ws:

    while True:

        msg = await ws.recv()

        data = json.loads(msg)

        price = float(data["c"])

        compute_bx_price(quote, price)

        except Exception as e:

            logger.error(e)

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

    return {

        "pair": pair,
        "price": MARKET_PRICES.get(pair, 0)
    }

# ==========================================================

@router.get("/orderbook/{pair}")
def orderbook(pair: str):

    return ORDER_BOOKS.get(pair)

# ==========================================================

@router.get("/trades/{pair}")
def trades(pair: str):

    return list(RECENT_TRADES[pair])

# ==========================================================
# INTERNAL TRADE RECORD
# ==========================================================

def record_trade(pair, price, amount):

    RECENT_TRADES[pair].append({

        "price": price,
        "amount": amount,
        "ts": int(time.time())
    })

# ==========================================================
# START STREAMS
# ==========================================================

def start_market():

    loop = asyncio.get_event_loop()

    for quote in SUPPORTED_QUOTES:

        loop.create_task(stream_symbol(quote))

    logger.info("Market engine started")
