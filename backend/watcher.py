import time
import threading
import sqlite3
from typing import List, Dict

from pricing import get_price

DB_PATH = "db.sqlite"

# ======================================================
# CONFIG
# ======================================================
POLL_INTERVAL = 20  # seconds
MIN_DEPOSIT_USDT = 10.0

CONFIRMATIONS = {
    "ton": 5,
    "sol": 10,
    "btc": 3,
}

SUPPORTED_ASSETS = {"ton", "sol", "btc"}

# ======================================================
# DB
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

# ======================================================
# DEDUP
# ======================================================
def tx_used(txid: str) -> bool:
    c = db().cursor()
    return c.execute(
        "SELECT 1 FROM used_txs WHERE txid=?",
        (txid,)
    ).fetchone() is not None

def mark_tx_used(txid: str):
    c = db().cursor()
    c.execute(
        "INSERT OR IGNORE INTO used_txs(txid) VALUES(?)",
        (txid,)
    )
    c.connection.commit()

# ======================================================
# WALLET + HISTORY
# ======================================================
def credit_wallet(uid: int, asset: str, amount: float):
    c = db().cursor()
    c.execute(
        f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
        (amount, uid)
    )
    c.connection.commit()

def record_history(uid: int, asset: str, amount: float, ref: str):
    c = db().cursor()
    c.execute(
        """INSERT INTO history
           (uid, action, asset, amount, ref, ts)
           VALUES (?,?,?,?,?,?)""",
        (uid, "deposit", asset, amount, ref, int(time.time()))
    )
    c.connection.commit()

# ======================================================
# VALUE CHECK (ANTI-DUST)
# ======================================================
def value_in_usdt(asset: str, amount: float) -> float:
    """
    تقييم الإيداع بسعر حي
    يرفض السعر القديم تلقائيًا (pricing.py)
    """
    price = get_price(asset)
    return amount * price

# ======================================================
# TON WATCHER
# ======================================================
def ton_watcher():
    while True:
        try:
            txs: List[Dict] = []  # TON API adapter (خارجي)

            for tx in txs:
                txid = f"ton:{tx['hash']}"
                if tx_used(txid):
                    continue

                if tx["confirmations"] < CONFIRMATIONS["ton"]:
                    continue

                uid = int(tx["memo"])        # memo = uid
                amount = float(tx["amount"])

                if value_in_usdt("ton", amount) < MIN_DEPOSIT_USDT:
                    mark_tx_used(txid)
                    continue

                credit_wallet(uid, "ton", amount)
                record_history(uid, "ton", amount, txid)
                mark_tx_used(txid)

        except Exception as e:
            print("[TON WATCHER]", e)

        time.sleep(POLL_INTERVAL)

# ======================================================
# SOL WATCHER
# ======================================================
def sol_watcher():
    while True:
        try:
            txs: List[Dict] = []  # SOL RPC adapter (خارجي)

            for tx in txs:
                txid = f"sol:{tx['signature']}"
                if tx_used(txid):
                    continue

                if tx["confirmations"] < CONFIRMATIONS["sol"]:
                    continue

                uid = int(tx["memo"])
                amount = float(tx["amount"])

                if value_in_usdt("sol", amount) < MIN_DEPOSIT_USDT:
                    mark_tx_used(txid)
                    continue

                credit_wallet(uid, "sol", amount)
                record_history(uid, "sol", amount, txid)
                mark_tx_used(txid)

        except Exception as e:
            print("[SOL WATCHER]", e)

        time.sleep(POLL_INTERVAL)

# ======================================================
# BTC WATCHER
# ======================================================
def btc_watcher():
    while True:
        try:
            txs: List[Dict] = []  # BTC API adapter (خارجي)

            for tx in txs:
                txid = f"btc:{tx['txid']}"
                if tx_used(txid):
                    continue

                if tx["confirmations"] < CONFIRMATIONS["btc"]:
                    continue

                uid = int(tx["uid"])          # address → uid mapping
                amount = float(tx["amount"]) # BTC

                if value_in_usdt("btc", amount) < MIN_DEPOSIT_USDT:
                    mark_tx_used(txid)
                    continue

                credit_wallet(uid, "btc", amount)
                record_history(uid, "btc", amount, txid)
                mark_tx_used(txid)

        except Exception as e:
            print("[BTC WATCHER]", e)

        time.sleep(POLL_INTERVAL)

# ======================================================
# START WATCHERS
# ======================================================
def start_watchers():
    threading.Thread(target=ton_watcher, daemon=True).start()
    threading.Thread(target=sol_watcher, daemon=True).start()
    threading.Thread(target=btc_watcher, daemon=True).start()
    print("[WATCHER] TON / SOL / BTC watchers started")
