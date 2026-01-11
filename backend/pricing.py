# backend/pricing.py
BX_INTERNAL_PRICE_USDT = 2.5

BUY_SPREAD = {
    "usdt": 0.08,
    "ton":  0.12,
    "sol":  0.15
}

SELL_SPREAD = {
    "usdt": 0.12,
    "ton":  0.15,
    "sol":  0.18
}

def buy_price(asset: str) -> float:
    return BX_INTERNAL_PRICE_USDT * (1 + BUY_SPREAD[asset])

def sell_price(asset: str) -> float:
    return BX_INTERNAL_PRICE_USDT * (1 - SELL_SPREAD[asset])

def value_to_bx(usdt: float, asset: str) -> float:
    return round(usdt / buy_price(asset), 6)

def bx_to_value(bx: float, asset: str) -> float:
    return round(bx * sell_price(asset), 6)
