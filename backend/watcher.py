import os
import asyncio
import time
import sqlite3
from typing import Optional

import aiohttp
from aiohttp import web

from finance import credit_deposit, save_pending_deposit
from pricing import get_price

# ======================================================
# ENV
# ======================================================
TREASURY_SOL = os.getenv("TREASURY_SOL")
TREASURY_TON = os.getenv("TREASURY_TON")
TREASURY_BTC = os.getenv("TREASURY_BTC")

# TON USDT Jetton
TON_USDT_MASTER = os.getenv("TON_USDT_MASTER")  # Jetton master address

SOL_RPC = os.getenv("SOL_RPC", "https://api.mainnet-beta.solana.com")
TON_API = os.getenv("TON_API", "https://toncenter.com/api/v2")
BTC_API = os.getenv("BTC_API", "https://blockstream.info/api")

MIN_USDT = float(os.getenv("MIN_DEPOSIT_USDT", "10"))

CONFIRM = {
    "sol": int(os.getenv("SOL_CONFIRMATIONS", "10")),
    "ton": int(os.getenv("TON_CONFIRMATIONS", "5")),
    "btc": int(os.getenv("BTC_CONFIRMATIONS", "3")),
}

DB_PATH = os.getenv("DB_PATH", "db.sqlite")

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID")

# ======================================================
# DB (DEDUP PERSISTENT)
# ======================================================
import psycopg2, os

