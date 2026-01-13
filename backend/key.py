import os
import time
import hmac
import hashlib
from fastapi import Header, HTTPException

# ======================================================
# ENV
# ======================================================
API_KEY = os.getenv("API_KEY")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")
AUDIT_TOKEN = os.getenv("AUDIT_TOKEN")
HMAC_SECRET = os.getenv("HMAC_SECRET", "")

# ======================================================
# SIMPLE RATE LIMIT (IN-MEMORY)
# ======================================================
_RATE_LIMIT = {}
RATE_LIMIT_WINDOW = 60      # seconds
RATE_LIMIT_MAX = 120        # requests per window


def _rate_limit(key: str):
    now = int(time.time())
    bucket = _RATE_LIMIT.get(key, [])
    bucket = [t for t in bucket if now - t < RATE_LIMIT_WINDOW]

    if len(bucket) >= RATE_LIMIT_MAX:
        raise HTTPException(429, "TOO_MANY_REQUESTS")

    bucket.append(now)
    _RATE_LIMIT[key] = bucket


# ======================================================
# GUARDS
# ======================================================
def api_guard(x_api_key: str = Header(None)):
    """
    USER / APP access
    """
    if not API_KEY or x_api_key != API_KEY:
        raise HTTPException(401, "INVALID_API_KEY")
    _rate_limit(f"api:{x_api_key}")
    return True


def admin_guard(x_admin_token: str = Header(None)):
    """
    ADMIN only access
    """
    if not ADMIN_TOKEN or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(403, "ADMIN_ONLY")
    _rate_limit("admin")
    return True


def audit_guard(x_audit_token: str = Header(None)):
    """
    AUDITOR (read-only) access
    """
    if not AUDIT_TOKEN or x_audit_token != AUDIT_TOKEN:
        raise HTTPException(403, "AUDIT_ONLY")
    _rate_limit("audit")
    return True


# ======================================================
# HMAC VERIFY (WEBHOOKS / SIGNED PAYLOADS)
# ======================================================
def verify_hmac(payload: bytes, signature: str):
    """
    Verify HMAC-SHA256 signature
    signature = hex string
    """
    if not HMAC_SECRET:
        raise HTTPException(500, "HMAC_SECRET_NOT_SET")

    mac = hmac.new(
        HMAC_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(mac, signature):
        raise HTTPException(403, "INVALID_SIGNATURE")

    return True
