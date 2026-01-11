# =========================
# BX BASE PRICE (USDT)
# =========================
BX_BASE_PRICE = 3.0  # سعر داخلي ثابت

# =========================
# SPREADS (BUY / SELL)
# =========================
BUY_SPREAD = {
    "usdt": 0.10,
    "ton": 0.12,
    "sol": 0.15,
    "btc": 0.20,
}

SELL_SPREAD = {
    "usdt": 0.12,
    "ton": 0.15,
    "sol": 0.18,
    "btc": 0.25,
}

# =========================
# MARKET PRICES (REFERENCE)
# =========================
MARKET_PRICE = {
    "usdt": 1.0,
    "ton": 6.0,        # مثال
    "sol": 150.0,      # مثال
    "btc": 95000.0,
}

# =========================
# HELPERS
# =========================
def asset_to_usdt(asset: str, amount: float) -> float:
    return amount * MARKET_PRICE[asset]

def usdt_to_asset(asset: str, usdt: float) -> float:
    return usdt / MARKET_PRICE[asset]

def buy_bx(asset: str, amount: float) -> float:
    usdt = asset_to_usdt(asset, amount)
    price = BX_BASE_PRICE * (1 + BUY_SPREAD[asset])
    return usdt / price

def sell_bx(asset: str, bx: float) -> float:
    price = BX_BASE_PRICE * (1 - SELL_SPREAD[asset])
    usdt = bx * price
    return usdt_to_asset(asset, usdt)
