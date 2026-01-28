import time
import hashlib
import hmac
from fastapi import APIRouter, HTTPException
from database import db, close_connection, get_cursor
from config import WATCHER_SECRET, WEBHOOK_WINDOW, WEBHOOK_LIMIT, NOTIFY_EMAILS

router = APIRouter()

# ======================================================
# WEBHOOK VERIFICATION
# ======================================================
def verify_signature(payload: bytes, signature: str):
    """
    Verify that the signature matches the expected signature for the webhook.
    """
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
    close_connection(c.connection)


# ======================================================
# DEPOSIT EXISTENCE CHECK
# ======================================================
def deposit_exists(txid: str) -> bool:
    """
    Check if a deposit with the given txid already exists in the database.
    """
    c = db().cursor()
    result = c.execute(
        "SELECT 1 FROM deposits WHERE txid=?",
        (txid,)
    ).fetchone()

    return result is not None


# ======================================================
# NOTIFY ADMIN (for errors or important events)
# ======================================================
def notify_admin(message: str):
    """
    Send a notification to admins (you could integrate an email API here).
    """
    for email in NOTIFY_EMAILS:
        # Placeholder for email sending functionality
        print(f"Sending notification to admin: {email}, message: {message}")


# ======================================================
# HANDLE WEBHOOK EVENTS
# ======================================================
@router.post("/webhook")
async def handle_webhook(payload: dict, signature: str, ip: str):
    """
    Handle incoming webhook events, including verifying the signature
    and processing the transaction.
    """
    try:
        verify_signature(payload.encode(), signature)
        rate_limit(ip)
    except HTTPException as e:
        raise e

    # Assuming the payload contains a "txid" and "amount"
    txid = payload.get("txid")
    amount = payload.get("amount")
    asset = payload.get("asset")

    # Check if the deposit is already recorded
    if deposit_exists(txid):
        return {"status": "ignored", "message": "Duplicate deposit"}

    # Process deposit
    try:
        # Example of updating wallet and saving deposit to the database
        c = db().cursor()
        c.execute(
            "INSERT INTO deposits (txid, asset, amount, ts) VALUES (?, ?, ?, ?)",
            (txid, asset, amount, int(time.time()))
        )
        c.connection.commit()
        close_connection(c.connection)

        # Notify the admin about the new deposit
        notify_admin(f"New deposit received: {amount} {asset}, txid: {txid}")

        return {"status": "success", "message": "Deposit processed"}
    except Exception as e:
        print(f"Error processing deposit: {e}")
        notify_admin(f"Error processing deposit {txid}: {str(e)}")
        raise HTTPException(500, "Failed to process deposit")


# ======================================================
# HANDLE WITHDRAWALS
# ======================================================
def can_withdraw(asset: str, amount: float) -> bool:
    """
    Check if the withdrawal can proceed by ensuring sufficient funds
    and no issues with the withdrawal limits.
    """
    c = db().cursor()
    balance = c.execute(
        f"SELECT {asset} FROM wallets WHERE uid=?",
        (1,)  # Use actual user ID here
    ).fetchone()[0]

    return balance >= amount


def process_withdrawals():
    """
    Process withdrawals from the queue. This will involve checking
    the transaction data, verifying the signature, and sending the transaction.
    """
    c = db().cursor()
    rows = c.execute(
        """SELECT id, uid, asset, amount, address
           FROM withdraw_queue
           WHERE status='approved'
           ORDER BY ts ASC
           LIMIT 10"""
    ).fetchall()

    processed = []

    for wid, uid, asset, amount, address in rows:
        if not can_withdraw(asset, amount):
            notify_admin(f"Hot wallet empty for {asset}")
            continue

        try:
            # send tx (external signer / wallet)
            txid = send_tx(asset, amount, address)
            update_withdraw_status(wid, "sent", txid)
            processed.append(wid)
            notify_admin(f"Withdraw sent: {amount} {asset} → {address}, TX: {txid}")
        except Exception as e:
            notify_admin(f"Withdraw processing failed: {str(e)}")

    return {"processed": processed}


def update_withdraw_status(wid: int, status: str, txid: str):
    """
    Update the status of a withdrawal request in the database.
    """
    c = db().cursor()
    c.execute(
        "UPDATE withdraw_queue SET status=?, txid=? WHERE id=?",
        (status, txid, wid)
    )
    c.connection.commit()
    close_connection(c.connection)


# ======================================================
# SEND TX (For sending transactions to blockchain or another system)
# ======================================================
def send_tx(asset: str, amount: float, address: str):
    """
    Simulate sending a transaction (e.g., to a blockchain).
    In a real system, this would interact with a blockchain API or wallet.
    """
    # Simulate transaction sending
    print(f"Sending {amount} {asset} to {address}")
    return "tx123456789"  # Example txid


# ======================================================
# TESTING (Can be used for testing webhooks or other processes)
# ======================================================
@router.post("/test")
async def test_webhook():
    # Example test for webhook processing
    payload = {"txid": "12345", "amount": 100, "asset": "USDT"}
    signature = "signature"
    ip = "127.0.0.1"
    return await handle_webhook(payload, signature, ip)
