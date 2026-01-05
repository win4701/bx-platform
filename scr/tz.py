
# ===== MINING =====
@app.post("/mining/claim")
def claim(uid: str):
    c = db().cursor()
    u = ensure_user(uid)
    tier, last = c.execute(
      "SELECT tier,last_claim FROM subscriptions JOIN mining_state USING(user_id) WHERE user_id=?",
      (u,)
    ).fetchone()
    hours = (time.time() - last) / 3600
    bx = hours * MINING[tier]["bx"]
    ton = hours * MINING[tier]["ton"]
    c.execute("UPDATE wallets SET bx=bx+?, ton=ton+? WHERE user_id=?", (bx, ton, u))
    c.execute("UPDATE mining_state SET last_claim=? WHERE user_id=?", (int(time.time()), u))
    c.connection.commit()
    return {"bx": bx, "ton": ton}

# ===== } FROM wallets WHERE user_id=?", (u,)).fetchone()[0]
    if bal < amount:
        raise HTTPException(400)
    c.execute(f"UPDATE wallets SET {asset}={asset}-? WHERE user_id=?", (amount, u))
    c.execute
  ______________''''''_______'_________"__________
