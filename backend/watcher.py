import os
import time
import requests

from pricing import get_price
from finance import credit_deposit, save_pending_deposit
from key import get_env

# ======================================================
# ENV
# ======================================================
TREASURY_SOL = os.getenv("TREASURY_SOL")
TREASURY_BTC = os.getenv("TREASURY_BTC")

SOL_API_URL = os.getenv("SOL_API_URL", "https://api.mainnet-beta.solana.com")
BTC_API_URL = os.getenv("BTC_API_URL", "https://blockstream.info/api")

SOL_CONFIRMATIONS = int(os.getenv("SOL_CONFIRMATIONS", "10"))
BTC_CONFIRMATIONS = int(os.getenv("BTC_CONFIRMATIONS", "3"))

MIN_DEPOSIT_USDT = float(os.getenv("MIN_DEPOSIT_USDT", "10"))

# Telegram Alerts
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID")

# Optional HD (public only)
HD_XPUB_SOL = os.getenv("HD_XPUB_SOL")
HD_XPUB_BTC = os.getenv("HD_XPUB_BTC")

# ======================================================
# HELPERS
# ======================================================
def alert_admin(text: str):
    if not TELEGRAM_BOT_TOKEN or not ADMIN_CHAT_ID:
        return
    try:
        requests.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": ADMIN_CHAT_ID, "text": text},
            timeout=5
        )
    except Exception:
        pass

def usdt_value(asset: str, amount: float) -> float:
    if asset == "usdt":
        return amount
    price = get_price(asset)
    if not price:
        return 0.0
    return amount * price

def extract_uid_from_memo(memo: str):
    if not memo:
        return None
    memo = memo.strip().lower()
    if memo.startswith("uid:"):
        try:
            return int(memo.split("uid:")[1])
        except Exception:
            return None
    return None

# ======================================================
# SOL WATCHER
# ======================================================
def fetch_sol_signatures(address: str, limit: int = 20):
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getSignaturesForAddress",
        "params": [address, {"limit": limit}],
    }
    r = requests.post(SOL_API_URL, json=payload, timeout=10)
    r.raise_for_status()
    return r.json().get("result", [])

def fetch_sol_tx(signature: str):
    payload = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getTransaction",
        "params": [signature, {"encoding": "jsonParsed"}],
    }
    r = requests.post(SOL_API_URL, json=payload, timeout=10)
    r.raise_for_status()
    return r.json().get("result")

def watch_sol():
    if not TREASURY_SOL:
        return

    seen = set()
    while True:
        try:
            sigs = fetch_sol_signatures(TREASURY_SOL)
            for s in sigs:
                sig = s.get("signature")
                conf = s.get("confirmations", 0)
                if not sig or sig in seen or conf < SOL_CONFIRMATIONS:
                    continue

                tx = fetch_sol_tx(sig)
                if not tx:
                    continue

                # amount + memo
                meta = tx.get("meta", {})
                post = meta.get("postBalances", [])
                pre = meta.get("preBalances", [])
                if not post or not pre:
                    continue

                lamports = max(post) - max(pre)
                amount_sol = lamports / 1e9
                if usdt_value("sol", amount_sol) < MIN_DEPOSIT_USDT:
                    continue

                # memo
                memo = None
                for ix in tx.get("transaction", {}).get("message", {}).get("instructions", []):
                    if ix.get("program") == "spl-memo":
                        memo = ix.get("parsed")
                        break

                uid = extract_uid_from_memo(memo)

                if uid:
                    credit_deposit(uid, "sol", amount_sol, sig)
                else:
                    save_pending_deposit(
                        uid=0,
                        asset="sol",
                        amount=amount_sol,
                        txid=sig,
                        reason="missing_memo"
                    )
                    alert_admin(
                        f"⚠️ Pending SOL deposit\nTXID: {sig}\nAmount: {amount_sol}\nReason: missing memo"
                    )

                seen.add(sig)

        except Exception as e:
            alert_admin(f"Watcher SOL error: {e}")

        time.sleep(20)

# ======================================================
# BTC WATCHER
# ======================================================
def fetch_btc_txs(address: str):
    r = requests.get(f"{BTC_API_URL}/address/{address}/txs", timeout=10)
    r.raise_for_status()
    return r.json()

def watch_btc():
    if not TREASURY_BTC:
        return

    seen = set()
    while True:
        try:
            txs = fetch_btc_txs(TREASURY_BTC)
            for tx in txs:
                txid = tx.get("txid")
                if not txid or txid in seen:
                    continue

                conf = tx.get("status", {}).get("block_height")
                if not conf:
                    continue

                vout = tx.get("vout", [])
                amount_btc = 0.0
                for o in vout:
                    if TREASURY_BTC in o.get("scriptpubkey_address", ""):
                        amount_btc += o.get("value", 0) / 1e8

                if usdt_value("btc", amount_btc) < MIN_DEPOSIT_USDT:
                    continue

                # BTC without HD mapping → pending
                save_pending_deposit(
                    uid=0,
                    asset="btc",
                    amount=amount_btc,
                    txid=txid,
                    reason="no_address_mapping"
                )
                alert_admin(
                    f"⚠️ Pending BTC deposit\nTXID: {txid}\nAmount: {amount_btc}\nReason: no address mapping"
                )

                seen.add(txid)

        except Exception as e:
            alert_admin(f"Watcher BTC error: {e}")

        time.sleep(30)

# ======================================================
# HOT / COLD POLICY (ALERT ONLY)
# ======================================================
def hot_wallet_policy():
    # مثال بسيط: تنبيه فقط
    pass

# ======================================================
# START ALL
# ======================================================
def start_watchers():
    from threading import Thread
    Thread(target=watch_sol, daemon=True).start()
    Thread(target=watch_btc, daemon=True).start()
