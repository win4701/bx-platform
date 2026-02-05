# backend/exchange.py
from collections import defaultdict
import time
from finance import ledger
from finance import get_db  # نفس DB و Pool

# ======================================================
# STATE (IN-MEMORY ORDER BOOK)
# ======================================================
ORDER_BOOKS = defaultdict(lambda: {"bids": [], "asks": []})
TRADES = defaultdict(list)

# ======================================================
# PLACE LIMIT ORDER
# ======================================================
def place_order(uid: int, pair: str, side: str, price: float, amount: float):
    base, quote = pair.lower().split("/")

    order = {
        "uid": uid,
        "price": price,
        "amount": amount,
        "ts": int(time.time())
    }

    book = ORDER_BOOKS[pair]

    if side == "buy":
        book["bids"].append(order)
        book["bids"].sort(key=lambda x: -x["price"])
    else:
        book["asks"].append(order)
        book["asks"].sort(key=lambda x: x["price"])

    match(pair)

# ======================================================
# MATCHING ENGINE
# ======================================================
def match(pair: str):
    book = ORDER_BOOKS[pair]
    base, quote = pair.lower().split("/")

    while book["bids"] and book["asks"]:
        bid = book["bids"][0]
        ask = book["asks"][0]

        if bid["price"] < ask["price"]:
            break

        qty = min(bid["amount"], ask["amount"])
        price = ask["price"]
        ts = int(time.time())

        # ================= WALLET UPDATE =================
        with get_db() as conn:
            c = conn.cursor()

            # BUYER
            c.execute(
                f"""
                UPDATE wallets
                SET {quote} = {quote} - %s,
                    {base}  = {base}  + %s
                WHERE uid=%s AND {quote} >= %s
                """,
                (qty * price, qty, bid["uid"], qty * price)
            )

            # SELLER
            c.execute(
                f"""
                UPDATE wallets
                SET {base}  = {base}  - %s,
                    {quote} = {quote} + %s
                WHERE uid=%s AND {base} >= %s
                """,
                (qty, qty * price, ask["uid"], qty)
            )

            if c.rowcount == 0:
                break

        # ================= LEDGER =================
        ledger(
            f"trade:{pair}",
            f"user_{quote}",
            f"user_{base}",
            qty * price
        )

        # ================= TRADE =================
        TRADES[pair].append({
            "pair": pair,
            "price": price,
            "amount": qty,
            "time": ts
        })

        bid["amount"] -= qty
        ask["amount"] -= qty

        if bid["amount"] <= 0:
            book["bids"].pop(0)
        if ask["amount"] <= 0:
            book["asks"].pop(0)
