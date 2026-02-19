import os
import time
import sqlite3
import json
import requests
from fastapi import APIRouter, HTTPException, WebSocket
from fastapi.responses import StreamingResponse
from key import api_guard, admin_guard
from collections import defaultdict

# ======================================================
# CONFIGURATION
# ======================================================
DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")

# Max withdrawal settings for USDT
MIN_WITHDRAW_USDT = 10.0
MAX_WITHDRAW_RATIO = 0.5        # 50% max withdrawal per transaction
MAX_WITHDRAW_MONTH = 15

ALLOWED_ASSETS = {"usdt", "usdc", "ton", "sol", "btc", "zec", "eth", "avax", "bnb", "ltc", "bx"}

# ======================================================
# DATABASE HELPERS (FLY SAFE)
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def get_cursor():
    conn = db()
    conn.row_factory = sqlite3.Row
    return conn.cursor(), conn

def close(conn):
    conn.commit()
    conn.close()

# ======================================================
# EXCHANGE FUNCTIONALITY
# ======================================================
ORDER_BOOKS = defaultdict(lambda: {"buy": [], "sell": []})
TRADES = defaultdict(lambda: deque(maxlen=500))

def generate_order_book():
    bids = []
    asks = []
    
    # Simulate a simple order book (real implementation would fetch this data from a market API)
    for i in range(15):
        bids.append({"price": round(45 - i * 0.5, 6), "amount": 100})
        asks.append({"price": round(45 + i * 0.5, 6), "amount": 100})
    
    ORDER_BOOKS["bx"]["buy"] = bids
    ORDER_BOOKS["bx"]["sell"] = asks

def place_order(uid: int, pair: str, side: str, price: float, amount: float):
    if amount <= 0 or price <= 0:
        raise ValueError("Invalid amount or price")
    
    with get_cursor() as conn:
        c = conn.cursor()
        
        # Handle wallet debit/credit
        if side == "buy":
            cost = price * amount
            debit_wallet(uid, "usdt", cost, f"exchange_buy:{pair}")
        elif side == "sell":
            debit_wallet(uid, "bx", amount, f"exchange_sell:{pair}")
        else:
            raise ValueError("Invalid order side")
        
        # Add order to order book
        order = {"uid": uid, "pair": pair, "side": side, "price": price, "amount": amount, "remaining": amount, "ts": int(time.time())}
        ORDER_BOOKS[pair][side].append(order)
        
        # Try to match orders
        match(pair)

def match(pair: str):
    buys = ORDER_BOOKS[pair]["buy"]
    sells = ORDER_BOOKS[pair]["sell"]
    
    # Sorting the order books
    buys.sort(key=lambda o: (-o["price"], o["ts"]))
    sells.sort(key=lambda o: (o["price"], o["ts"]))
    
    while buys and sells:
        buy = buys[0]
        sell = sells[0]
        
        if buy["price"] < sell["price"]:
            break
        
        trade_price = sell["price"]
        trade_amount = min(buy["remaining"], sell["remaining"])
        
        # Record the trade
        trade = {"pair": pair, "price": trade_price, "amount": trade_amount, "buy_uid": buy["uid"], "sell_uid": sell["uid"], "ts": int(time.time())}
        TRADES[pair].append(trade)
        
        buy["remaining"] -= trade_amount
        sell["remaining"] -= trade_amount
        
        # Remove filled orders
        if buy["remaining"] <= 0:
            buys.pop(0)
        if sell["remaining"] <= 0:
            sells.pop(0)

# ======================================================
# WALLET FUNCTIONALITY
# ======================================================

def debit_wallet(uid: int, asset: str, amount: float, ref: str):
    """
    Deducts the specified amount of an asset from the user's wallet
    """
    if amount <= 0:
        raise HTTPException(400, "Amount must be greater than 0")

    with get_cursor() as conn:
        c = conn.cursor()

        # Update the wallet
        c.execute(f"UPDATE wallets SET {asset} = {asset} - ? WHERE uid=?", (amount, uid))
        conn.commit()
    
    # Log the transaction to the history
    with get_cursor() as conn:
        c = conn.cursor()
        c.execute(
            "INSERT INTO history (uid, action, asset, amount, ref, ts) VALUES (?, ?, ?, ?, ?, ?)",
            (uid, "debit", asset, amount, ref, int(time.time()))
        )
        conn.commit()

def credit_wallet(uid: int, asset: str, amount: float, ref: str):
    """
    Credits the specified amount of an asset to the user's wallet
    """
    if amount <= 0:
        raise HTTPException(400, "Amount must be greater than 0")

    with get_cursor() as conn:
        c = conn.cursor()

        # Update the wallet
        c.execute(f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?", (amount, uid))
        conn.commit()

    # Log the transaction to the history
    with get_cursor() as conn:
        c = conn.cursor()
        c.execute(
            "INSERT INTO history (uid, action, asset, amount, ref, ts) VALUES (?, ?, ?, ?, ?, ?)",
            (uid, "credit", asset, amount, ref, int(time.time()))
        )
        conn.commit()

# ======================================================
# PHONE TOP-UP (EXTERNAL API INTEGRATION)
# ======================================================

TOPUP_API_URL = "https://topup-provider.com/api/topup"
API_KEY = "your_api_key_here"  # Replace with the actual API key for the top-up provider

def topup_phone(uid: int, country: str, phone_number: str, amount: float):
    """
    Handles a phone top-up by deducting funds from the user's wallet
    """
    if amount <= 0:
        raise HTTPException(400, "Amount must be greater than 0")

    with get_cursor() as conn:
        c = conn.cursor()

        # Check if user has enough USDT
        balance = c.execute("SELECT usdt FROM wallets WHERE uid=?", (uid,)).fetchone()
        if balance["usdt"] < amount:
            raise HTTPException(400, "Insufficient balance")

        # Deduct the amount from user's wallet
        debit_wallet(uid, "usdt", amount, f"topup_phone_{phone_number}")

        # Make the API call to the top-up provider
        payload = {'country': country, 'phone_number': phone_number, 'amount': amount, 'api_key': API_KEY}
        response = requests.post(TOPUP_API_URL, data=payload)

        if response.status_code == 200:
            # Store the successful top-up in the database
            c.execute(
                "INSERT INTO topups (uid, country, phone_number, amount, status, ts) VALUES (?, ?, ?, ?, ?, ?)",
                (uid, country, phone_number, amount, "success", int(time.time()))
            )
            conn.commit()
            return {"status": "success", "message": "Top-up successful"}
        else:
            # Log the failed top-up attempt
            c.execute(
                "INSERT INTO topups (uid, country, phone_number, amount, status, ts) VALUES (?, ?, ?, ?, ?, ?)",
                (uid, country, phone_number, amount, "failure", int(time.time()))
            )
            conn.commit()
            raise HTTPException(500, "Top-up failed")

# ======================================================
# EXCHANGE ENDPOINTS
# ======================================================
@router.post("/order")
def place_order_request(uid: int, pair: str, side: str, price: float, amount: float):
    """
    Places an order for exchange (buy/sell).
    """
    place_order(uid, pair, side, price, amount)
    return {"status": "order placed", "pair": pair, "side": side, "price": price, "amount": amount}

@router.get("/orderbook/{pair}")
def get_orderbook(pair: str):
    """
    Returns the current order book for the given pair.
    """
    return {
        "buy": ORDER_BOOKS[pair]["buy"],
        "sell": ORDER_BOOKS[pair]["sell"]
            }
