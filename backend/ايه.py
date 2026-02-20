import os
import time
import sqlite3
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException
from collections import defaultdict, deque

# ======================================================
# ROUTER (لا نكسر main.py)
# ======================================================
router = APIRouter(prefix="/exchange")

# ======================================================
# CONFIG
# ======================================================
DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")
ALLOWED_PAIRS = {"BX/USDT"}

# ======================================================
# DB (ATOMIC SAFE)
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
# IN-MEMORY ORDER BOOK
# ======================================================
ORDER_BOOKS = defaultdict(lambda: {"buy": [], "sell": []})
TRADES = defaultdict(lambda: deque(maxlen=500))

# ======================================================
# WALLET SAFE OPERATIONS
# ======================================================
def debit_wallet(conn, uid: int, asset: str, amount: float, ref: str):
    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    c = conn.cursor()

    # منع الرصيد السالب
    c.execute(
        f"""UPDATE wallets
            SET {asset} = {asset} - ?
            WHERE uid=? AND {asset} >= ?""",
        (amount, uid, amount)
    )

    if c.rowcount == 0:
        raise HTTPException(400, "INSUFFICIENT_BALANCE")

    c.execute(
        "INSERT INTO history(uid,action,asset,amount,ref,ts) VALUES (?,?,?,?,?,?)",
        (uid, "debit", asset, amount, ref, int(time.time()))
    )

def credit_wallet(conn, uid: int, asset: str, amount: float, ref: str):
    if amount <= 0:
        return

    c = conn.cursor()
    c.execute(
        f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
        (amount, uid)
    )

    c.execute(
        "INSERT INTO history(uid,action,asset,amount,ref,ts) VALUES (?,?,?,?,?,?)",
        (uid, "credit", asset, amount, ref, int(time.time()))
    )

# ======================================================
# PLACE ORDER (لا نكسر signature)
# ======================================================
def place_order(uid: int, pair: str, side: str, price: float, amount: float):

    if pair not in ALLOWED_PAIRS:
        raise HTTPException(400, "PAIR_NOT_SUPPORTED")

    if side not in ("buy", "sell"):
        raise HTTPException(400, "INVALID_SIDE")

    if price <= 0 or amount <= 0:
        raise HTTPException(400, "INVALID_ORDER")

    base, quote = pair.split("/")

    with get_db() as conn:

        # ===== LOCK FUNDS =====
        if side == "buy":
            cost = price * amount
            debit_wallet(conn, uid, quote.lower(), cost, f"order_lock:{pair}")
        else:
            debit_wallet(conn, uid, base.lower(), amount, f"order_lock:{pair}")

        order = {
            "uid": uid,
            "price": price,
            "amount": amount,
            "remaining": amount,
            "ts": int(time.time())
        }

        ORDER_BOOKS[pair][side].append(order)

        match_orders(conn, pair)

# ======================================================
# MATCH ENGINE (تصحيح كامل)
# ======================================================
def match_orders(conn, pair: str):

    buys = ORDER_BOOKS[pair]["buy"]
    sells = ORDER_BOOKS[pair]["sell"]

    buys.sort(key=lambda o: (-o["price"], o["ts"]))
    sells.sort(key=lambda o: (o["price"], o["ts"]))

    base, quote = pair.split("/")

    while buys and sells:

        buy = buys[0]
        sell = sells[0]

        if buy["price"] < sell["price"]:
            break

        trade_price = sell["price"]
        trade_amount = min(buy["remaining"], sell["remaining"])
        trade_value = trade_price * trade_amount

        # ===== TRANSFER FUNDS =====
        credit_wallet(conn, buy["uid"], base.lower(), trade_amount, "trade_buy")
        credit_wallet(conn, sell["uid"], quote.lower(), trade_value, "trade_sell")

        TRADES[pair].append({
            "price": trade_price,
            "amount": trade_amount,
            "buy_uid": buy["uid"],
            "sell_uid": sell["uid"],
            "ts": int(time.time())
        })

        buy["remaining"] -= trade_amount
        sell["remaining"] -= trade_amount

        if buy["remaining"] <= 0:
            buys.pop(0)

        if sell["remaining"] <= 0:
            sells.pop(0)
#======================================================
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
# ENDPOINTS (نفس القديمة بدون كسر)
# ======================================================
@router.post("/order")
def place_order_request(uid: int, pair: str, side: str, price: float, amount: float):
    place_order(uid, pair, side, price, amount)
    return {"status": "order placed"}

@router.get("/orderbook/{pair}")
def get_orderbook(pair: str):
    return ORDER_BOOKS[pair]

@router.get("/trades/{pair}")
def get_trades(pair: str):
    return list(TRADES[pair])
