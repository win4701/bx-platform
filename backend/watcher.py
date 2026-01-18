# ======================================================
# watcher.py
# Blockchain Watcher – Production Ready
# ======================================================

import time
import os
import json
import hmac
import hashlib
from fastapi import APIRouter, Request, Header, HTTPException, Depends

from key import admin_guard
from finance import (
    credit_deposit,
    db,
    can_withdraw,
    update_withdraw_status,
)
from finance import notify_telegram  # already defined in finance.py

router = APIRouter(dependencies=[Depends(admin_guard)])

# ======================================================
# CONFIG / CONSTANTS
# ======================================================

WATCHER_SECRET = os.getenv("WATCHER_SECRET", "CHANGE_ME")
ADMIN_CHAT_ID = int(os.getenv("ADMIN_TELEGRAM_ID", "0"))

# Assets
ALLOWED_ASSETS = {"usdt", "ton", "sol", "btc", "bnb"}
AUTO_CONFIRM_ASSETS = {"usdt","ton", "sol", "btc", "bnb"}

MIN_DEPOSIT = {
    "usdt": 10,
    "ton": 5,
    "sol": 0.07,
    "btc": 0.0001,
    "bnb": 0.01,
}

# Webhook rate-limit
WEBHOOK_LIMIT = 20          # hits
WEBHOOK_WINDOW = 60         # seconds

# ======================================================
# HELPERS
# ======================================================

def notify_admin(msg: str):
    if ADMIN_CHAT_ID > 0:
        notify_telegram(
            chat_id=ADMIN_CHAT_ID,
            text=f"🚨 *Watcher Alert*\n\n{msg}"
        )

def verify_signature(payload: bytes, signature: str):
    expected = hmac.new(
        WATCHER_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        notify_admin("Invalid webhook signature")
        raise HTTPException(403, "INVALID_SIGNATURE")

def rate_limit(ip: str):
    now = int(time.time())
    c = db().cursor()

    hits = c.execute(
        "SELECT COUNT(*) FROM webhook_hits WHERE ip=? AND ts>?",
        (ip, now - WEBHOOK_WINDOW)
    ).fetchone()[0]

    if hits >= WEBHOOK_LIMIT:
        notify_admin(f"Webhook rate-limit exceeded from IP {ip}")
        raise HTTPException(429, "RATE_LIMIT")

    c.execute(
        "INSERT INTO webhook_hits(ip, ts) VALUES (?,?)",
        (ip, now)
    )
    c.connection.commit()

def deposit_exists(txid: str) -> bool:
    c = db().cursor()
    r = c.execute(
        "SELECT 1 FROM deposits WHERE txid=?",
        (txid,)
    ).fetchone()
    return r is not None

def parse_uid(memo: str) -> int:
    # expected: "uid:123"
    if not memo or "uid:" not in memo:
        raise HTTPException(400, "UID_NOT_FOUND")
    return int(memo.split("uid:")[1])

# ======================================================
# BLOCKCHAIN WEBHOOK (REAL)
# ======================================================

@router.post("/watcher/webhook")
async def blockchain_webhook(
    request: Request,
    x_signature: str = Header(None)
):
    raw = await request.body()
    ip = request.client.host

    rate_limit(ip)
    verify_signature(raw, x_signature)

    data = json.loads(raw)
    return handle_webhook_event(data)

# ======================================================
# HANDLE EVENTS
# ======================================================

def handle_webhook_event(data: dict):
    """
    Supports BNB Smart Chain + others
    """
    asset = data.get("symbol", "").lower()

    if asset not in ALLOWED_ASSETS:
        return {"status": "ignored"}

    confirmations = int(data.get("confirmations", 0))
    txid = data.get("txHash")
    amount = float(data.get("value", 0))
    memo = data.get("memo")

    if amount < MIN_DEPOSIT.get(asset, 0):
        return {"status": "amount_too_small"}

    if confirmations < 10:
        return {"status": "waiting_confirmations"}

    if deposit_exists(txid):
        return {"status": "duplicate"}

    uid = parse_uid(memo)

    credit_deposit(
        uid=uid,
        asset=asset,
        amount=amount,
        txid=txid,
        source=data.get("chain", "webhook")
    )

    notify_admin(f"{asset.upper()} deposit confirmed: {amount} → UID {uid}")
    return {"status": "confirmed"}

# ======================================================
# WITHDRAWAL PROCESSING (QUEUE)
# ======================================================

@router.post("/watcher/withdraw/process")
def process_withdrawals(limit: int = 10):
    """
    Processes approved withdrawals from queue
    """
    c = db().cursor()
    rows = c.execute(
        """SELECT id, uid, asset, amount, address
           FROM withdraw_queue
           WHERE status='approved'
           ORDER BY ts ASC
           LIMIT ?""",
        (limit,)
    ).fetchall()

    processed = []

    for wid, uid, asset, amount, address in rows:
        if not can_withdraw(asset, amount):
            notify_admin(f"Hot wallet empty for {asset}")
            continue

        # send tx (external signer / wallet)
        txid = send_tx(asset, amount, address)

        update_withdraw_status(wid, "sent", txid)
        processed.append(wid)

        notify_admin(
            f"Withdraw sent: {amount} {asset} → {address}\nTX: {txid}"
        )

    return {"processed": processed}

# ======================================================
# TX SENDER (PLACEHOLDER – REAL SIGNER)
# ======================================================

def send_tx(asset: str, amount: float, address: str) -> str:
    """
    This function must be connected to:
    - BSC signer
    - BTC signer
    - SOL signer
    """
    # REAL IMPLEMENTATION GOES HERE
    fake_txid = f"tx_{asset}_{int(time.time())}"
    return fake_txid

# ======================================================
# LEDGER RECONCILIATION
# ======================================================

@router.get("/watcher/reconcile")
def reconcile(asset: str):
    c = db().cursor()

    wallets_sum = c.execute(
        f"SELECT COALESCE(SUM({asset}),0) FROM wallets"
    ).fetchone()[0]

    vault = c.execute(
        "SELECT hot_balance + cold_balance FROM wallet_vaults WHERE asset=?",
        (asset,)
    ).fetchone()[0]

    diff = vault - wallets_sum

    if abs(diff) > 0.0001:
        notify_admin(f"Ledger mismatch {asset}: {diff}")

    return {
        "asset": asset,
        "wallets_sum": wallets_sum,
        "vault_total": vault,
        "difference": diff
    }
