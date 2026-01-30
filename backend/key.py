import os
import sqlite3
import time
from decimal import Decimal
from typing import Dict, Optional
from datetime import datetime

# ======================================================
# CONFIGURATION
# ======================================================
DB_PATH = os.getenv("PRICES_DB_PATH", "db/prices.db")
MAX_PRICE_AGE_SEC = 60 * 60  # 1 hour

# Internal reference price (can be dynamic later)
BX_PER_USDT = Decimal("2")
USDT_PER_BX = Decimal("0.5")

ALLOWED_ASSETS = {
    "usdt", "bx", "btc", "eth", "bnb", "sol", "ton"
}

# ======================================================
# DATABASE
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def fetch_one(query: str, params=()):
    conn = db()
    try:
        c = conn.cursor()
        return c.execute(query, params).fetchone()
    finally:
        conn.close()

def fetch_all(query: str, params=()):
    conn = db()
    try:
        c = conn.cursor()
        return c.execute(query, params).fetchall()
    finally:
        conn.close()

def execute(query: str, params=()):
    conn = db()
    try:
        c = conn.cursor()
        c.execute(query, params)
        conn.commit()
    finally:
        conn.close()

# ======================================================
# GET PRICE (USDT)
# ======================================================
def get_price(asset: str) -> Optional[Decimal]:
    asset = asset.lower()

    row = fetch_one(
        "SELECT price_usdt, updated_at FROM prices WHERE asset=?",
        (asset,)
    )

    if not row:
        return None

    price, ts = row
    age = (datetime.now() - datetime.fromtimestamp(ts)).total_seconds()

    if age > MAX_PRICE_AGE_SEC:
        return None

    return Decimal(str(price))

# ======================================================
# GET ALL PRICES
# ======================================================
def get_all_prices() -> Dict[str, Optional[Decimal]]:
    rows = fetch_all(
        "SELECT asset, price_usdt, updated_at FROM prices"
    )

    now = datetime.now()
    result = {}

    for asset, price, ts in rows:
        age = (now - datetime.fromtimestamp(ts)).total_seconds()
        result[asset] = (
            Decimal(str(price)) if age <= MAX_PRICE_AGE_SEC else None
        )

    return result

# ======================================================
# CONVERSION
# ======================================================
def usdt_to_bx(usdt: Decimal) -> Decimal:
    return usdt * BX_PER_USDT

def bx_to_usdt(bx: Decimal) -> Decimal:
    return bx * USDT_PER_BX

def external_asset_to_bx(asset: str) -> Optional[Decimal]:
    price_usdt = get_price(asset)
    if price_usdt is None:
        return None
    return usdt_to_bx(price_usdt)

# ======================================================
# SNAPSHOT
# ======================================================
def pricing_snapshot() -> Dict:
    prices = get_all_prices()

    return {
        "reference": {
            "bx_per_usdt": BX_PER_USDT,
            "usdt_per_bx": USDT_PER_BX
        },
        "bx_internal_price": BX_PER_USDT,
        "external_prices_usdt": prices,
        "external_prices_bx": {
            asset: (usdt_to_bx(price) if price else None)
            for asset, price in prices.items()
        }
    }

# ======================================================
# UPDATE PRICE
# ======================================================
def update_price(asset: str, price: Decimal):
    asset = asset.lower()

    if asset not in ALLOWED_ASSETS:
        raise ValueError("INVALID_ASSET")

    execute(
        """INSERT INTO prices (asset, price_usdt, updated_at)
           VALUES (?, ?, ?)
           ON CONFLICT(asset)
           DO UPDATE SET
             price_usdt=excluded.price_usdt,
             updated_at=excluded.updated_at""",
        (asset, float(price), int(time.time()))
    )

# ======================================================
# EXTERNAL PRICE FETCH (PLACEHOLDER)
# ======================================================
def fetch_external_prices():
    """
    Placeholder – replace with real price feeds later.
    """
    sample_prices = {
        "btc": Decimal("50000"),
        "bnb": Decimal("500"),
        "eth": Decimal("2500"),
    }

    for asset, price in sample_prices.items():
        update_price(asset, price)

# ======================================================
# LOCAL TEST
# ======================================================
if __name__ == "__main__":
    fetch_external_prices()
    print(pricing_snapshot())
