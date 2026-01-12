import time
import sqlite3
from typing import Dict, Optional

DB_PATH = "db.sqlite"

# ======================================================
# FIXED INTERNAL REFERENCE (OFFICIAL)
# ======================================================
BX_PER_USDT = 0.5        # 1 USDT = 0.5 BX
USDT_PER_BX = 2.0        # 1 BX   = 2 USDT

# ======================================================
# PRICE FEED RULES
# ======================================================
MAX_PRICE_AGE_SEC = 60   # نرفض أي سعر خارجي أقدم من دقيقة

# ======================================================
# DB
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

# ======================================================
# EXTERNAL PRICES (READ ONLY)
# ======================================================
def get_price(asset: str) -> Optional[float]:
    """
    يجلب السعر الخارجي الحقيقي للأصل (USDT)
    - يُستخدم للحسابات المرجعية فقط
    - لا يغيّر سعر BX
    """
    c = db().cursor()
    row = c.execute(
        "SELECT price_usdt, updated_at FROM prices WHERE asset=?",
        (asset,)
    ).fetchone()

    if not row:
        return None

    price, ts = row
    if int(time.time()) - ts > MAX_PRICE_AGE_SEC:
        return None

    return float(price)

def get_all_prices() -> Dict[str, Optional[float]]:
    """
    يعيد جميع الأسعار الخارجية الصالحة
    """
    c = db().cursor()
    rows = c.execute(
        "SELECT asset, price_usdt, updated_at FROM prices"
    ).fetchall()

    out = {}
    now = int(time.time())
    for asset, price, ts in rows:
        out[asset] = (
            float(price)
            if now - ts <= MAX_PRICE_AGE_SEC
            else None
        )
    return out

# ======================================================
# CONVERSIONS (REFERENCE ONLY)
# ======================================================
def usdt_to_bx(usdt: float) -> float:
    """
    تحويل قياسي: USDT → BX
    """
    return round(usdt * BX_PER_USDT, 6)

def bx_to_usdt(bx: float) -> float:
    """
    تحويل قياسي: BX → USDT
    """
    return round(bx * USDT_PER_BX, 6)

def external_asset_to_bx(asset: str) -> Optional[float]:
    """
    تحويل سعر أصل خارجي (BTC / SOL / TON) إلى BX
    عبر USDT فقط
    """
    price_usdt = get_price(asset)
    if price_usdt is None:
        return None
    return usdt_to_bx(price_usdt)

# ======================================================
# INTERNAL MARKET PRICE (FIXED)
# ======================================================
def get_bx_internal_price() -> float:
    """
    السعر الداخلي لـ BX
    - ثابت
    - غير مرتبط بتقلّبات الخارج
    """
    return BX_PER_USDT

# ======================================================
# SNAPSHOT FOR API / UI
# ======================================================
def pricing_snapshot() -> Dict:
    """
    Snapshot كامل للأسعار:
    - BX (ثابت)
    - أسعار خارجية (USDT)
    - تحويلها إلى BX للعرض فقط
    """
    prices = get_all_prices()

    return {
        "reference": {
            "usdt_to_bx": BX_PER_USDT,
            "bx_to_usdt": USDT_PER_BX
        },
        "bx_internal_price": BX_PER_USDT,
        "external_prices_usdt": prices,
        "external_prices_bx": {
            asset: (
                usdt_to_bx(price)
                if price is not None
                else None
            )
            for asset, price in prices.items()
        }
    }
