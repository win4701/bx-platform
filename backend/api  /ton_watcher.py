import time, sqlite3, requests

DB = "db.sqlite"
TON_API = "https://toncenter.com/api/v2/getTransactions"
TON_WALLET = "EQxxxxxxxx"

def db():
    c = sqlite3.connect(DB)
    c.row_factory = sqlite3.Row
    return c

def run():
    while True:
        r = requests.get(TON_API, params={
            "address": TON_WALLET,
            "limit": 10
        }).json()

        for tx in r.get("result", []):
            msg = tx.get("in_msg", {})
            memo = msg.get("message", "")

            if not memo.isdigit():
                continue

            uid = int(memo)
            amount = int(msg["value"]) / 1e9
            txh = tx["transaction_id"]["hash"]

            c = db().cursor()
            try:
                c.execute("""
                  INSERT INTO ton_deposits(tx_hash, uid, amount)
                  VALUES (?,?,?)
                """, (txh, uid, amount))

                c.execute(
                  "UPDATE wallets SET ton=ton+? WHERE uid=?",
                  (amount, uid)
                )
                c.connection.commit()

            except sqlite3.IntegrityError:
                pass

        time.sleep(10)

if __name__ == "__main__":
    run()
