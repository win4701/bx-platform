import time
import os
from contextlib import contextmanager
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
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

BX_BASE_PRICE_USDT = 12.0           # ✅ موحّد مع المشروع
MAX_DEMAND_PREMIUM = 0.20          # 20% كحد أقصى

ALLOWED_ASSETS = {"usdt", "ton", "sol", "btc", "eth", "avax", "ltc", "bnb"}

# ======================================================
# SPREADS (ENV DRIVEN)
# ======================================================
SPREADS = {
    asset: {
        "buy": float(os.getenv(f"BX_BUY_SPREAD_{asset.upper()}", 0.0)),
        "sell": float(os.getenv(f"BX_SELL_SPREAD_{asset.upper()}", 0.0)),
    }
    for asset in ALLOWED_ASSETS
}

# ======================================================
# DB POOL
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
# DEMAND PREMIUM (LAST 1H)
# ======================================================
def demand_premium() -> float:
    with get_db() as conn, conn.cursor() as c:
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
    return min(net / 20000, MAX_DEMAND_PREMIUM)

def bx_price_usdt() -> float:
    return BX_BASE_PRICE_USDT * (1 + demand_premium())

# ======================================================
# QUOTE (READ ONLY)
# ======================================================
class QuoteRequest(BaseModel):
    asset: str
    side: str
    amount: float = Field(gt=0)

@router.post("/quote")
def quote(req: QuoteRequest):
    asset = req.asset.lower()
    side = req.side

    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")
    if side not in ("buy", "sell"):
        raise HTTPException(400, "INVALID_SIDE")

    asset_usdt = 1.0 if asset == "usdt" else get_price(asset)
    if not asset_usdt or asset_usdt <= 0:
        raise HTTPException(400, "PRICE_UNAVAILABLE")

    bx_usdt = bx_price_usdt()
    raw_price = bx_usdt / asset_usdt

    spread = SPREADS[asset][side]
    price = raw_price * (1 + spread if side == "buy" else 1 - spread)

    return {
        "pair": f"BX/{asset.upper()}",
        "side": side,
        "price": round(price, 8),
        "amount": req.amount,
        "total": round(price * req.amount, 8),
        "bx_usdt": round(bx_usdt, 4),
        "spread": spread,
        "ts": int(time.time())
    }

# ======================================================
# EXECUTE (ATOMIC & SAFE)
# ======================================================
class ExecuteRequest(BaseModel):
    uid: int
    asset: str
    side: str
    amount: float = Field(gt=0)

@router.post("/execute")
def execute(req: ExecuteRequest):
    asset = req.asset.lower()
    side = req.side

    if asset not in ALLOWED_ASSETS or side not in ("buy", "sell"):
        raise HTTPException(400, "INVALID_PARAMETERS")

    q = quote(QuoteRequest(asset=asset, side=side, amount=req.amount))
    ts = int(time.time())

    with get_db() as conn, conn.cursor() as c:
        if side == "buy":
            c.execute(
                """
                UPDATE wallets
                SET usdt = usdt - %s,
                    bx   = bx   + %s
                WHERE uid=%s AND usdt >= %s
                """,
                (q["total"], req.amount, req.uid, q["total"])
            )
            action = "market_buy"
        else:
            c.execute(
                """
                UPDATE wallets
                SET bx   = bx   - %s,
                    usdt = usdt + %s
                WHERE uid=%s AND bx >= %s
                """,
                (req.amount, q["total"], req.uid, req.amount)
            )
            action = "market_sell"

        if c.rowcount == 0:
            raise HTTPException(400, "INSUFFICIENT_BALANCE")

        c.execute(
            """
            INSERT INTO history(uid, action, asset, amount, price, ts)
            VALUES (%s,%s,%s,%s,%s,%s)
            """,
            (req.uid, action, asset, req.amount, q["price"], ts)
        )

    return {"status": "filled", **q}

# ======================================================
# CHART (BX / BNB)
# ======================================================
@router.get("/chart/bx_bnb")
def chart_bx_bnb(limit: int = 100):
    with get_db() as conn, conn.cursor() as c:
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

    return [{"price": float(p), "ts": int(ts)} for p, ts in reversed(rows)]
