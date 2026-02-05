import time
import threading
from collections import defaultdict, deque
from typing import Dict, List

from finance import debit_wallet

# ======================================================
# DATA STRUCTURES (IN-MEMORY — FAST)
# ======================================================

ORDER_BOOKS: Dict[str, Dict[str, List[dict]]] = defaultdict(
    lambda: {"buy": [], "sell": []}
)

TRADES: Dict[str, deque] = defaultdict(lambda: deque(maxlen=500))

LOCK = threading.Lock()

# ======================================================
# HELPERS
# ======================================================

def now():
    return int(time.time())

def sort_books(pair: str):
    # Buy: highest price first
    ORDER_BOOKS[pair]["buy"].sort(key=lambda o: (-o["price"], o["ts"]))
    # Sell: lowest price first
    ORDER_BOOKS[pair]["sell"].sort(key=lambda o: (o["price"], o["ts"]))

# ======================================================
# PLACE ORDER (CORE ENTRY)
# ======================================================

def place_order(
    uid: int,
    pair: str,
    side: str,
    price: float,
    amount: float
):
    """
    side: buy | sell
    pair: BX/USDT
    """

    if amount <= 0 or price <= 0:
        raise ValueError("INVALID_AMOUNT_OR_PRICE")

    base, quote = pair.lower().split("/")

    # --------------------------------------------------
    # 🔒 ATOMIC SECTION
    # --------------------------------------------------
    with LOCK:
        # ----------------------------------------------
        # 💸 REAL BALANCE DEBIT (FINANCE = SOURCE OF TRUTH)
        # ----------------------------------------------
        if side == "buy":
            cost = price * amount
            debit_wallet(
                uid=uid,
                asset=quote,
                amount=cost,
                ref=f"exchange_buy:{pair}"
            )
        elif side == "sell":
            debit_wallet(
                uid=uid,
                asset=base,
                amount=amount,
                ref=f"exchange_sell:{pair}"
            )
        else:
            raise ValueError("INVALID_SIDE")

        # ----------------------------------------------
        # 📝 ADD ORDER
        # ----------------------------------------------
        order = {
            "uid": uid,
            "pair": pair,
            "side": side,
            "price": price,
            "amount": amount,
            "remaining": amount,
            "ts": now()
        }

        ORDER_BOOKS[pair][side].append(order)

        # ----------------------------------------------
        # ⚡ MATCH
        # ----------------------------------------------
        match(pair)

# ======================================================
# MATCHING ENGINE (SIMPLE & SAFE)
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

        # ----------------------------------------------
        # RECORD TRADE
        # ----------------------------------------------
        trade = {
            "pair": pair,
            "price": trade_price,
            "amount": trade_amount,
            "buy_uid": buy["uid"],
            "sell_uid": sell["uid"],
            "ts": now()
        }
        TRADES[pair].append(trade)

        # ----------------------------------------------
        # UPDATE REMAINING
        # ----------------------------------------------
        buy["remaining"] -= trade_amount
        sell["remaining"] -= trade_amount

        # ----------------------------------------------
        # CLEAN FILLED ORDERS
        # ----------------------------------------------
        if buy["remaining"] <= 0:
            buys.pop(0)

        if sell["remaining"] <= 0:
            sells.pop(0)

# ======================================================
# SNAPSHOTS (USED BY WS / API)
# ======================================================

def order_book_snapshot(pair: str):
    return {
        "buy": [
            {
                "price": o["price"],
                "amount": o["remaining"]
            }
            for o in ORDER_BOOKS[pair]["buy"][:20]
        ],
        "sell": [
            {
                "price": o["price"],
                "amount": o["remaining"]
            }
            for o in ORDER_BOOKS[pair]["sell"][:20]
        ]
    }

def trades_snapshot(pair: str, limit: int = 50):
    return list(TRADES[pair])[-limit:]

# ======================================================
# RESET (ADMIN / TEST ONLY)
# ======================================================

def reset_pair(pair: str):
    with LOCK:
        ORDER_BOOKS[pair]["buy"].clear()
        ORDER_BOOKS[pair]["sell"].clear()
        TRADES[pair].clear()
