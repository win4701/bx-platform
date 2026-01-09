import os
import time
import sqlite3
import requests

# ===============================
# CONFIG
# ===============================
DB_PATH = os.getenv("DB_PATH", "backend/db/db.sqlite")
TON_WALLET = os.getenv("TON_WALLET")
TON_API = "https://toncenter.com/api/v2/getTransactions"

if not TON_WALLET:
    raise RuntimeError("TON_WALLET not set")

POLL_INTERVAL = 15  # seconds

# ===============================
# DB HELPERS
# ===============================
def db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def audit(action, user_id, meta=""):
    c = db().cursor()
    c.execute(
        "INSERT INTO audit_logs(action, user_id, meta, ts) VALUES (?,?,?,?)",
        (action, user_id, meta, int(time.time()))
    )
    c.connection.commit()

# ===============================
# CORE LOGIC
# ===============================
def process_transactions():
    r = requests.get(
        TON_API,
        params={
            "address": TON_WALLET,
            "limit": 20
        },
        timeout=10
    ).json()

    for tx in r.get("result", []):
        msg = tx.get("in_msg") or {}
        comment = msg.get("message", "")

        # Comment must be numeric user_id
        if not comment.isdigit():
            continue

        user_id = int(comment)
        amount = int(msg.get("value", 0)) / 1e9
        tx_hash = tx["transaction_id"]["hash"]

        conn = db()
        cur = conn.cursor()

        try:
            # prevent duplicate processing
            cur.execute("""
                INSERT INTO ton_deposits (tx_hash, user_id, amount, ts)
                VALUES (?,?,?,?)
            """, (tx_hash, user_id, amount, int(time.time())))

            # credit wallet
            cur.execute("""
                UPDATE wallets
                SET ton = ton + ?
                WHERE user_id = ?
            """, (amount, user_id))

            conn.commit()

            audit(
                "ton_auto_deposit",
                user_id,
                f"{amount} TON | tx={tx_hash}"
            )

            print(f"[TON] Deposit OK | user={user_id} | {amount} TON")

        except sqlite3.IntegrityError:
            # tx already processed
            pass

        finally:
            conn.close()

# ===============================
# LOOP
# ===============================
def run():
    print("[TON WATCHER] started")
    while True:
        try:
            process_transactions()
        except Exception as e:
            print("[TON WATCHER ERROR]", e)

        time.sleep(POLL_INTERVAL)

# ===============================
# ENTRY
# ===============================
if __name__ == "__main__":
    run()