def db():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def init_seen():
    c = db().cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS seen_tx (
            txid TEXT PRIMARY KEY,
            ts INTEGER
        )
    """)
    c.connection.commit()

def seen(txid: str) -> bool:
    c = db().cursor()
    c.execute("SELECT 1 FROM seen_tx WHERE txid=?", (txid,))
    if c.fetchone():
        return True
    c.execute(
        "INSERT INTO seen_tx(txid, ts) VALUES (?,?)",
        (txid, int(time.time()))
    )
    c.connection.commit()
    return False

# ======================================================
# METRICS / HEALTH
# ======================================================
METRICS = {
    "sol_checked": 0,
    "ton_checked": 0,
    "btc_checked": 0,
    "credits": 0,
    "pending": 0,
    "errors": 0,
    "last_tick": 0,
}

async def health(request):
    return web.json_response({
        "status": "ok",
        "service": "watcher",
        "metrics": METRICS
    })

# ======================================================
# HELPERS
# ======================================================
async def alert_admin(session: aiohttp.ClientSession, text: str):
    if not TELEGRAM_BOT_TOKEN or not ADMIN_CHAT_ID:
        return
    try:
        await session.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": ADMIN_CHAT_ID, "text": text},
            timeout=aiohttp.ClientTimeout(total=5)
        )
    except Exception:
        pass

def usdt_value(asset: str, amount: float) -> float:
    price = get_price(asset)
    return amount * price if price else 0.0

def extract_uid(text: Optional[str]) -> Optional[int]:
    if not text:
        return None
    t = text.strip().lower()
    if t.startswith("uid:"):
        try:
            return int(t.split("uid:")[1])
        except:
            return None
    return None

# ======================================================
# SOL WATCHER
# ======================================================
async def watch_sol(session: aiohttp.ClientSession):
    if not TREASURY_SOL:
        return
    while True:
        try:
            METRICS["last_tick"] = int(time.time())
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getSignaturesForAddress",
                "params": [TREASURY_SOL, {"limit": 20}],
            }
            async with session.post(SOL_RPC, json=payload) as r:
                sigs = (await r.json()).get("result", [])

            for s in sigs:
                METRICS["sol_checked"] += 1
                sig = s["signature"]
                if s.get("confirmations", 0) < CONFIRM["sol"]:
                    continue
                if seen(sig):
                    continue

                tx_payload = {
                    "jsonrpc": "2.0",
                    "id": 1,
                    "method": "getTransaction",
                    "params": [sig, {"encoding": "jsonParsed"}],
                }
                async with session.post(SOL_RPC, json=tx_payload) as r:
                    tx = (await r.json()).get("result")

                if not tx:
                    continue

                meta = tx.get("meta", {})
                pre = meta.get("preBalances", [])
                post = meta.get("postBalances", [])
                if not pre or not post:
                    continue

                amount = (max(post) - max(pre)) / 1e9
                if usdt_value("sol", amount) < MIN_USDT:
                    continue

                memo = None
                for ix in tx["transaction"]["message"]["instructions"]:
                    if ix.get("program") == "spl-memo":
                        memo = ix.get("parsed")
                        break

                uid = extract_uid(memo)
                if uid:
                    credit_deposit(uid, "sol", amount, sig)
                    METRICS["credits"] += 1
                else:
                    save_pending_deposit(0, "sol", amount, sig, "missing_memo")
                    METRICS["pending"] += 1
                    await alert_admin(session, f"⚠️ Pending SOL\n{sig}\n{amount}")

        except Exception as e:
            METRICS["errors"] += 1
            await alert_admin(session, f"SOL watcher error: {e}")

        await asyncio.sleep(15)

# ======================================================
# TON + TON USDT (JETTON)
# ======================================================
async def watch_ton(session: aiohttp.ClientSession):
    if not TREASURY_TON:
        return
    while True:
        try:
            METRICS["last_tick"] = int(time.time())
            async with session.get(
                f"{TON_API}/getTransactions",
                params={"address": TREASURY_TON, "limit": 20}
            ) as r:
                data = await r.json()

            for tx in data.get("result", []):
                METRICS["ton_checked"] += 1
                txid = tx["transaction_id"]["hash"]
                if tx.get("confirmations", 0) < CONFIRM["ton"]:
                    continue
                if seen(txid):
                    continue

                # Native TON
                if tx.get("in_msg", {}).get("value"):
                    amount = int(tx["in_msg"]["value"]) / 1e9
                    if usdt_value("ton", amount) >= MIN_USDT:
                        uid = extract_uid(tx["in_msg"].get("message"))
                        if uid:
                            credit_deposit(uid, "ton", amount, txid)
                            METRICS["credits"] += 1
                        else:
                            save_pending_deposit(0, "ton", amount, txid, "missing_comment")
                            METRICS["pending"] += 1

                # TON USDT Jetton
                if TON_USDT_MASTER and tx.get("out_msgs"):
                    for msg in tx["out_msgs"]:
                        if msg.get("jetton_master") == TON_USDT_MASTER:
                            amount = int(msg["amount"]) / 1e6  # USDT decimals
                            if amount < MIN_USDT:
                                continue
                            uid = extract_uid(msg.get("comment"))
                            if uid:
                                credit_deposit(uid, "usdt", amount, txid)
                                METRICS["credits"] += 1
                            else:
                                save_pending_deposit(0, "usdt", amount, txid, "missing_comment")
                                METRICS["pending"] += 1

        except Exception as e:
            METRICS["errors"] += 1
            await alert_admin(session, f"TON watcher error: {e}")

        await asyncio.sleep(20)

# ======================================================
# BTC WATCHER
# ======================================================
async def watch_btc(session: aiohttp.ClientSession):
    if not TREASURY_BTC:
        return
    while True:
        try:
            METRICS["last_tick"] = int(time.time())
            async with session.get(f"{BTC_API}/address/{TREASURY_BTC}/txs") as r:
                txs = await r.json()

            for tx in txs:
                METRICS["btc_checked"] += 1
                txid = tx["txid"]
                if not tx.get("status", {}).get("confirmed"):
                    continue
                if seen(txid):
                    continue

                amount = 0.0
                for o in tx["vout"]:
                    if o.get("scriptpubkey_address") == TREASURY_BTC:
                        amount += o["value"] / 1e8

                if usdt_value("btc", amount) < MIN_USDT:
                    continue

                save_pending_deposit(0, "btc", amount, txid, "no_mapping")
                METRICS["pending"] += 1
                await alert_admin(session, f"⚠️ Pending BTC\n{txid}\n{amount}")

        except Exception as e:
            METRICS["errors"] += 1
            await alert_admin(session, f"BTC watcher error: {e}")

        await asyncio.sleep(30)

# ======================================================
# MAIN
# ======================================================
async def main():
    init_seen()

    app = web.Application()
    app.router.add_get("/health", health)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", 9090)
    await site.start()

    async with aiohttp.ClientSession() as session:
        await asyncio.gather(
            watch_sol(session),
            watch_ton(session),
            watch_btc(session),
        )

if __name__ == "__main__":
    asyncio.run(main())
