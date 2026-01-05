@app.post("/market/sell")
def sell(uid: str, amount: float, against: str):
    if against not in ("usdt","ton"):
        raise HTTPException(400)
    c = db().cursor()
    u = ensure_user(uid)
    sold = c.execute(
      "SELECT COALESCE(SUM(amount_bx),0) FROM trades WHERE user_id=? AND side='sell' AND ts>?",
      (u, int(time.time())-86400)
    ).fetchone()[0]
    if sold + amount > DAILY_SELL_LIMIT:
        raise HTTPException(400, "LIMIT")
    price = 0.72 if against=="usdt" else 0.95
    fee = amount * SELL_FEE
    burn = amount * SELL_BURN
    net = (amount - fee - burn) * price
    c.execute("UPDATE wallets SET bx=bx-? WHERE user_id=?", (amount, u))
    c.execute(f"UPDATE wallets SET {against}={against}+? WHERE user_id=?", (net, u))
    c.execute("INSERT INTO trades VALUES(NULL,?,?,?,?,?,?,?)",
              (u,"sell",amount,against,price,fee,burn,int(time.time())))
    c.connection.commit()
    return {"ok": True}
