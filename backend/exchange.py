# ==========================================================
# BLOXIO EXCHANGE CORE ENGINE
# CEX + AMM + Liquidity + Arbitrage
# ==========================================================

import os
import time
import uuid
import random
import sqlite3

from collections import defaultdict, deque
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException

from market import MARKET_PRICES

DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")

router = APIRouter(prefix="/exchange", tags=["exchange"])

# ==========================================================
# CONFIG
# ==========================================================

SPREAD = 0.002
LIQ_LEVELS = 20
BOT_UID = 0
FEE = 0.002

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

ORDER_BOOK = defaultdict(lambda: {"buy": [], "sell": []})
TRADES = defaultdict(lambda: deque(maxlen=500))
OPEN_ORDERS = {}

# ==========================================================
# WALLET OPERATIONS
# ==========================================================

def debit_wallet(conn, uid, asset, amount, ref):

    cursor = conn.cursor()

    cursor.execute(
        f"""
        UPDATE wallets
        SET {asset}={asset}-?
        WHERE uid=? AND {asset}>=?
        """,
        (amount, uid, amount)
    )

    if cursor.rowcount == 0:
        raise HTTPException(400,"INSUFFICIENT_BALANCE")

    cursor.execute(
        """
        INSERT INTO history(uid,action,asset,amount,ref,ts)
        VALUES(?,?,?,?,?,?)
        """,
        (uid,"debit",asset,amount,ref,int(time.time()))
    )


def credit_wallet(conn, uid, asset, amount, ref):

    cursor = conn.cursor()

    cursor.execute(
        f"""
        UPDATE wallets
        SET {asset}={asset}+?
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
# LIQUIDITY ENGINE
# ==========================================================

def generate_liquidity(pair):

    price = MARKET_PRICES.get(pair)

    if not price:
        return

    bids = []
    asks = []

    for i in range(1,LIQ_LEVELS):

        bid = price * (1 - SPREAD*i)
        ask = price * (1 + SPREAD*i)

        amount = random.uniform(50,500)

        bids.append({
            "id":str(uuid.uuid4()),
            "uid":BOT_UID,
            "price":round(bid,8),
            "amount":amount,
            "remaining":amount,
            "ts":int(time.time())
        })

        asks.append({
            "id":str(uuid.uuid4()),
            "uid":BOT_UID,
            "price":round(ask,8),
            "amount":amount,
            "remaining":amount,
            "ts":int(time.time())
        })

    ORDER_BOOK[pair]["buy"]=bids
    ORDER_BOOK[pair]["sell"]=asks

# ==========================================================
# ORDERBOOK ENGINE
# ==========================================================

def place_order(uid,pair,side,price,amount):

    order_id=str(uuid.uuid4())

    order={
        "id":order_id,
        "uid":uid,
        "price":price,
        "amount":amount,
        "remaining":amount,
        "side":side,
        "pair":pair,
        "ts":int(time.time())
    }

    ORDER_BOOK[pair][side].append(order)
    OPEN_ORDERS[order_id]=order

    match_orders(pair)

    return order_id

# ==========================================================
# MATCH ENGINE
# ==========================================================

def match_orders(pair):

    buys=ORDER_BOOK[pair]["buy"]
    sells=ORDER_BOOK[pair]["sell"]

    buys.sort(key=lambda o:(-o["price"],o["ts"]))
    sells.sort(key=lambda o:(o["price"],o["ts"]))

    base,quote=pair.split("/")

    with db() as conn:

        while buys and sells:

            buy=buys[0]
            sell=sells[0]

            if buy["price"]<sell["price"]:
                break

            price=sell["price"]

            amount=min(buy["remaining"],sell["remaining"])

            value=price*amount

            credit_wallet(conn,buy["uid"],base.lower(),amount,"trade_buy")
            credit_wallet(conn,sell["uid"],quote.lower(),value,"trade_sell")

            TRADES[pair].append({
                "price":price,
                "amount":amount,
                "ts":int(time.time())
            })

            buy["remaining"]-=amount
            sell["remaining"]-=amount

            if buy["remaining"]<=0:
                buys.pop(0)

            if sell["remaining"]<=0:
                sells.pop(0)

# ==========================================================
# AMM SWAP ENGINE
# ==========================================================

POOLS={
    "BX/USDT":{"bx":100000,"usdt":4500000}
}

def amount_out(amount,reserve_in,reserve_out):

    amount=amount*(1-FEE)

    return (amount*reserve_out)/(reserve_in+amount)

# ==========================================================

@router.post("/swap")

def swap(uid:int,pair:str,side:str,amount:float):

    pool=POOLS.get(pair)

    if not pool:
        raise HTTPException(404,"pool not found")

    with db() as conn:

        if side=="buy":

            debit_wallet(conn,uid,"usdt",amount,"swap")

            bx=amount_out(amount,pool["usdt"],pool["bx"])

            pool["usdt"]+=amount
            pool["bx"]-=bx

            credit_wallet(conn,uid,"bx",bx,"swap")

            return {"bx":bx}

        else:

            debit_wallet(conn,uid,"bx",amount,"swap")

            usdt=amount_out(amount,pool["bx"],pool["usdt"])

            pool["bx"]+=amount
            pool["usdt"]-=usdt

            credit_wallet(conn,uid,"usdt",usdt,"swap")

            return {"usdt":usdt}

# ==========================================================
# ARBITRAGE ENGINE
# ==========================================================

def arbitrage(pair):

    price=MARKET_PRICES.get(pair)

    if not price:
        return

    book=ORDER_BOOK[pair]

    if not book["buy"] or not book["sell"]:
        return

    best_buy=book["buy"][0]["price"]
    best_sell=book["sell"][0]["price"]

    spread=best_sell-best_buy

    if spread>price*0.01:

        generate_liquidity(pair)

# ==========================================================
# API
# ==========================================================

@router.post("/order")

def create_order(uid:int,pair:str,side:str,price:float,amount:float):

    oid=place_order(uid,pair,side,price,amount)

    return {"order_id":oid}

# ==========================================================

@router.get("/orderbook/{pair}")

def orderbook(pair:str):

    if pair not in ORDER_BOOK:
        generate_liquidity(pair)

    return ORDER_BOOK[pair]

# ==========================================================

@router.get("/trades/{pair}")

def trades(pair:str):

    return list(TRADES[pair])
