import time
import hashlib
import hmac
from fastapi import APIRouter, HTTPException

from database import db, close_connection
from config import WATCHER_SECRET, WEBHOOK_WINDOW, WEBHOOK_LIMIT, NOTIFY_EMAILS

router = APIRouter()

# ======================================================
# WEBHOOK VERIFICATION
# ======================================================
def verify_signature(payload: bytes, signature: str):
    """
    Verify that the signature matches the expected signature for the webhook.
    """
    if not signature:
        raise HTTPException(403, "SIGNATURE_REQUIRED")

    expected = hmac.new(
        WATCHER_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        notify_admin("Invalid webhook signature")
        raise HTTPException(403, "INVALID_SIGNATURE")


# ======================================================
# RATE LIMITING
# ======================================================
def rate_limit(ip: str):
    """
    Check if the IP address has exceeded the rate limit for webhooks.
    """
    now = int(time.time())
    conn = db()
    c = conn.cursor()

    hits = c.execute(
        "SELECT COUNT(*) FROM webhook_hits WHERE ip=? AND ts>?",
        (ip, now - WEBHOOK_WINDOW)
    ).fetchone()[0]

    if hits >= WEBHOOK_LIMIT:
        notify_admin(f"Webhook rate-limit exceeded from IP {ip}")
        close_connection(conn)
        raise HTTPException(429, "RATE_LIMIT")

    c.execute(
        "INSERT INTO webhook_hits(ip, ts) VALUES (?,?)",
        (ip, now)
    )

    close_connection(conn)


# ======================================================
# DEPOSIT EXISTENCE CHECK
# ======================================================
def deposit_exists(txid: str) -> bool:
    """
    Check if a deposit with the given txid already exists (replay protection).
    """
    conn = db()
    c = conn.cursor()

    exists = c.execute(
        "SELECT 1 FROM used_txs WHERE txid=?",
        (txid,)
    ).fetchone() is not None

    close_connection(conn)
    return exists


# ======================================================
# NOTIFY ADMIN
# ======================================================
def notify_admin(message: str):
    """
    Notify admins about important watcher events.
    """
    for email in NOTIFY_EMAILS:
        # Placeholder (email / telegram / slack)
        print(f"[WATCHER] Notify {email}: {message}")


# ======================================================
# HANDLE WEBHOOK EVENTS
# ======================================================
@router.post("/webhook")
async def handle_webhook(payload: dict, signature: str, ip: str):
    """
    Handle incoming webhook events.
    """
    verify_signature(str(payload).encode(), signature)
    rate_limit(ip)

    txid = payload.get("txid")
    amount = payload.get("amount")
    asset = payload.get("asset")

    if not txid or not asset or amount is None:
        raise HTTPException(400, "INVALID_PAYLOAD")

    # Replay protection
    if deposit_exists(txid):
        return {"status": "ignored", "reason": "duplicate"}

    try:
        conn = db()
        c = conn.cursor()

        # Mark tx as used (replay protection)
        c.execute(
            "INSERT OR IGNORE INTO used_txs (txid, asset, ts) VALUES (?, ?, ?)",
            (txid, asset, int(time.time()))
        )

        # Save as pending deposit (review / auto-approve later)
        c.execute(
            """INSERT OR IGNORE INTO pending_deposits
               (txid, uid, asset, amount, reason, ts)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (txid, 0, asset, amount, "watcher", int(time.time()))
        )

        close_connection(conn)

        notify_admin(f"New deposit detected: {amount} {asset} | txid={txid}")

        return {"status": "received", "txid": txid}

    except Exception as e:
        notify_admin(f"Watcher error: {str(e)}")
        raise HTTPException(500, "WATCHER_ERROR")


# ======================================================
# WITHDRAW HELPERS (INTERNAL)
# ======================================================
def can_withdraw(asset: str, amount: float) -> bool:
    """
    Check hot wallet balance before sending withdrawals.
    """
    conn = db()
    c = conn.cursor()

    row = c.execute(
        f"SELECT {asset} FROM wallet_vaults WHERE asset=?",
        (asset,)
    ).fetchone()

    close_connection(conn)

    return bool(row and row[0] >= amount)


def update_withdraw_status(wid: int, status: str, txid: str):
    conn = db()
    c = conn.cursor()

    c.execute(
        "UPDATE withdraw_queue SET status=?, txid=? WHERE id=?",
        (status, txid, wid)
    )

    close_connection(conn)


def send_tx(asset: str, amount: float, address: str) -> str:
    """
    Simulate sending a transaction.
    """
    print(f"[WATCHER] Sending {amount} {asset} → {address}")
    return f"tx_{int(time.time())}"


def process_withdrawals():
    """
    Process approved withdrawals (batch).
    """
    conn = db()
    c = conn.cursor()

    rows = c.execute(
        """SELECT id, uid, asset, amount, address
           FROM withdraw_queue
           WHERE status='approved'
           ORDER BY ts ASC
           LIMIT 10"""
    ).fetchall()

    close_connection(conn)

    processed = []

    for wid, uid, asset, amount, address in rows:
        if not can_withdraw(asset, amount):
            notify_admin(f"Insufficient hot balance for {asset}")
            continue

        try:
            txid = send_tx(asset, amount, address)
            update_withdraw_status(wid, "sent", txid)
            processed.append(wid)
            notify_admin(f"Withdraw sent: {amount} {asset} → {address}")
        except Exception as e:
            notify_admin(f"Withdraw failed: {str(e)}")

    return {"processed": processed}


# ======================================================
# TEST
# ======================================================
@router.post("/test")
async def test_webhook():
    payload = {"txid": "test123", "amount": 10, "asset": "USDT"}
    signature = hmac.new(
        WATCHER_SECRET.encode(),
        str(payload).encode(),
        hashlib.sha256
    ).hexdigest()

    return await handle_webhook(payload, signature, "127.0.0.1")
