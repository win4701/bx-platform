import time
import os
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException, Depends
from key import api_guard
from pricing import get_price
import psycopg2
from psycopg2 import pool

# ======================================================
# ROUTER
# ======================================================
router = APIRouter(dependencies=[Depends(api_guard)])

# ======================================================
# CONFIG
# ======================================================
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    raise RuntimeError("DATABASE_URL is not set")

BX_BASE_PRICE_USDT = 5.0
MAX_DEMAND_PREMIUM = 0.20

ALLOWED_ASSETS = {"usdt", "ton", "sol", "btc", "eth", "bnb"}

# ======================================================
# SPREADS (ENV DRIVEN)
# ======================================================
SPREADS = {
    asset: {
        "buy": float(os.getenv(f"BX_BUY_SPREAD_{asset.upper()}", 0)),
        "sell": float(os.getenv(f"BX_SELL_SPREAD_{asset.upper()}", 0)),
    }
    for asset in ALLOWED_ASSETS
}

# ======================================================
# DB POOL (SAFE)
# ======================================================
db_pool = pool.SimpleConnectionPool(1, 20, dsn=DB_URL)

@contextmanager
def get_db():
    conn = db_pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        db_pool.putconn(conn)

# ======================================================
# DEMAND-BASED PREMIUM (LAST 1H)
# ======================================================
def demand_premium() -> float:
    with get_db() as conn:
        with conn.cursor() as c:
            c.execute(
                """
                SELECT
                    COALESCE(SUM(CASE WHEN action='market_buy' THEN amount END),0),
                    COALESCE(SUM(CASE WHEN action='market_sell' THEN amount END),0)
                FROM history
                WHERE ts > extract(epoch from now()) - 3600
                """
            )
            buy, sell = c.fetchone()

    net = max(buy - sell, 0)
    premium = net / 20000
    return min(premium, MAX_DEMAND_PREMIUM)

def bx_price_usdt() -> float:
    return BX_BASE_PRICE_USDT * (1 + demand_premium())

# ======================================================
# QUOTE
# ======================================================
@router.post("/quote")
def quote(asset: str, side: str, amount: float):
    asset = asset.lower()

    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")
    if side not in ("buy", "sell"):
        raise HTTPException(400, "INVALID_SIDE")
    if amount <= 0:
        raise HTTPException(400, "INVALID_AMOUNT")

    asset_usdt = 1 if asset == "usdt" else get_price(asset)
    if not asset_usdt or asset_usdt <= 0:
        raise HTTPException(400, "PRICE_UNAVAILABLE")

    bx_usdt = bx_price_usdt()
    raw_price = bx_usdt / float(asset_usdt)

    spread = SPREADS[asset][side]
    price = raw_price * (1 + spread if side == "buy" else 1 - spread)

    return {
        "pair": f"BX/{asset.upper()}",
        "side": side,
        "price": round(price, 8),
        "amount": amount,
        "total": round(price * amount, 8),
        "bx_usdt": round(bx_usdt, 4),
        "spread": spread,
        "ts": int(time.time())
    }

# ======================================================
# EXECUTE TRADE (ATOMIC)
# ======================================================
@router.post("/execute")
def execute(payload: dict):
    uid = int(payload.get("uid", 0))
    asset = payload.get("asset", "").lower()
    side = payload.get("side")
    amount = float(payload.get("amount", 0))

    if uid <= 0 or asset not in ALLOWED_ASSETS or side not in ("buy", "sell") or amount <= 0:
        raise HTTPException(400, "INVALID_PARAMETERS")

    q = quote(asset, side, amount)

    with get_db() as conn:
        with conn.cursor() as c:
            ts = int(time.time())

            if side == "buy":
                c.execute(
                    f"""
                    UPDATE wallets
                    SET {asset}={asset}-%s, bx=bx+%s
                    WHERE uid=%s AND {asset}>=%s
                    """,
                    (amount, q["total"], uid, amount)
                )
                action = "market_buy"
            else:
                c.execute(
                    f"""
                    UPDATE wallets
                    SET bx=bx-%s, {asset}={asset}+%s
                    WHERE uid=%s AND bx>=%s
                    """,
                    (amount, q["total"], uid, amount)
                )
                action = "market_sell"

            if c.rowcount == 0:
                raise HTTPException(400, "INSUFFICIENT_BALANCE")

            c.execute(
                """
                INSERT INTO history(uid, action, asset, amount, price, ts)
                VALUES (%s,%s,%s,%s,%s,%s)
                """,
                (uid, action, asset, amount, q["price"], ts)
            )

    return {"status": "filled", **q}

# ======================================================
# CHART (BX / BNB)
# ======================================================
@router.get("/chart/bx_bnb")
def chart_bx_bnb(limit: int = 100):
    with get_db() as conn:
        with conn.cursor() as c:
            c.execute(
                """
                SELECT price, ts
                FROM history
                WHERE asset='bnb'
                  AND action IN ('market_buy','market_sell')
                ORDER BY ts DESC
                LIMIT %s
                """,
                (limit,)
            )
            rows = c.fetchall()

    return [
        {"price": float(price), "ts": int(ts)}
        for price, ts in reversed(rows)
    ]
