import os
import time
import hmac
import hashlib
import logging
from collections import deque
from fastapi import HTTPException, Header, Request

# ======================================================
# LOGGING
# ======================================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("security")

# ======================================================
# CONFIGURATION (ENV)
# ======================================================
API_KEY = os.getenv("API_KEY")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")
AUDIT_TOKEN = os.getenv("AUDIT_TOKEN")
HMAC_SECRET = os.getenv("HMAC_SECRET")

WEBHOOK_WINDOW = int(os.getenv("WEBHOOK_WINDOW", 60))
WEBHOOK_LIMIT = int(os.getenv("WEBHOOK_LIMIT", 100))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", 60))

RATE_LIMIT_MAX = {
    "api": int(os.getenv("API_RATE_LIMIT", 100)),
    "admin": int(os.getenv("ADMIN_RATE_LIMIT", 50)),
    "audit": int(os.getenv("AUDIT_RATE_LIMIT", 30)),
}

# ======================================================
# VALIDATION AT STARTUP (FAIL FAST)
# ======================================================
if not API_KEY:
    logger.warning("API_KEY is not set")

if not ADMIN_TOKEN:
    logger.warning("ADMIN_TOKEN is not set")

if not HMAC_SECRET:
    logger.warning("HMAC_SECRET is not set")

# ======================================================
# RATE LIMITING (IN-MEMORY)
# ======================================================
_RATE_LIMIT = {k: deque() for k in RATE_LIMIT_MAX.keys()}

def _rate_limit(key: str, scope: str):
    if not key:
        key = "unknown"

    now = int(time.time())
    bucket = _RATE_LIMIT.setdefault(scope, deque())

    while bucket and bucket[0] < now - RATE_LIMIT_WINDOW:
        bucket.popleft()

    limit = RATE_LIMIT_MAX.get(scope, 60)
    if len(bucket) >= limit:
        raise HTTPException(429, "TOO_MANY_REQUESTS")

    bucket.append(now)

# ======================================================
# HMAC VALIDATION (WEBHOOKS)
# ======================================================
def verify_hmac(payload: bytes, signature: str):
    if not HMAC_SECRET:
        raise HTTPException(500, "HMAC_SECRET_NOT_SET")

    if not signature:
        raise HTTPException(403, "SIGNATURE_REQUIRED")

    expected = hmac.new(
        HMAC_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(403, "INVALID_SIGNATURE")

    return True

# ======================================================
# API GUARD
# ======================================================
def api_guard(
    x_api_key: str = Header(None),
    x_ip: str = Header(None)
):
    if x_api_key != API_KEY:
        raise HTTPException(401, "INVALID_API_KEY")

    _rate_limit(x_ip or "api", "api")
    return True

# ======================================================
# ADMIN GUARD
# ======================================================
def admin_guard(
    x_admin_token: str = Header(None)
):
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(401, "INVALID_ADMIN_TOKEN")

    _rate_limit(x_admin_token, "admin")
    return True

# ======================================================
# AUDIT GUARD
# ======================================================
def audit_guard(
    x_audit_token: str = Header(None)
):
    if x_audit_token != AUDIT_TOKEN:
        raise HTTPException(401, "INVALID_AUDIT_TOKEN")

    _rate_limit(x_audit_token, "audit")
    return True

# ======================================================
# WEBHOOK GUARD
# ======================================================
async def webhook_guard(
    request: Request,
    x_signature: str = Header(None)
):
    payload = await request.body()
    verify_hmac(payload, x_signature)
    return True
