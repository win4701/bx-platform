# ===== BX INTERNAL MARKET PRICES =====
BX_PRICE_TON = 0.955489564
BX_PRICE_USDT = 0.717872729

SELL_FEE = 0.05      # 5%
SELL_BURN = 0.10     # 10%
SELL_RATIO_LIMIT = 0.20  # 20 
def get_total_bought(c, user_id: int) -> float:
    return c.execute(
        "SELECT COALESCE(SUM(amount_bx),0) FROM trades WHERE user_id=? AND side='buy'",
        (user_id,)
    ).fetchone()[0]

def get_total_sold(c, user_id: int) -> float:
    return c.execute(
        "SELECT COALESCE(SUM(amount_bx),0) FROM trades WHERE user_id=? AND side='sell'",
        (user_id,)
    ).fetchone()[0]
    
    @app.post("/market/buy")
def buy(uid: str, amount: float, pay_with: str):
    if pay_with not in ("usdt", "ton"):
        raise HTTPException(400, "INVALID_PAIR")

    c = db().cursor()
    user_id = ensure_user(uid)

    price = BX_PRICE_USDT if pay_with == "usdt" else BX_PRICE_TON
    cost = amount * price

    c.execute(
        f"UPDATE wallets SET {pay_with}={pay_with}-?, bx=bx+? WHERE user_id=?",
        (cost, amount, user_id)
    )

    c.execute(
        "INSERT INTO trades VALUES (NULL,?,?,?,?,?,?,?)",
        (user_id, "buy", amount, pay_with, price, 0, 0, int(time.time()))
    )

    c.connection.commit()
    return {
        "ok": True,
        "bx_bought": amount,
        "paid": cost,
        "currency": pay_with
    }
    __________________________________________
    @app.post("/market/sell")
def sell(uid: str, amount: float, receive_in: str):
    if receive_in not in ("usdt", "ton"):
        raise HTTPException(400, "INVALID_PAIR")

    c = db().cursor()
    user_id = ensure_user(uid)

    total_bought = get_total_bought(c, user_id)
    total_sold = get_total_sold(c, user_id)

    max_allowed = total_bought * SELL_RATIO_LIMIT

    if total_sold + amount > max_allowed:
        raise HTTPException(403, "SELL_LIMIT_20_PERCENT")

    price = BX_PRICE_USDT if receive_in == "usdt" else BX_PRICE_TON

    fee = amount * SELL_FEE
    burn = amount * SELL_BURN
    net_bx = amount - fee - burn
    payout = net_bx * price

    c.execute("UPDATE wallets SET bx=bx-? WHERE user_id=?", (amount, user_id))
    c.execute(
        f"UPDATE wallets SET {receive_in}={receive_in}+? WHERE user_id=?",
        (payout, user_id)
    )

    c.execute(
        "INSERT INTO trades VALUES (NULL,?,?,?,?,?,?,?)",
        (user_id, "sell", amount, receive_in, price, fee, burn, int(time.time()))
    )

    c.connection.commit()
    return {
        "ok": True,
        "bx_sold": amount,
        "received": payout,
        "currency": receive_in,
        "fee_bx": fee,
        "burn_bx": burn
    }
