# ==========================================================
# BLOXIO EXCHANGE ENGINE v2
# Matching Engine • Wallet Settlement • Orders API
# ==========================================================

import os
import time
import uuid
import sqlite3

from collections import defaultdict, deque
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException

DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")

router = APIRouter(prefix="/exchange", tags=["exchange"])

# ==========================================================
# PAIRS
# ==========================================================

ALLOWED_PAIRS = {
    "BX/USDT",
    "BX/BTC",
    "BX/ETH",
    "BX/BNB",
    "BX/SOL",
    "BX/AVAX",
    "BX/LTC",
    "BX/ZEC",
    "BX/TON"
}

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
# MEMORY STATE
# ==========================================================

ORDER_BOOK = defaultdict(lambda: {
    "buy": [],
    "sell": []
})

TRADES = defaultdict(lambda: deque(maxlen=500))

OPEN_ORDERS = {}

# ==========================================================
# WALLET
# ==========================================================

def debit_wallet(conn, uid, asset, amount, ref):

    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    cursor = conn.cursor()

    cursor.execute(
        f"""
        UPDATE wallets
        SET {asset} = {asset} - ?
        WHERE uid=? AND {asset} >= ?
        """,
        (amount, uid, amount)
    )

    if cursor.rowcount == 0:
        raise HTTPException(400, "INSUFFICIENT_BALANCE")

    cursor.execute(
        """
        INSERT INTO history(uid,action,asset,amount,ref,ts)
        VALUES(?,?,?,?,?,?)
        """,
        (uid,"debit",asset,amount,ref,int(time.time()))
    )


def credit_wallet(conn, uid, asset, amount, ref):

    if amount <= 0:
        return

    cursor = conn.cursor()

    cursor.execute(
        f"""
        UPDATE wallets
        SET {asset} = {asset} + ?
        WHERE uid=?
        """,
        (amount, uid)
    )

    cursor.execute(
        """
        INSERT INTO history(uid,action,asset,amount,ref,ts)
        VALUES(?,?,?,?,?,?)
        """,
        (uid,"credit",asset,amount,ref,int(time.time()))
    )

# ==========================================================
# CREATE ORDER
# ==========================================================

def place_order(uid, pair, side, price, amount):

    if pair not in ALLOWED_PAIRS:
        raise HTTPException(400, "PAIR_NOT_SUPPORTED")

    if side not in ["buy","sell"]:
        raise HTTPException(400, "INVALID_SIDE")

    if price <= 0 or amount <= 0:
        raise HTTPException(400, "INVALID_ORDER")

    base, quote = pair.split("/")

    order_id = str(uuid.uuid4())

    with db() as conn:

        if side == "buy":

            cost = price * amount

            debit_wallet(conn,uid,quote.lower(),cost,f"order_lock:{pair}")

        else:

            debit_wallet(conn,uid,base.lower(),amount,f"order_lock:{pair}")

        order = {

            "id": order_id,
            "uid": uid,
            "price": price,
            "amount": amount,
            "remaining": amount,
            "side": side,
            "pair": pair,
            "ts": int(time.time())
        }

        ORDER_BOOK[pair][side].append(order)
        OPEN_ORDERS[order_id] = order

        match_orders(conn,pair)

    return order_id

# ==========================================================
# MATCH ENGINE
# ==========================================================

def match_orders(conn,pair):

    buys = ORDER_BOOK[pair]["buy"]
    sells = ORDER_BOOK[pair]["sell"]

    buys.sort(key=lambda o:(-o["price"],o["ts"]))
    sells.sort(key=lambda o:(o["price"],o["ts"]))

    base, quote = pair.split("/")

    while buys and sells:

        buy = buys[0]
        sell = sells[0]

        if buy["price"] < sell["price"]:
            break

        trade_price = sell["price"]

        trade_amount = min(
            buy["remaining"],
            sell["remaining"]
        )

        trade_value = trade_price * trade_amount

        credit_wallet(conn,buy["uid"],base.lower(),trade_amount,"trade_buy")

        credit_wallet(conn,sell["uid"],quote.lower(),trade_value,"trade_sell")

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
            OPEN_ORDERS.pop(buy["id"],None)

        if sell["remaining"] <= 0:
            sells.pop(0)
            OPEN_ORDERS.pop(sell["id"],None)

# ==========================================================
# CANCEL ORDER
# ==========================================================

def cancel_order(uid, order_id):

    order = OPEN_ORDERS.get(order_id)

    if not order:
        raise HTTPException(404,"ORDER_NOT_FOUND")

    if order["uid"] != uid:
        raise HTTPException(403,"NOT_OWNER")

    pair = order["pair"]
    side = order["side"]

    ORDER_BOOK[pair][side] = [
        o for o in ORDER_BOOK[pair][side] if o["id"] != order_id
    ]

    OPEN_ORDERS.pop(order_id,None)

    return True

# ==========================================================
# API
# ==========================================================

@router.post("/order")
def create_order(uid:int,pair:str,side:str,price:float,amount:float):

    order_id = place_order(uid,pair,side,price,amount)

    return {
        "status":"order placed",
        "order_id":order_id
    }


@router.post("/cancel")
def cancel(uid:int,order_id:str):

    cancel_order(uid,order_id)

    return {"status":"cancelled"}


@router.get("/orderbook/{pair}")
def orderbook(pair:str):

    return ORDER_BOOK[pair]


@router.get("/trades/{pair}")
def trades(pair:str):

    return list(TRADES[pair])


@router.get("/orders")
def orders():

    return list(OPEN_ORDERS.values())
