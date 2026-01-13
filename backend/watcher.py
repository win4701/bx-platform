import os
import time
import asyncio
import sqlite3
from typing import Optional, Dict

import aiohttp
from aiohttp import web

from finance import credit_deposit, save_pending_deposit
from pricing import get_price

# ======================================================
# CONFIG / ENV
# ======================================================
DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")

TREASURY_SOL = os.getenv("TREASURY_SOL")
TREASURY_TON = os.getenv("TREASURY_TON")
TREASURY_BTC = os.getenv("TREASURY_BTC")

SOL_RPC = os.getenv("SOL_RPC", "https://api.mainnet-beta.solana.com")
TON_API = os.getenv("TON_API", "https://toncenter.com/api/v2")
BTC_API = os.getenv("BTC_API", "https://blockstream.info/api")

MIN_DEPOSIT_USDT = float(os.getenv("MIN_DEPOSIT_USDT", "10"))

CONFIRM = {
    "sol": int(os.getenv("SOL_CONFIRMATIONS", "10")),
    "ton": int(os.getenv("TON_CONFIRMATIONS", "5")),
    "btc": int(os.getenv("BTC_CONFIRMATIONS", "3")),
}

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
ADMIN_CHAT_ID = os.getenv("ADMIN_CHAT_ID")

# ======================================================
# DB
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def init_db():
    c = db().cursor()

    c.execute("""
        CREATE TABLE IF NOT EXISTS seen_tx (
            txid TEXT PRIMARY KEY,
            ts INTEGER
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS watcher_metrics (
            key TEXT PRIMARY KEY,
            value INTEGER,
            ts INTEGER
        )
    """)

    c.execute("""
        CREATE TABLE IF NOT EXISTS jettons (
            master TEXT PRIMARY KEY,
            symbol TEXT,
            decimals INTEGER,
            ts INTEGER
        )
    """)

    c.connection.commit()

# ======================================================
# DEDUP
# ======================================================
def seen(txid: str) -> bool:
    c = db().cursor()
    if c.execute("SELECT 1 FROM seen_tx WHERE txid=?", (txid,)).fetchone():
        return True
    c.execute(
        "INSERT INTO seen_tx(txid, ts) VALUES (?,?)",
        (txid, int(time.time()))
    )
    c.connection.commit()
    return False

# ======================================================
# METRICS (PERSISTENT)
# ======================================================
def metric_inc(key: str, n: int = 1):
    ts = int(time.time())
    c = db().cursor()
    c.execute("""
        INSERT INTO watcher_metrics(key, value, ts)
        VALUES (?,?,?)
        ON CONFLICT(key) DO UPDATE SET
          value = value + excluded.value,
          ts = excluded.ts
    """, (key, n, ts))
    c.connection.commit()

def read_metrics() -> Dict:
    c = db().cursor()
    rows = c.execute("SELECT key, value, ts FROM watcher_metrics").fetchall()
    return {k: {"value": v, "ts": ts} for k, v, ts in rows}

# ======================================================
# HELPERS
# ======================================================
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

async def alert_admin(session: aiohttp.ClientSession, msg: str):
    if not TELEGRAM_BOT_TOKEN or not ADMIN_CHAT_ID:
        return
    try:
        await session.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": ADMIN_CHAT_ID, "text": msg},
            timeout=aiohttp.ClientTimeout(total=5)
        )
    except:
        pass

# ======================================================
# JETTON CACHE (DB)
# ======================================================
def get_cached_jetton(master: str):
    c = db().cursor()
    r = c.execute(
        "SELECT symbol, decimals FROM jettons WHERE master=?",
        (master,)
    ).fetchone()
    if r:
        return {"symbol": r[0], "decimals": r[1]}
    return None

def save_jetton(master: str, symbol: str, decimals: int):
    c = db().cursor()
    c.execute(
        "INSERT OR REPLACE INTO jettons(master, symbol, decimals, ts) VALUES (?,?,?,?)",
        (master, symbol, decimals, int(time.time()))
    )
    c.connection.commit()

async def fetch_jetton_meta(session, master: str):
    cached = get_cached_jetton(master)
    if cached:
        return cached

    async with session.get(
        f"{TON_API}/getJettonData",
        params={"address": master}
    ) as r:
        data = await r.json()

    meta = {
        "symbol": data["result"].get("symbol"),
        "decimals": int(data["result"].get("decimals", 9))
    }
    save_jetton(master, meta["symbol"], meta["decimals"])
    return meta

