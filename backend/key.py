# ======================================================
# key.py
# Security, Guards & Signatures (Production)
# ======================================================

import os
import time
import hmac
import hashlib
from fastapi import Header, HTTPException, Request

# ======================================================
# ENV KEYS
# ======================================================

API_KEY        = os.getenv("API_KEY")          # public app access
ADMIN_TOKEN    = os.getenv("ADMIN_TOKEN")      # admin operations
AUDIT_TOKEN    = os.getenv("AUDIT_TOKEN")      # read-only auditor
HMAC_SECRET    = os.getenv("HMAC_SECRET")      # webhooks / signed payloads

if not API_KEY:
    raise RuntimeError("API_KEY not set")

# ======================================================
# SIMPLE IN-MEMORY RATE LIMIT
# (Good enough for single instance)
# ======================================================

_RATE_LIMIT = {}
RATE_LIMIT_WINDOW = 60      # seconds
RATE_LIMIT_MAX = {
    "api": 120,
    "admin": 60,
    "audit": 60,
    "webhook": 30,
}

def _rate_limit(key: str, scope: str):
    now = int(time.time())
    bucket = _RATE_LIMIT.get(key, [])
    bucket = [t for t in bucket if now - t < RATE_LIMIT_WINDOW]

    limit = RATE_LIMIT_MAX.get(scope, 60)
    if len(bucket) >= limit:
        raise HTTPException(429, "TOO_MANY_REQUESTS")

    bucket.append(now)
    _RATE_LIMIT[key] = bucket

# ======================================================
# GUARDS
# ======================================================

def api_guard(x_api_key: str = Header(None)):
    """
    User / App access
    """
    if x_api_key != API_KEY:
        raise HTTPException(401, "INVALID_API_KEY")

    _rate_limit(f"api:{x_api_key}", "api")
    return True


def admin_guard(x_admin_token: str = Header(None)):
    """
    Admin only access
    """
    if not ADMIN_TOKEN or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(403, "ADMIN_ONLY")

    _rate_limit("admin", "admin")
    return True


def audit_guard(x_audit_token: str = Header(None)):
    """
    Auditor (read-only)
    """
    if not AUDIT_TOKEN or x_audit_token != AUDIT_TOKEN:
        raise HTTPException(403, "AUDIT_ONLY")

    _rate_limit("audit", "audit")
    return True

# ======================================================
# WEBHOOK GUARD (BLOCKCHAIN / PARTNERS)
# ======================================================

def webhook_guard(
    request: Request,
    x_signature: str = Header(None)
):
    """
    Used by watcher.py for blockchain webhooks
    """
    if not HMAC_SECRET:
        raise HTTPException(500, "HMAC_SECRET_NOT_SET")

    raw = request.scope.get("_body")
    if raw is None:
        raise HTTPException(400, "EMPTY_BODY")

    verify_hmac(raw, x_signature)

    ip = request.client.host
    _rate_limit(f"webhook:{ip}", "webhook")
    return True

# ======================================================
# HMAC VERIFY
# ======================================================

def verify_hmac(payload: bytes, signature: str):
    """
    Verify HMAC-SHA256 signature
    signature = hex string
    """
    if not signature:
        raise HTTPException(403, "SIGNATURE_REQUIRED")

    mac = hmac.new(
        HMAC_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(mac, signature):
        raise HTTPException(403, "INVALID_SIGNATURE")

    return True
