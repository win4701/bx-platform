# backend/watcher.py
import time
import threading
import requests
import sqlite3
import os

DB_PATH = os.getenv("DB_PATH", "db.sqlite")

# ============ DB ============
def db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def tx_used(txid: str) -> bool:
    c = db().cursor()
    r = c.execute(
        "SELECT 1 FROM used_txs WHERE txid=?",
        (txid,)
    ).fetchone()
    return r is not None


def mark_tx_used(txid: str):
    c = db().cursor()
    c.execute(
        "INSERT INTO used_txs(txid) VALUES (?)",
        (txid,)
    )
    c.connection.commit()


def credit(uid: int, asset: str, amount: float):
    c = db().cursor()
    c.execute(
        f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
        (amount, uid)
    )
    c.connection.commit()


# ============ TON WATCHER ============
TON_API = "https://toncenter.com/api/v2/getTransactions"
TON_ADDRESS = os.getenv("TON_DEPOSIT_ADDRESS")
TON_API_KEY = os.getenv("TON_API_KEY")

def ton_watcher():
    print("[TON] watcher started")
    while True:
        try:
            r = requests.get(
                TON_API,
                params={
                    "address": TON_ADDRESS,
                    "limit": 10,
                    "api_key": TON_API_KEY
                },
                timeout=10
            )
            data = r.json().get("result", [])

            for tx in data:
                txid = tx["transaction_id"]["hash"]
                if tx_used(txid):
                    continue

                in_msg = tx.get("in_msg")
                if not in_msg:
                    continue

                memo = in_msg.get("message", "")
                if not memo.startswith("UID:"):
                    continue

                uid = int(memo.replace("UID:", "").strip())
                amount = int(in_msg["value"]) / 1e9  # nanotons → TON

                credit(uid, "ton", amount)
                mark_tx_used(txid)

                print(f"[TON] credited {amount} to uid {uid}")

        except Exception as e:
            print("[TON ERROR]", e)

        time.sleep(15)


# ============ SOL WATCHER ============
SOL_RPC = os.getenv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com")
SOL_ADDRESS = os.getenv("SOL_DEPOSIT_ADDRESS")

def sol_watcher():
    print("[SOL] watcher started")
    while True:
        try:
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getSignaturesForAddress",
                "params": [SOL_ADDRESS, {"limit": 10}]
            }
            r = requests.post(SOL_RPC, json=payload, timeout=10)
            sigs = r.json().get("result", [])

            for s in sigs:
                sig = s["signature"]
                if tx_used(sig):
                    continue

                tx_payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getTransaction",
                    "params": [sig, {"encoding": "jsonParsed"}]
                }
                txr = requests.post(SOL_RPC, json=tx_payload, timeout=10)
                tx = txr.json().get("result")
                if not tx:
                    continue

                # memo
                memo = ""
                for ix in tx["transaction"]["message"]["instructions"]:
                    if ix.get("program") == "spl-memo":
                        memo = ix["parsed"]
                        break

                if not memo.startswith("UID:"):
                    continue

                uid = int(memo.replace("UID:", "").strip())

                # lamports received
                meta = tx["meta"]
                pre = meta["preBalances"][0]
                post = meta["postBalances"][0]
                lamports = post - pre
                if lamports <= 0:
                    continue

                sol = lamports / 1e9

                credit(uid, "sol", sol)
                mark_tx_used(sig)

                print(f"[SOL] credited {sol} to uid {uid}")

        except Exception as e:
            print("[SOL ERROR]", e)

        time.sleep(15)


# ============ START ============
def start_watchers():
    threading.Thread(target=ton_watcher, daemon=True).start()
    threading.Thread(target=sol_watcher, daemon=True).start()
