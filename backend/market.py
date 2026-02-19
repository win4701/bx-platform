import time
import threading
import websockets
import asyncio
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List
import json

# Global variables for price and order book
ORDER_BOOKS: Dict[str, Dict[str, List[dict]]] = defaultdict(lambda: {"buy": [], "sell": []})
TRADES: Dict[str, deque] = defaultdict(lambda: deque(maxlen=500))
MARKET_PRICE = 45.0  # Start with a reference price for BX/USDT
ROWS = 15  # Number of price levels to show

# Map of available quotes to their respective Binance symbols
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

# WebSocket placeholder for Binance
async def connect_binance(symbol="btcusdt"):
    uri = f"wss://stream.binance.com:9443/ws/{symbol}@miniTicker"
    async with websockets.connect(uri) as ws:
        while True:
            message = await ws.recv()
            data = json.loads(message)
            price = float(data['c'])  # Closing price from Binance
            if price:
                compute_bx_price(price)

# Function to compute BX price based on live price
def compute_bx_price(quote_price_usdt):
    global MARKET_PRICE
    if quote_price_usdt <= 0:
        raise HTTPException(400, "Invalid market price")
    # Logic to compute BX price
    MARKET_PRICE = 45 / quote_price_usdt
    update_price_ui()
    generate_order_book()
    render_order_book()

def update_price_ui():
    # Update the UI with the latest market price
    print(f"Market Price: {MARKET_PRICE:.6f}")

def generate_order_book():
    bids = []
    asks = []

    for i in range(ROWS):
        bids.append(f"{(MARKET_PRICE - i * MARKET_PRICE * 0.0005):.6f}")
        asks.append(f"{(MARKET_PRICE + i * MARKET_PRICE * 0.0005):.6f}")
    
    ORDER_BOOKS["bx"]["buy"] = bids
    ORDER_BOOKS["bx"]["sell"] = asks

def render_order_book():
    bids = ORDER_BOOKS["bx"]["buy"]
    asks = ORDER_BOOKS["bx"]["sell"]
    print("Bids:")
    for bid in bids:
        print(f"Bid: {bid}")
    print("Asks:")
    for ask in asks:
        print(f"Ask: {ask}")

# Place an order (buy/sell)
def place_order(uid: int, side: str, amount: float, price: float):
    if amount <= 0 or price <= 0:
        raise HTTPException(400, "Invalid amount or price")
    
    order = {"uid": uid, "side": side, "amount": amount, "price": price, "remaining": amount}
    ORDER_BOOKS["bx"][side].append(order)
    generate_order_book()

# Match orders (simplified)
def match_orders():
    buys = ORDER_BOOKS["bx"]["buy"]
    sells = ORDER_BOOKS["bx"]["sell"]
    
    while buys and sells:
        buy = buys[0]
        sell = sells[0]
        
        if float(buy) < float(sell):
            break  # No more matching
        
        trade_price = float(sell)  # Trade happens at the sell price
        trade_amount = min(float(buy), float(sell))
        
        trade = {
            "price": trade_price,
            "amount": trade_amount,
            "ts": int(time.time())
        }
        TRADES["bx"].append(trade)
        
        buys.pop(0)
        sells.pop(0)

# Execute a trade (buy/sell logic)
def execute_trade(uid: int, side: str, amount: float):
    if side == "buy":
        price = ORDER_BOOKS["bx"]["sell"][0]  # Best ask price
    else:
        price = ORDER_BOOKS["bx"]["buy"][0]  # Best bid price
    
    place_order(uid, side, amount, price)  # Place the order
    match_orders()  # Try to match orders

# Example execution
async def main():
    # Start WebSocket connection and execute a trade
    await connect_binance("btcusdt")
    execute_trade(uid=1, side="buy", amount=10)  # Simulate a buy order of 10 units

# Run the event loop for WebSocket and order execution
if __name__ == "__main__":
    asyncio.run(main())
