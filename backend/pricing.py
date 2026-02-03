import sqlite3
import time
from decimal import Decimal
from typing import Dict, Optional
from datetime import datetime

# ======================================================
# CONFIGURATION
# ======================================================
DB_PATH = "db/prices.db"
MAX_PRICE_AGE_SEC = 60 * 60  # 1 hour in seconds

# Conversion rates (can be dynamic or retrieved from an API)
BX_PER_USDT = Decimal(5)  # Example: 1 BX = 5 USDT
USDT_PER_BX = Decimal(0.2)  # Example: 1 USDT = 0.2 BX

# ======================================================
# DATABASE CONNECTION
# ======================================================
def db():
    """
    Establish a connection to the SQLite database.
    """
    connection = sqlite3.connect(DB_PATH, check_same_thread=False)
    return connection

def close_connection(connection):
    """
    Commit the changes to the database and close the connection.
    """
    connection.commit()
    connection.close()

# ======================================================
# GET PRICE (from DB)
# ======================================================
def get_price(asset: str) -> Optional[Decimal]:
    """
    Retrieve the price of the asset in USDT from the database.
    If the price is outdated (older than 1 hour), return None.
    """
    c = db().cursor()
    row = c.execute(
        "SELECT price_usdt, updated_at FROM prices WHERE asset=?", 
        (asset,)
    ).fetchone()

    if not row:
        return None

    price, ts = row
    last_updated = datetime.fromtimestamp(ts)
    if (datetime.now() - last_updated).seconds > MAX_PRICE_AGE_SEC:
        return None  # Price is too old, ignore

    return Decimal(price)

# ======================================================
# GET ALL PRICES
# ======================================================
def get_all_prices() -> Dict[str, Optional[Decimal]]:
    """
    Retrieve all prices in USDT from the database.
    Only returns prices that are not outdated (within 1 hour).
    """
    c = db().cursor()
    rows = c.execute(
        "SELECT asset, price_usdt, updated_at FROM prices"
    ).fetchall()

    now = datetime.now()
    return {
        asset: Decimal(price) if (now - datetime.fromtimestamp(ts)).seconds <= MAX_PRICE_AGE_SEC else None
        for asset, price, ts in rows
    }

# ======================================================
# CONVERSION FUNCTIONS
# ======================================================
def usdt_to_bx(usdt: Decimal) -> Decimal:
    """
    Convert USDT to BX using the conversion rate.
    """
    return usdt * BX_PER_USDT

def bx_to_usdt(bx: Decimal) -> Decimal:
    """
    Convert BX to USDT using the conversion rate.
    """
    return bx * USDT_PER_BX

def external_asset_to_bx(asset: str) -> Optional[Decimal]:
    """
    Convert an external asset (like BTC or SOL) to BX via USDT.
    """
    price_usdt = get_price(asset)
    if price_usdt is None:
        return None
    return usdt_to_bx(price_usdt)

# ======================================================
# PRICING SNAPSHOT (Gather all prices in one call)
# ======================================================
def pricing_snapshot() -> Dict:
    """
    Retrieve a snapshot of all prices (internal and external) and return them.
    The snapshot includes:
    - internal BX/USDT prices
    - external asset prices in both USDT and BX
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
            asset: (usdt_to_bx(price) if price is not None else None)
            for asset, price in prices.items()
        }
    }

# ======================================================
# ADD/UPDATE PRICES (For updating prices in the database)
# ======================================================
def update_price(asset: str, price: Decimal):
    """
    Update the price of an asset in the database.
    If the asset already exists, update the price, otherwise insert a new record.
    """
    c = db().cursor()
    c.execute(
        "INSERT INTO prices (asset, price_usdt, updated_at) VALUES (?, ?, ?) "
        "ON CONFLICT(asset) DO UPDATE SET price_usdt=excluded.price_usdt, updated_at=excluded.updated_at",
        (asset, price, int(time.time()))
    )
    c.connection.commit()

# ======================================================
# EXTERNAL API PRICE FETCH (For integrating with external price sources)
# ======================================================
def fetch_external_prices():
    """
    Fetch external prices from a live API (example: from a crypto exchange).
    This function should call the API, parse the response, and then update the prices in the database.
    """
    # Placeholder for actual API call
    external_prices = {
        "BTC": Decimal(50000),  # Example: 1 BTC = 50000 USDT
        "BNB": Decimal(500),   # Example: 1 BNB = 500 USDT
    }

    for asset, price in external_prices.items():
        update_price(asset, price)

# ======================================================
# MAIN (For testing purposes or direct script execution)
# ======================================================
if __name__ == "__main__":
    # Update prices by fetching external data
    fetch_external_prices()

    # Print all prices snapshot
    snapshot = pricing_snapshot()
    print(snapshot)
