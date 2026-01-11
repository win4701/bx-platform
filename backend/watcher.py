import time
import threading
import sqlite3
import requests
from typing import List, Dict

from pricing import get_price

DB_PATH = "db.sqlite"

# ======================================================
# CONFIG
# ======================================================
MIN_DEPOSIT_USDT = 10.0
POLL_INTERVAL = 20  # seconds

CONFIRMATIONS = {
    "ton": 5,
    "sol": 10,
    "btc": 3
}

SUPPORTED_ASSETS = {"usdt", "ton", "sol", "btc"}

# ======================================================
# DB
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

# ======================================================
# HELPERS
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

def credit_wallet(uid: int, asset: str, amount: float):
    if asset not in SUPPORTED_ASSETS:
        return
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

def value_in_usdt(asset: str, amount: float) -> float:
    """
    تقييم الإيداع بسعر حي
    يرفض السعر القديم
    """
    if asset == "usdt":
        return amount
    price = get_price(asset)  # قد يرفع STALE_PRICE
    return amount * price

# ======================================================
# BINANCE ID WATCHER (USDT)
# ======================================================
def binance_watcher():
    """
    Placeholder — يُربط لاحقًا بـ Binance API / Webhook
    يجب أن يعيد معاملات بالشكل:
    { txid, uid, amount }
    """
    while True:
        try:
            transfers: List[Dict] = []  # مصدر خارجي حقيقي لاحقًا

            for t in transfers:
                txid = f"binance:{t['txid']}"
                if tx_used(txid):
                    continue

                amount = float(t["amount"])
                if amount < MIN_DEPOSIT_USDT:
                    mark_tx_used(txid)
                    continue

                uid = int(t["uid"])

                credit_wallet(uid, "usdt", amount)
                record_history(uid, "usdt", amount, txid)
                mark_tx_used(txid)

        except Exception as e:
            print("[BINANCE]", e)

        time.sleep(POLL_INTERVAL)

# ======================================================
# TON WATCHER
# ======================================================
def ton_watcher():
    while True:
        try:
            txs: List[Dict] = []  # TON API
            for tx in txs:
                txid = tx["hash"]
                if tx_used(txid):
                    continue

                if tx["confirmations"] < CONFIRMATIONS["ton"]:
                    continue

                uid = int(tx["memo"])
                amount = float(tx["amount"])

                usdt_value = value_in_usdt("ton", amount)
                if usdt_value < MIN_DEPOSIT_USDT:
                    mark_tx_used(txid)
                    continue

                credit_wallet(uid, "ton", amount)
                record_history(uid, "ton", amount, txid)
                mark_tx_used(txid)

        except Exception as e:
            print("[TON]", e)

        time.sleep(POLL_INTERVAL)

# ======================================================
# SOL WATCHER
# ======================================================
def sol_watcher():
    while True:
        try:
            txs: List[Dict] = []  # SOL API
            for tx in txs:
                txid = tx["signature"]
                if tx_used(txid):
                    continue

                if tx["confirmations"] < CONFIRMATIONS["sol"]:
                    continue

                uid = int(tx["memo"])
                amount = float(tx["amount"])

                usdt_value = value_in_usdt("sol", amount)
                if usdt_value < MIN_DEPOSIT_USDT:
                    mark_tx_used(txid)
                    continue

                credit_wallet(uid, "sol", amount)
                record_history(uid, "sol", amount, txid)
                mark_tx_used(txid)

        except Exception as e:
            print("[SOL]", e)

        time.sleep(POLL_INTERVAL)

# ======================================================
# BTC WATCHER
# ======================================================
def btc_watcher():
    while True:
        try:
            txs: List[Dict] = []  # BTC API
            for tx in txs:
                txid = tx["txid"]
                if tx_used(txid):
                    continue

                if tx["confirmations"] < CONFIRMATIONS["btc"]:
                    continue

                uid = int(tx["uid"])  # address → uid mapping
                amount = float(tx["amount"])  # BTC

                usdt_value = value_in_usdt("btc", amount)
                if usdt_value < MIN_DEPOSIT_USDT:
                    mark_tx_used(txid)
                    continue

                credit_wallet(uid, "btc", amount)
                record_history(uid, "btc", amount, txid)
                mark_tx_used(txid)

        except Exception as e:
            print("[BTC]", e)

        time.sleep(POLL_INTERVAL)

# ======================================================
# START ALL WATCHERS
# ======================================================
def start_watchers():
    threading.Thread(target=binance_watcher, daemon=True).start()
    threading.Thread(target=ton_watcher, daemon=True).start()
    threading.Thread(target=sol_watcher, daemon=True).start()
    threading.Thread(target=btc_watcher, daemon=True).start()
    print("[WATCHER] Deposit watchers started")