# ======================================================
# SOL WATCHER
# ======================================================
async def watch_sol(session):
    if not TREASURY_SOL:
        return
    while True:
        try:
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getSignaturesForAddress",
                "params": [TREASURY_SOL, {"limit": 20}],
            }
            async with session.post(SOL_RPC, json=payload) as r:
                sigs = (await r.json()).get("result", [])

            for s in sigs:
                metric_inc("sol_checked")
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
                if usdt_value("sol", amount) < MIN_DEPOSIT_USDT:
                    continue

                memo = None
                for ix in tx["transaction"]["message"]["instructions"]:
                    if ix.get("program") == "spl-memo":
                        memo = ix.get("parsed")
                        break

                uid = extract_uid(memo)
                if uid:
                    credit_deposit(uid, "sol", amount, sig)
                    metric_inc("credits")
                else:
                    save_pending_deposit(0, "sol", amount, sig, "missing_memo")
                    metric_inc("pending")
                    await alert_admin(session, f"⚠️ Pending SOL\n{sig}")

        except Exception as e:
            metric_inc("errors")
            await alert_admin(session, f"SOL watcher error: {e}")

        await asyncio.sleep(15)

# ======================================================
# TON + TON USDT JETTON WATCHER
# ======================================================
async def watch_ton(session):
    if not TREASURY_TON:
        return
    while True:
        try:
            async with session.get(
                f"{TON_API}/getTransactions",
                params={"address": TREASURY_TON, "limit": 20}
            ) as r:
                data = await r.json()

            for tx in data.get("result", []):
                metric_inc("ton_checked")
                txid = tx["transaction_id"]["hash"]
                if tx.get("confirmations", 0) < CONFIRM["ton"]:
                    continue
                if seen(txid):
                    continue

                # Native TON
                if tx.get("in_msg", {}).get("value"):
                    amount = int(tx["in_msg"]["value"]) / 1e9
                    if usdt_value("ton", amount) >= MIN_DEPOSIT_USDT:
                        uid = extract_uid(tx["in_msg"].get("message"))
                        if uid:
                            credit_deposit(uid, "ton", amount, txid)
                            metric_inc("credits")
                        else:
                            save_pending_deposit(0, "ton", amount, txid, "missing_comment")
                            metric_inc("pending")

                # Jettons
                for msg in tx.get("out_msgs", []):
                    if msg.get("op") != "jetton_transfer":
                        continue
                    master = msg.get("jetton_master")
                    if not master:
                        continue

                    meta = await fetch_jetton_meta(session, master)
                    if meta["symbol"] != "USDT":
                        continue

                    amount = int(msg["amount"]) / (10 ** meta["decimals"])
                    if amount < MIN_DEPOSIT_USDT:
                        continue

                    uid = extract_uid(msg.get("comment"))
                    if uid:
                        credit_deposit(uid, "usdt", amount, txid)
                        metric_inc("credits")
                    else:
                        save_pending_deposit(0, "usdt", amount, txid, "missing_comment")
                        metric_inc("pending")

        except Exception as e:
            metric_inc("errors")
            await alert_admin(session, f"TON watcher error: {e}")

        await asyncio.sleep(20)

# ======================================================
# BTC WATCHER (TREASURY ONLY → PENDING)
# ======================================================
async def watch_btc(session):
    if not TREASURY_BTC:
        return
    while True:
        try:
            async with session.get(f"{BTC_API}/address/{TREASURY_BTC}/txs") as r:
                txs = await r.json()

            for tx in txs:
                metric_inc("btc_checked")
                txid = tx["txid"]
                if not tx.get("status", {}).get("confirmed"):
                    continue
                if seen(txid):
                    continue

                amount = sum(
                    o["value"] for o in tx["vout"]
                    if o.get("scriptpubkey_address") == TREASURY_BTC
                ) / 1e8

                if usdt_value("btc", amount) < MIN_DEPOSIT_USDT:
                    continue

                save_pending_deposit(0, "btc", amount, txid, "no_mapping")
                metric_inc("pending")
                await alert_admin(session, f"⚠️ Pending BTC\n{txid}")

        except Exception as e:
            metric_inc("errors")
            await alert_admin(session, f"BTC watcher error: {e}")

        await asyncio.sleep(30)

# ======================================================
# HEALTH / METRICS SERVER
# ======================================================
async def health(request):
    return web.json_response({
        "status": "ok",
        "service": "watcher",
        "metrics": read_metrics()
    })

async def metrics_prom(request):
    lines = []
    for k, v in read_metrics().items():
        lines.append(f"bloxio_watcher_{k} {v['value']}")
    return web.Response(text="\n".join(lines), content_type="text/plain")

# ======================================================
# MAIN
# ======================================================
async def main():
    init_db()

    app = web.Application()
    app.router.add_get("/health", health)
    app.router.add_get("/metrics", metrics_prom)

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
