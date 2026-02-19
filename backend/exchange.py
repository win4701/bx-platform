import time
import threading
import json
import websockets
import asyncio
from collections import defaultdict, deque
from typing import Dict, List

from finance import debit_wallet
import requests
from flask import jsonify
from db import get_db  # Assuming the get_db function is available for DB connection

# ======================================================
# DATA STRUCTURES (IN-MEMORY — FAST)
# ======================================================

ORDER_BOOKS: Dict[str, Dict[str, List[dict]]] = defaultdict(
    lambda: {"buy": [], "sell": []}
)

TRADES: Dict[str, deque] = defaultdict(lambda: deque(maxlen=500))

LOCK = threading.Lock()

# ======================================================
# MARKET PRICE HANDLING (MIMIC BINANCE WS)
# ======================================================

quote_map = {
    "USDT": "btcusdt",
    "USDC": "btcusdt",
    "BTC": "btcusdt",
    "ETH": "ethusdt",
    "BNB": "bnbusdt",
    "SOL": "solusdt",
    "AVAX": "avaxusdt",
    "LTC": "ltcusdt",
    "ZEC": "zecusdt",
    "TON": "tonusdt"
}

market_price = 45.0  # Starting price for BX/USDT
current_quote = "USDT"
quote_price_usdt = 1.0  # Start with USDT

# WebSocket to fetch live prices from Binance
async def connect_binance(symbol="btcusdt"):
    uri = f"wss://stream.binance.com:9443/ws/{symbol}@miniTicker"
    async with websockets.connect(uri) as ws:
        while True:
            message = await ws.recv()
            data = json.loads(message)
            price = float(data['c'])  # Closing price from Binance
            if price:
                compute_bx_price(price)

# Function to compute BX price
def compute_bx_price(quote_price_usdt):
    global market_price
    if quote_price_usdt <= 0:
        raise ValueError("Invalid price")
    market_price = 45 / quote_price_usdt
    update_price_ui()
    generate_order_book()

# ======================================================
# ORDER BOOK MANAGEMENT
# ======================================================

def generate_order_book():
    bids = []
    asks = []

    # Generate bids and asks dynamically
    for i in range(15):
        bids.append({"price": round(market_price - i * market_price * 0.0005, 6), "amount": 100})  # Example amount
        asks.append({"price": round(market_price + i * market_price * 0.0005, 6), "amount": 100})  # Example amount

    ORDER_BOOKS["bx"]["buy"] = bids
    ORDER_BOOKS["bx"]["sell"] = asks

def sort_books(pair: str):
    # Sorting the books based on price and timestamp
    ORDER_BOOKS[pair]["buy"].sort(key=lambda o: (-o["price"], o["ts"]))
    ORDER_BOOKS[pair]["sell"].sort(key=lambda o: (o["price"], o["ts"]))

# ======================================================
# PLACE ORDER (CORE FUNCTION)
# ======================================================

def place_order(uid: int, pair: str, side: str, price: float, amount: float):
    if amount <= 0 or price <= 0:
        raise ValueError("Invalid amount or price")

    base, quote = pair.lower().split("/")

    # Locking for atomic operations
    with LOCK:
        # Handle debit logic (fetching balance and updating)
        if side == "buy":
            cost = price * amount
            debit_wallet(uid=uid, asset=quote, amount=cost, ref=f"exchange_buy:{pair}")
        elif side == "sell":
            debit_wallet(uid=uid, asset=base, amount=amount, ref=f"exchange_sell:{pair}")
        else:
            raise ValueError("Invalid side")

        # Add order to the order book
        order = {
            "uid": uid,
            "pair": pair,
            "side": side,
            "price": price,
            "amount": amount,
            "remaining": amount,
            "ts": int(time.time())
        }
        ORDER_BOOKS[pair][side].append(order)

        # Try to match orders
        match(pair)

# ======================================================
# MATCHING ENGINE
# ======================================================

def match(pair: str):
    buys = ORDER_BOOKS[pair]["buy"]
    sells = ORDER_BOOKS[pair]["sell"]

    sort_books(pair)

    while buys and sells:
        buy = buys[0]
        sell = sells[0]

        if buy["price"] < sell["price"]:
            break

        trade_price = sell["price"]
        trade_amount = min(buy["remaining"], sell["remaining"])

        # Record the trade
        trade = {
            "pair": pair,
            "price": trade_price,
            "amount": trade_amount,
            "buy_uid": buy["uid"],
            "sell_uid": sell["uid"],
            "ts": int(time.time())
        }
        TRADES[pair].append(trade)

        # Update remaining amounts
        buy["remaining"] -= trade_amount
        sell["remaining"] -= trade_amount

        # Remove filled orders
        if buy["remaining"] <= 0:
            buys.pop(0)

        if sell["remaining"] <= 0:
            sells.pop(0)

# ======================================================
# API ENDPOINTS (SNAPSHOTS, QUOTES, EXECUTION)
# ======================================================

def order_book_snapshot(pair: str):
    return {
        "buy": [{"price": o["price"], "amount": o["remaining"]} for o in ORDER_BOOKS[pair]["buy"][:20]],
        "sell": [{"price": o["price"], "amount": o["remaining"]} for o in ORDER_BOOKS[pair]["sell"][:20]]
    }

def trades_snapshot(pair: str, limit: int = 50):
    return list(TRADES[pair])[-limit:]

# ======================================================
# RESET ORDER BOOK (ADMIN / TEST ONLY)
# ======================================================

def reset_pair(pair: str):
    with LOCK:
        ORDER_BOOKS[pair]["buy"].clear()
        ORDER_BOOKS[pair]["sell"].clear()
        TRADES[pair].clear()

# ======================================================
# EXTERNAL API FOR TOP-UP (SIMULATION)
# ======================================================

TOPUP_API_URL = "https://topup-provider.com/api/topup"
API_KEY = "your_api_key_here"

def topup_phone(country, phone_number, amount):
    if not country or not phone_number or not amount:
        return jsonify({'error': 'Missing required parameters'}), 400

    payload = {'country': country, 'phone_number': phone_number, 'amount': amount, 'api_key': API_KEY}
    try:
        response = requests.post(TOPUP_API_URL, data=payload)
        if response.status_code == 200:
            topup_response = response.json()
            store_topup_in_db(country, phone_number, amount, "Success")
            return jsonify({'success': 'Top-up successful', 'data': topup_response}), 200
        else:
            return jsonify({'error': 'Top-up failed', 'message': response.text}), 500
    except requests.exceptions.RequestException as e:
        return jsonify({'error': 'Request failed', 'message': str(e)}), 500

# Store top-up info in the database
def store_topup_in_db(country, phone_number, amount, status):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("INSERT INTO topups (country, phone_number, amount, status) VALUES (?, ?, ?, ?)", (country, phone_number, amount, status))
    db.commit()
