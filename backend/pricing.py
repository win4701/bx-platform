import time
import sqlite3
from typing import Dict

DB_PATH = "db.sqlite"

# ======================================================
# DB
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

# ======================================================
# CONFIG
# ======================================================
# أقصى عمر مسموح للسعر الخارجي (ثوانٍ)
MAX_PRICE_AGE_SEC = 15

# أوزان المرجع الخارجي لحساب BX_ref
BX_REF_WEIGHTS = {
    "sol": 0.4,
    "ton": 0.2,
    "btc": 0.4
}

# حدود أمان سعر BX الداخلي
BX_REF_MIN_FACTOR = 0.6
BX_REF_MAX_FACTOR = 1.4

# قيمة أساس BX (اقتصاد داخلي)
BX_BASE_PRICE = 3.0

# معاملات الاقتصاد الداخلي
DEMAND_DIVISOR = 10_000.0
BURN_DIVISOR = 5_000.0
MINT_DIVISOR = 8_000.0

# ======================================================
# PRICE FETCH (FROM DB – FED BY FEEDER)
# ======================================================
def get_price(asset: str) -> float:
    """
    جلب سعر خارجي حي من جدول prices
    يرفض السعر القديم
    """
    c = db().cursor()
    row = c.execute(
        "SELECT price_usdt, updated_at FROM prices WHERE asset=?",
        (asset,)
    ).fetchone()

    if not row:
        raise ValueError("PRICE_NOT_AVAILABLE")

    price, updated_at = row
    if int(time.time()) - updated_at > MAX_PRICE_AGE_SEC:
        raise ValueError("STALE_PRICE")

    return float(price)

def get_all_prices() -> Dict[str, float]:
    """
    أسعار حيّة لكل الأصول (قد تُعيد None إذا السعر قديم)
    """
    c = db().cursor()
    rows = c.execute(
        "SELECT asset, price_usdt, updated_at FROM prices"
    ).fetchall()

    out = {}
    now = int(time.time())
    for asset, price, ts in rows:
        out[asset] = price if now - ts <= MAX_PRICE_AGE_SEC else None
    return out

# ======================================================
# PRICE RECORDING (FROM FEEDER)
# ======================================================
def record_price(asset: str, price_usdt: float):
    """
    تُستدعى من Price Feeder فقط
    """
    ts = int(time.time())
    c = db().cursor()

    c.execute(
        "INSERT OR REPLACE INTO prices(asset, price_usdt, updated_at) VALUES (?,?,?)",
        (asset, price_usdt, ts)
    )

    c.execute(
        "INSERT INTO price_history(asset, price_usdt, ts) VALUES (?,?,?)",
        (asset, price_usdt, ts)
    )

    c.connection.commit()

# ======================================================
# BX INTERNAL PRICING
# ======================================================
def get_bx_ref_price() -> float:
    """
    السعر المرجعي لـ BX (مرآة خارجية فقط)
    """
    sol = get_price("sol")
    ton = get_price("ton")
    btc = get_price("btc")

    bx_ref = (
        sol * BX_REF_WEIGHTS["sol"]
        + ton * BX_REF_WEIGHTS["ton"]
        + (btc / 1000.0) * BX_REF_WEIGHTS["btc"]
    )
    return bx_ref

def _internal_factors() -> Dict[str, float]:
    """
    عوامل الاقتصاد الداخلي
    (تُحسب من DB – حجم/حرق/سك)
    """
    c = db().cursor()

    # حجم السوق (آخر 24h)
    volume = c.execute(
        "SELECT SUM(amount) FROM history WHERE action LIKE 'market_%' AND ts > ?",
        (int(time.time()) - 86400,)
    ).fetchone()[0] or 0.0

    # الحرق (BX)
    burned = c.execute(
        "SELECT SUM(amount) FROM history WHERE action='burn' AND ts > ?",
        (int(time.time()) - 86400,)
    ).fetchone()[0] or 0.0

    # السك (Mining / Rewards)
    minted = c.execute(
        "SELECT SUM(amount) FROM history WHERE action IN ('mining','airdrop') AND ts > ?",
        (int(time.time()) - 86400,)
    ).fetchone()[0] or 0.0

    return {
        "demand": volume / DEMAND_DIVISOR,
        "burn": burned / BURN_DIVISOR,
        "mint": minted / MINT_DIVISOR,
    }

def get_bx_internal_price() -> float:
    """
    السعر الداخلي النهائي لـ BX
    """
    bx_ref = get_bx_ref_price()
    factors = _internal_factors()

    bx_internal = (
        BX_BASE_PRICE
        + factors["demand"]
        - factors["burn"]
        - factors["mint"]
    )

    # تطبيق نطاق الأمان
    min_price = bx_ref * BX_REF_MIN_FACTOR
    max_price = bx_ref * BX_REF_MAX_FACTOR

    bx_internal = max(min_price, min(max_price, bx_internal))
    return round(bx_internal, 6)

# ======================================================
# PUBLIC HELPERS (FOR API)
# ======================================================
def pricing_snapshot() -> Dict[str, float]:
    """
    Snapshot جاهز للواجهة
    """
    prices = get_all_prices()
    prices["bx"] = get_bx_internal_price()
    return prices
