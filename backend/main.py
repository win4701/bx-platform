# ======================================================
# pricing.py
# Pricing & Reference Layer (Production)
# ======================================================

import time
import sqlite3
from typing import Dict, Optional

DB_PATH = "db.sqlite"

# ======================================================
# BX INTERNAL REFERENCE (OFFICIAL – FLOOR)
# ======================================================
BX_USDT_FLOOR = 2.0        # 1 BX = 2 USDT (minimum)
USDT_PER_BX = BX_USDT_FLOOR
BX_PER_USDT = 1 / BX_USDT_FLOOR

# ======================================================
# PRICE FEED RULES
# ======================================================
MAX_PRICE_AGE_SEC = 60     # reject prices older than 60s
SUPPORTED_ASSETS = {"usdt", "btc", "bnb", "sol", "ton"}

# ======================================================
# DB
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

# ======================================================
# EXTERNAL PRICE FEED (READ ONLY)
# ======================================================
def get_price(asset: str) -> Optional[float]:
    """
    Returns external asset price in USDT.
    Used only as reference (market / display).
    """
    asset = asset.lower()
    if asset not in SUPPORTED_ASSETS:
        return None

    if asset == "usdt":
        return 1.0

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
    Returns all valid external prices in USDT.
    """
    c = db().cursor()
    rows = c.execute(
        "SELECT asset, price_usdt, updated_at FROM prices"
    ).fetchall()

    now = int(time.time())
    out = {"usdt": 1.0}

    for asset, price, ts in rows:
        asset = asset.lower()
        if asset not in SUPPORTED_ASSETS:
            continue

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
    Convert USDT → BX (floor reference).
    """
    return round(usdt * BX_PER_USDT, 6)

def bx_to_usdt(bx: float) -> float:
    """
    Convert BX → USDT (floor reference).
    """
    return round(bx * USDT_PER_BX, 6)

def external_asset_to_bx(asset: str) -> Optional[float]:
    """
    Convert external asset price to BX via USDT.
    """
    price_usdt = get_price(asset)
    if price_usdt is None:
        return None
    return usdt_to_bx(price_usdt)

# ======================================================
# BX INTERNAL PRICE (FIXED FLOOR)
# ======================================================
def get_bx_floor_price() -> float:
    """
    Returns BX internal floor price in BX terms.
    Always 1 BX.
    """
    return 1.0

def get_bx_floor_price_usdt() -> float:
    """
    Returns BX internal floor price in USDT.
    Always 2.0 USDT.
    """
    return BX_USDT_FLOOR

# ======================================================
# SNAPSHOT FOR API / UI
# ======================================================
def pricing_snapshot() -> Dict:
    """
    Complete pricing snapshot for API/UI:
    - BX floor price
    - External prices (USDT)
    - Converted prices to BX (display only)
    """
    external = get_all_prices()

    return {
        "bx": {
            "floor_usdt": BX_USDT_FLOOR,
            "bx_per_usdt": BX_PER_USDT,
            "usdt_per_bx": USDT_PER_BX
        },
        "external_prices_usdt": external,
        "external_prices_bx": {
            asset: (
                usdt_to_bx(price)
                if price is not None
                else None
            )
            for asset, price in external.items()
        },
        "meta": {
            "max_price_age_sec": MAX_PRICE_AGE_SEC,
            "supported_assets": sorted(SUPPORTED_ASSETS)
        }
    }
