from fastapi import FastAPI, HTTPException
import sqlite3, random, time

app = FastAPI()
DB = "db.sqlite"

def db():
    return sqlite3.connect(DB, check_same_thread=False)

@app.get("/state")
def state(uid: str):
    con = db()
    cur = con.cursor()

    cur.execute("SELECT id FROM users WHERE tg_id=?", (uid,))
    row = cur.fetchone()
    if not row:
        cur.execute("INSERT INTO users (tg_id) VALUES (?)", (uid,))
        uid_db = cur.lastrowid
        cur.execute("INSERT INTO wallets (user_id) VALUES (?)", (uid_db,))
        cur.execute("INSERT INTO subscriptions (user_id) VALUES (?)", (uid_db,))
        cur.execute("INSERT INTO mining_state (user_id,bx_rate,ton_rate) VALUES (?,?,?)",
                    (uid_db, 0.01, 0.0002))
        con.commit()
    else:
        uid_db = row[0]

    wallet = cur.execute("SELECT bx,usdt,ton FROM wallets WHERE user_id=?", (uid_db,)).fetchone()
    sub = cur.execute("SELECT tier FROM subscriptions WHERE user_id=?", (uid_db,)).fetchone()[0]
    mining = cur.execute("SELECT bx_rate,ton_rate FROM mining_state WHERE user_id=?", (uid_db,)).fetchone()

    return {
        "wallet": {"bx": wallet[0], "usdt": wallet[1], "ton": wallet[2]},
        "subscription": sub,
        "mining": {"bx_rate": mining[0], "ton_rate": mining[1]}
    }

@app.post("/market/sell")
def sell(uid: str, amount: float, against: str):
    if against not in ("usdt","ton"):
        raise HTTPException(400)

    price = 0.72 if against=="usdt" else 0.95
    fee = amount * 0.05
    net = amount - fee

    con = db()
    cur = con.cursor()
    cur.execute("SELECT id FROM users WHERE tg_id=?", (uid,))
    uid_db = cur.fetchone()[0]

    cur.execute("UPDATE wallets SET bx = bx-? WHERE user_id=?", (amount,uid_db))
    cur.execute(f"UPDATE wallets SET {against} = {against}+? WHERE user_id=?", (net*price,uid_db))
    cur.execute("INSERT INTO trades (user_id,type,asset,against,amount,price,fee) VALUES (?,?,?,?,?,?,?)",
                (uid_db,"sell","bx",against,amount,price,fee))
    con.commit()
    return {"status":"ok"}

@app.post("/casino/play")
def play(uid: str, game: str, bet: float):
    con = db()
    cur = con.cursor()
    uid_db = cur.execute("SELECT id FROM users WHERE tg_id=?", (uid,)).fetchone()[0]

    win = bet * random.choice([0,0,0,1.8])
    burned = bet * 0.1

    cur.execute("UPDATE wallets SET bx = bx-?+? WHERE user_id=?", (bet,win,uid_db))
    cur.execute("INSERT INTO casino_rounds (user_id,game,bet,win,burned) VALUES (?,?,?,?,?)",
                (uid_db,game,bet,win,burned))
    con.commit()
    return {"win":win}
