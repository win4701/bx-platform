import time
import os
from fastapi import APIRouter, HTTPException, Depends
from key import api_guard
from pricing import get_price  # returns price in USDT
import psycopg2
from psycopg2 import pool

router = APIRouter(dependencies=[Depends(api_guard)])

# ======================================================
# CONFIG
# ======================================================
BX_BASE_PRICE_USDT = 2.0               # FLOOR PRICE
MAX_DEMAND_PREMIUM = 0.50              # +50% max
DB_URL = os.getenv("DATABASE_URL")

ALLOWED_ASSETS = {"usdt", "ton", "sol", "btc", "eth", "bnb"}

# ======================================================
# SPREADS (ENV)
# ======================================================
SPREADS = {
    "usdt": {
        "buy":  float(os.getenv("BX_BUY_SPREAD_USDT", 0)),
        "sell": float(os.getenv("BX_SELL_SPREAD_USDT", 0)),
    },
    "ton": {
        "buy":  float(os.getenv("BX_BUY_SPREAD_TON", 0)),
        "sell": float(os.getenv("BX_SELL_SPREAD_TON", 0)),
    },
    "sol": {
        "buy":  float(os.getenv("BX_BUY_SPREAD_SOL", 0)),
        "sell": float(os.getenv("BX_SELL_SPREAD_SOL", 0)),
    },
    "btc": {
        "buy":  float(os.getenv("BX_BUY_SPREAD_BTC", 0)),
        "sell": float(os.getenv("BX_SELL_SPREAD_BTC", 0)),
    },
 "eth": {
        "buy":  float(os.getenv("BX_BUY_SPREAD_ETH", 0)),
        "sell": float(os.getenv("BX_SELL_SPREAD_ETH", 0)),
    },
    "bnb": {
        "buy":  float(os.getenv("BX_BUY_SPREAD_BNB", 0)),
        "sell": float(os.getenv("BX_SELL_SPREAD_BNB", 0)),
    },
}

# ======================================================
# DB
# ======================================================
db_pool = psycopg2.pool.SimpleConnectionPool(1, 20, DB_URL)

def db():
    return db_pool.getconn()

def release_db_connection(conn):
    db_pool.putconn(conn)

# ======================================================
# DEMAND-BASED PRICE (BX)
# ======================================================
def demand_premium():
    """
    Increase price based on net buy demand (last 1h)
    """
    conn = db()
    try:
        with conn.cursor() as c:
            buy = c.execute(
                """SELECT COALESCE(SUM(amount),0)
                   FROM history
                   WHERE action='market_buy'
                   AND ts > extract(epoch from now()) - 3600"""
            ).fetchone()[0]

            sell = c.execute(
                """SELECT COALESCE(SUM(amount),0)
                   FROM history
                   WHERE action='market_sell'
                   AND ts > extract(epoch from now()) - 3600"""
            ).fetchone()[0]

        net = max(buy - sell, 0)
        premium = net / 10000  # Every 10k BX = +1% increase
        return min(premium, MAX_DEMAND_PREMIUM)
    finally:
        release_db_connection(conn)

def bx_price_usdt():
    try:
        return BX_BASE_PRICE_USDT * (1 + demand_premium())
    except Exception as e:
        raise HTTPException(500, f"Error calculating BX price: {str(e)}")

# ======================================================
# QUOTE
# ======================================================
@router.post("/quote")
def quote(asset: str, side: str, amount: float):
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")
    if side not in ("buy", "sell"):
        raise HTTPException(400, "INVALID_SIDE")
    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    asset_usdt = get_price(asset) if asset != "usdt" else 1
    if asset_usdt is None:
        raise HTTPException(400, "PRICE_UNAVAILABLE")

    bx_usdt = bx_price_usdt()
    raw_price = bx_usdt / asset_usdt

    spread = SPREADS.get(asset, {}).get(side, 0)
    if spread is None:
        raise HTTPException(400, "SPREAD_NOT_DEFINED")

    price = raw_price * (1 + spread if side == "buy" else 1 - spread)

    return {
        "pair": f"BX/{asset.upper()}",
        "side": side,
        "price": round(price, 8),
        "amount": amount,
        "total": round(price * amount, 8),
        "bx_usdt": round(bx_usdt, 4),
        "spread": spread,
    }

# ======================================================
# EXECUTE
# ======================================================
@router.post("/execute")
def execute(payload: dict):
    try:
        uid = int(payload.get("uid", 0))
        asset = payload.get("asset")
        side = payload.get("side")
        amount = float(payload.get("amount", 0))

        if uid <= 0 or asset not in ALLOWED_ASSETS or side not in ("buy", "sell") or amount <= 0:
            raise HTTPException(400, "Invalid parameters")

        q = quote(asset, side, amount)
        total = q["total"]
        price = q["price"]

        # تحديث المحفظة
        conn = db()
        try:
            with conn.cursor() as c:
                ts = int(time.time())

                if side == "buy":
                    c.execute(
                        f"UPDATE wallets SET {asset}={asset}-%s, bx=bx+%s WHERE uid=%s",
                        (amount, total, uid)
                    )
                    action = "market_buy"
                else:
                    c.execute(
                        f"UPDATE wallets SET bx=bx-%s, {asset}={asset}+%s WHERE uid=%s",
                        (amount, total, uid)
                    )
                    action = "market_sell"

                # history (used for chart + demand)
                c.execute(
                    """INSERT INTO history(uid, action, asset, amount, price, ts)
                       VALUES (%s,%s,%s,%s,%s,%s)""",
                    (uid, action, asset, amount, price, ts)
                )

                conn.commit()
        finally:
            release_db_connection(conn)

        return {"status": "filled", **q}

    except Exception as e:
        raise HTTPException(500, f"Error executing the transaction: {str(e)}")

# ======================================================
# REAL CHART (BX / BNB)
# ======================================================
@router.get("/chart/bx_bnb")
def chart_bx_bnb(limit: int = 100):
    conn = db()
    try:
        with conn.cursor() as c:
            rows = c.execute(
                """SELECT price, ts
                   FROM history
                   WHERE asset='bnb'
                   AND action IN ('market_buy', 'market_sell')
                   ORDER BY ts DESC
                   LIMIT %s""",
                (limit,)
            ).fetchall()

            return [
                {"price": float(p), "ts": int(t)}
                for p, t in reversed(rows)
            ]
    finally:
        release_db_connection(conn)
