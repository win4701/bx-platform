import time, requests, sqlite3

TON_ADDR = "EQXXXXXXXX"
DB = "db.sqlite"
TON_API = "https://toncenter.com/api/v2/getTransactions"

def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

def audit(action, uid, meta=""):
    c=db().cursor()
    c.execute(
      "INSERT INTO audit_logs(action,uid,meta,ts) VALUES(?,?,?,?)",
      (action,uid,meta,int(time.time()))
    )
    c.connection.commit()

def loop():
    last_lt = None
    while True:
        r = requests.get(TON_API, params={
          "address": TON_ADDR,
          "limit": 10,
          "lt": last_lt
        }).json()

        for tx in r.get("result", []):
            txh = tx["transaction_id"]["hash"]
            memo = tx.get("in_msg", {}).get("message", "")
            amount = int(tx["in_msg"]["value"]) / 1e9

            if not memo.isdigit(): continue
            uid = int(memo)

            c=db().cursor()
            try:
                c.execute("""
                  INSERT INTO ton_deposits(tx_hash,uid,amount,status,ts)
                  VALUES(?,?,?,?,?)
                """,(txh,uid,amount,"confirmed",int(time.time())))
                c.execute(
                  "UPDATE wallets SET ton=ton+? WHERE uid=?",
                  (amount,uid)
                )
                c.connection.commit()
                audit("ton_deposit",uid,f"{amount} TON")
            except sqlite3.IntegrityError:
                pass

        time.sleep(10)

if __name__ == "__main__":
    loop()
