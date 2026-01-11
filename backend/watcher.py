import time
import threading
import requests
import sqlite3

DB = "db.sqlite"

# =========================
# CONFIG
# =========================
MIN_DEPOSIT_USDT = 10.0

TON_CONFIRMATIONS = 5
SOL_CONFIRMATIONS = 10
BTC_CONFIRMATIONS = 3

BTC_PRICE_USDT = 95000.0   # ثابت داخليًا
SOL_PRICE_USDT = 150.0
TON_PRICE_USDT = 6.0

POLL_INTERVAL = 20  # seconds

# =========================
# DB helpers
# =========================
def db():
    return sqlite3.connect(DB, check_same_thread=False)

def tx_used(txid: str) -> bool:
    c = db().cursor()
    r = c.execute("SELECT 1 FROM used_txs WHERE txid=?", (txid,)).fetchone()
    return r is not None

def mark_tx_used(txid: str):
    c = db().cursor()
    c.execute("INSERT OR IGNORE INTO used_txs(txid) VALUES(?)", (txid,))
    c.connection.commit()

def add_balance(uid: int, asset: str, amount: float):
    c = db().cursor()
    c.execute(
        f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
        (amount, uid)
    )
    c.connection.commit()

def history(uid: int, asset: str, amount: float, ref: str):
    c = db().cursor()
    c.execute(
        """INSERT INTO history
           (uid, action, asset, amount, ref, ts)
           VALUES (?,?,?,?,?,?)""",
        (uid, "deposit", asset, amount, ref, int(time.time()))
    )
    c.connection.commit()

# =========================
# BINANCE ID (USDT)
# =========================
def check_binance_transfers():
    """
    هذه دالة وهمية Placeholder.
    الإيداع الحقيقي يتم عبر:
    - Binance API
    - أو CSV / Webhook
    """
    transfers = []  # يجب استبدالها بمصدر حقيقي

    for t in transfers:
        txid = f"binance:{t['id']}"
        if tx_used(txid):
            continue

        amount = t["amount"]
        if amount < MIN_DEPOSIT_USDT:
            mark_tx_used(txid)
            continue

        uid = t["uid"]

        add_balance(uid, "usdt", amount)
        history(uid, "usdt", amount, txid)
        mark_tx_used(txid)

# =========================
# TON WATCHER
# =========================
def ton_watcher():
    while True:
        try:
            txs = []  # اجلب معاملات TON من API
            for tx in txs:
                txid = tx["hash"]
                if tx_used(txid):
                    continue

                if tx["confirmations"] < TON_CONFIRMATIONS:
                    continue

                uid = int(tx["memo"])
                amount = tx["amount"]
                value_usdt = amount * TON_PRICE_USDT

                if value_usdt < MIN_DEPOSIT_USDT:
                    mark_tx_used(txid)
                    continue

                add_balance(uid, "ton", amount)
                history(uid, "ton", amount, txid)
                mark_tx_used(txid)

        except Exception as e:
            print("[TON]", e)

        time.sleep(POLL_INTERVAL)

# =========================
# SOL WATCHER
# =========================
def sol_watcher():
    while True:
        try:
            txs = []  # اجلب معاملات SOL من API
            for tx in txs:
                txid = tx["signature"]
                if tx_used(txid):
                    continue

                if tx["confirmations"] < SOL_CONFIRMATIONS:
                    continue

                uid = int(tx["memo"])
                amount = tx["amount"]
                value_usdt = amount * SOL_PRICE_USDT

                if value_usdt < MIN_DEPOSIT_USDT:
                    mark_tx_used(txid)
                    continue

                add_balance(uid, "sol", amount)
                history(uid, "sol", amount, txid)
                mark_tx_used(txid)

        except Exception as e:
            print("[SOL]", e)

        time.sleep(POLL_INTERVAL)

# =========================
# BTC WATCHER
# =========================
def btc_watcher():
    while True:
        try:
            txs = []  # اجلب معاملات BTC من API
            for tx in txs:
                txid = tx["txid"]
                if tx_used(txid):
                    continue

                if tx["confirmations"] < BTC_CONFIRMATIONS:
                    continue

                uid = tx["uid"]   # ربط address → uid
                amount = tx["amount"]  # BTC
                value_usdt = amount * BTC_PRICE_USDT

                if value_usdt < MIN_DEPOSIT_USDT:
                    mark_tx_used(txid)
                    continue

                add_balance(uid, "btc", amount)
                history(uid, "btc", amount, txid)
                mark_tx_used(txid)

        except Exception as e:
            print("[BTC]", e)

        time.sleep(POLL_INTERVAL)

# =========================
# START ALL WATCHERS
# =========================
def start_watchers():
    threading.Thread(target=check_binance_transfers, daemon=True).start()
    threading.Thread(target=ton_watcher, daemon=True).start()
    threading.Thread(target=sol_watcher, daemon=True).start()
    threading.Thread(target=btc_watcher, daemon=True).start()

    print("[WATCHER] Deposit watchers started")
