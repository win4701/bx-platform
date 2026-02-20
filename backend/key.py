import os
import time
import hmac
import hashlib
import logging
from collections import deque
from typing import Dict
from fastapi import HTTPException, Header, Request

# ======================================================
# ENV
# ======================================================

ENV = os.getenv("ENV", "production")

API_KEY = os.getenv("API_KEY")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")
AUDIT_TOKEN = os.getenv("AUDIT_TOKEN")
HMAC_SECRET = os.getenv("HMAC_SECRET")

WEBHOOK_WINDOW = int(os.getenv("WEBHOOK_WINDOW", 60))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", 60))

RATE_LIMIT_MAX = {
    "api": int(os.getenv("API_RATE_LIMIT", 100)),
    "admin": int(os.getenv("ADMIN_RATE_LIMIT", 50)),
    "audit": int(os.getenv("AUDIT_RATE_LIMIT", 30)),
}

# ======================================================
# LOGGING
# ======================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("security")

# ======================================================
# FAIL FAST (PRODUCTION ONLY)
# ======================================================

if ENV != "dev":
    if not API_KEY:
        raise RuntimeError("API_KEY not set")
    if not ADMIN_TOKEN:
        raise RuntimeError("ADMIN_TOKEN not set")
    if not HMAC_SECRET:
        raise RuntimeError("HMAC_SECRET not set")

# ======================================================
# RATE LIMITING (ISOLATED PER KEY)
# ======================================================

_RATE_LIMIT: Dict[str, Dict[str, deque]] = {
    scope: {} for scope in RATE_LIMIT_MAX.keys()
}

def _rate_limit(identity: str, scope: str):
    now = int(time.time())

    if not identity:
        identity = "unknown"

    scope_bucket = _RATE_LIMIT.setdefault(scope, {})
    bucket = scope_bucket.setdefault(identity, deque())

    # remove expired timestamps
    while bucket and bucket[0] < now - RATE_LIMIT_WINDOW:
        bucket.popleft()

    limit = RATE_LIMIT_MAX.get(scope, 60)

    if len(bucket) >= limit:
        logger.warning(f"Rate limit exceeded: {scope} | {identity}")
        raise HTTPException(429, "TOO_MANY_REQUESTS")

    bucket.append(now)

    # optional cleanup to avoid memory growth
    if not bucket:
        scope_bucket.pop(identity, None)

# ======================================================
# CONSTANT TIME TOKEN COMPARE
# ======================================================

def _secure_compare(a: str, b: str):
    return hmac.compare_digest(a or "", b or "")

# ======================================================
# HMAC VALIDATION WITH REPLAY PROTECTION
# ======================================================

def verify_hmac(payload: bytes, signature: str, timestamp: str):
    if not HMAC_SECRET:
        raise HTTPException(500, "HMAC_SECRET_NOT_SET")

    if not signature:
        raise HTTPException(403, "SIGNATURE_REQUIRED")

    if not timestamp:
        raise HTTPException(403, "TIMESTAMP_REQUIRED")

    try:
        ts = int(timestamp)
    except Exception:
        raise HTTPException(403, "INVALID_TIMESTAMP")

    now = int(time.time())

    if abs(now - ts) > WEBHOOK_WINDOW:
        raise HTTPException(403, "WEBHOOK_EXPIRED")

    expected = hmac.new(
        HMAC_SECRET.encode(),
        payload + timestamp.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        logger.warning("Invalid HMAC signature")
        raise HTTPException(403, "INVALID_SIGNATURE")

    return True

# ======================================================
# API GUARD
# ======================================================

def api_guard(
    request: Request,
    x_api_key: str = Header(None)
):
    client_ip = request.client.host

    if not _secure_compare(x_api_key, API_KEY):
        logger.warning(f"Invalid API key from {client_ip}")
        raise HTTPException(401, "INVALID_API_KEY")

    _rate_limit(client_ip, "api")
    return True

# ======================================================
# ADMIN GUARD
# ======================================================

def admin_guard(
    request: Request,
    x_admin_token: str = Header(None)
):
    client_ip = request.client.host

    if not _secure_compare(x_admin_token, ADMIN_TOKEN):
        logger.warning(f"Invalid admin token from {client_ip}")
        raise HTTPException(401, "INVALID_ADMIN_TOKEN")

    _rate_limit(x_admin_token, "admin")
    return True

# ======================================================
# AUDIT GUARD
# ======================================================

def audit_guard(
    request: Request,
    x_audit_token: str = Header(None)
):
    client_ip = request.client.host

    if not _secure_compare(x_audit_token, AUDIT_TOKEN):
        logger.warning(f"Invalid audit token from {client_ip}")
        raise HTTPException(401, "INVALID_AUDIT_TOKEN")

    _rate_limit(x_audit_token, "audit")
    return True

# ======================================================
# WEBHOOK GUARD (HMAC + TIMESTAMP)
# ======================================================

async def webhook_guard(
    request: Request,
    x_signature: str = Header(None),
    x_timestamp: str = Header(None)
):
    payload = await request.body()
    verify_hmac(payload, x_signature, x_timestamp)
    return True
