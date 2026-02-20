import os
import time
import json
import asyncio
import logging
import sqlite3
import websockets
from collections import defaultdict, deque
from contextlib import contextmanager
from threading import Lock
from fastapi import APIRouter, HTTPException

# ======================================================
# CONFIG
# ======================================================

DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")
BX_REFERENCE_PRICE = 45.0   # 1 BX = 45 USDT reference

SUPPORTED_QUOTES = [
    "USDT","USDC","TON","BNB","ETH",
    "AVAX","SOL","BTC","ZEC","LTC"
]

BINANCE_SYMBOLS = {
    "USDT": "btcusdt",
    "USDC": "btcusdt",
    "BTC":  "btcusdt",
    "ETH":  "ethusdt",
    "BNB":  "bnbusdt",
    "SOL":  "solusdt",
    "AVAX": "avaxusdt",
    "LTC":  "ltcusdt",
    "ZEC":  "zecusdt",
    "TON":  "tonusdt"
}

ROWS = 15

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("market")

router = APIRouter(prefix="/market", tags=["market"])

# ======================================================
# DB SAFE
# ======================================================

@contextmanager
def get_db():
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

# ======================================================
# GLOBAL STATE
# ======================================================

ORDER_BOOKS = defaultdict(lambda: {"buy": [], "sell": []})
TRADES = defaultdict(lambda: deque(maxlen=500))
MARKET_PRICES = {}
LOCK = Lock()

# ======================================================
# PRICE ENGINE
# ======================================================

def compute_bx_price(quote: str, quote_price_usdt: float):
    if quote_price_usdt <= 0:
        return

    with LOCK:
        bx_price = BX_REFERENCE_PRICE / quote_price_usdt
        pair = f"BX/{quote}"
        MARKET_PRICES[pair] = bx_price
        generate_order_book(pair, bx_price)
        store_price(pair, bx_price)

    logger.info(f"{pair} Updated: {bx_price:.6f}")

def generate_order_book(pair: str, price: float):
    bids = []
    asks = []

    for i in range(ROWS):
        bids.append(round(price - i * price * 0.0005, 6))
        asks.append(round(price + i * price * 0.0005, 6))

    ORDER_BOOKS[pair]["buy"] = bids
    ORDER_BOOKS[pair]["sell"] = asks

def store_price(pair: str, price: float):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO market_prices(pair, price, ts) VALUES (?,?,?)",
            (pair, price, int(time.time()))
        )

# ======================================================
# BINANCE STREAM (MULTI SYMBOL)
# ======================================================

async def stream_symbol(quote: str):

    symbol = BINANCE_SYMBOLS.get(quote)
    if not symbol:
        return

    uri = f"wss://stream.binance.com:9443/ws/{symbol}@miniTicker"

    while True:
        try:
            async with websockets.connect(uri) as ws:
                logger.info(f"Connected: {symbol}")
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    price = float(data["c"])
                    compute_bx_price(quote, price)
        except Exception as e:
            logger.error(f"{symbol} error: {e}")
            await asyncio.sleep(5)

# ======================================================
# MATCH ENGINE (PAIR SAFE)
# ======================================================

def place_order(uid: int, pair: str, side: str, amount: float, price: float):

    if pair not in MARKET_PRICES:
        raise HTTPException(400, "PAIR_NOT_SUPPORTED")

    if side not in ("buy", "sell"):
        raise HTTPException(400, "INVALID_SIDE")

    if amount <= 0 or price <= 0:
        raise HTTPException(400, "INVALID_ORDER")

    order = {
        "uid": uid,
        "side": side,
        "amount": amount,
        "price": price,
        "remaining": amount,
        "ts": int(time.time())
    }

    with LOCK:
        ORDER_BOOKS[pair][side].append(order)

    match_orders(pair)

def match_orders(pair: str):
    with LOCK:
        buys = ORDER_BOOKS[pair]["buy"]
        sells = ORDER_BOOKS[pair]["sell"]

        buys.sort(key=lambda o: o["price"], reverse=True)
        sells.sort(key=lambda o: o["price"])

        while buys and sells:
            buy = buys[0]
            sell = sells[0]

            if buy["price"] < sell["price"]:
                break

            trade_price = sell["price"]
            trade_amount = min(buy["remaining"], sell["remaining"])

            TRADES[pair].append({
                "price": trade_price,
                "amount": trade_amount,
                "ts": int(time.time())
            })

            buy["remaining"] -= trade_amount
            sell["remaining"] -= trade_amount

            if buy["remaining"] <= 0:
                buys.pop(0)

            if sell["remaining"] <= 0:
                sells.pop(0)

# ======================================================
# API ENDPOINTS
# ======================================================

@router.get("/pairs")
def get_pairs():
    return list(MARKET_PRICES.keys())

@router.get("/price/{pair}")
def get_price(pair: str):
    return {"pair": pair, "price": MARKET_PRICES.get(pair)}

@router.get("/orderbook/{pair}")
def get_orderbook(pair: str):
    return ORDER_BOOKS[pair]

@router.get("/recent/{pair}")
def get_recent(pair: str):
    return list(TRADES[pair])

# ======================================================
# START STREAMS
# ======================================================

def start_market_stream():
    loop = asyncio.get_event_loop()
    for quote in SUPPORTED_QUOTES:
        loop.create_task(stream_symbol(quote))
