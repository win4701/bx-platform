import os
import time
import hmac
import hashlib
from fastapi import HTTPException, Header, Request

# ======================================================
# CONFIGURATION - ENVIRONMENT VARIABLES
# ======================================================
API_KEY = os.getenv("API_KEY")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")
AUDIT_TOKEN = os.getenv("AUDIT_TOKEN")
HMAC_SECRET = os.getenv("HMAC_SECRET")
WEBHOOK_WINDOW = int(os.getenv("WEBHOOK_WINDOW", 60))  # in seconds
WEBHOOK_LIMIT = int(os.getenv("WEBHOOK_LIMIT", 100))  # max requests per window
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", 60))  # in seconds
RATE_LIMIT_MAX = {
    "api": int(os.getenv("API_RATE_LIMIT", 100)),
    "admin": int(os.getenv("ADMIN_RATE_LIMIT", 50)),
    "audit": int(os.getenv("AUDIT_RATE_LIMIT", 30))
}

# ======================================================
# RATE LIMITING MECHANISM
# ======================================================
from collections import deque

# Initialize with deque for better performance
_RATE_LIMIT = {key: deque() for key in RATE_LIMIT_MAX.keys()}

def _rate_limit(key: str, scope: str):
    now = int(time.time())
    bucket = _RATE_LIMIT.get(key, deque())
    # Remove timestamps older than the rate limit window
    while bucket and bucket[0] < now - RATE_LIMIT_WINDOW:
        bucket.popleft()

    limit = RATE_LIMIT_MAX.get(scope, 60)
    if len(bucket) >= limit:
        raise HTTPException(429, "TOO_MANY_REQUESTS")

    bucket.append(now)
    _RATE_LIMIT[key] = bucket

# ======================================================
# HMAC VALIDATION (FOR WEBHOOKS)
# ======================================================
def verify_hmac(payload: bytes, signature: str):
    """
    Verify HMAC-SHA256 signature to validate the authenticity of the webhook
    signature = hex string
    """
    if not signature:
        raise HTTPException(403, "SIGNATURE_REQUIRED")

    # Generate the expected signature
    mac = hmac.new(
        HMAC_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    # Compare the signatures using a constant-time comparison to prevent timing attacks
    if not hmac.compare_digest(mac, signature):
        raise HTTPException(403, "INVALID_SIGNATURE")

    return True

# ======================================================
# API GUARD (ACCESS CONTROL)
# ======================================================
def api_guard(x_api_key: str = Header(None), x_ip: str = Header(None)):
    """
    Guard to validate API key and rate limit requests from specific IP.
    """
    if x_api_key != API_KEY:
        raise HTTPException(401, "INVALID_API_KEY")
    
    # Rate limit based on IP address
    _rate_limit(f"api:{x_ip}", "api")
    return True

# ======================================================
# ADMIN GUARD (ACCESS CONTROL)
# ======================================================
def admin_guard(x_admin_token: str = Header(None)):
    """
    Guard to validate Admin Token for admin-level routes.
    """
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(401, "INVALID_ADMIN_TOKEN")
    
    # Rate limit for admin access
    _rate_limit(f"admin:{x_admin_token}", "admin")
    return True

# ======================================================
# AUDIT GUARD (ACCESS CONTROL)
# ======================================================
def audit_guard(x_audit_token: str = Header(None)):
    """
    Guard to validate Audit Token for auditing-level routes.
    """
    if x_audit_token != AUDIT_TOKEN:
        raise HTTPException(401, "INVALID_AUDIT_TOKEN")
    
    # Rate limit for audit access
    _rate_limit(f"audit:{x_audit_token}", "audit")
    return True

# ======================================================
# WEBHOOK GUARD (FOR BLOCKCHAIN / EXTERNAL SERVICES)
# ======================================================
def webhook_guard(request: Request, x_signature: str = Header(None)):
    """
    Guard to verify incoming webhook from external services (e.g., blockchain).
    """
    if not HMAC_SECRET:
        raise HTTPException(500, "HMAC_SECRET_NOT_SET - Please set the HMAC_SECRET environment variable.")
    
    payload = request.body()
    verify_hmac(payload, x_signature)  # Verifying the signature of the incoming request
    return True

# ======================================================
# LOGGING (FOR DEBUGGING AND MONITORING)
# ======================================================
import logging

logging.basicConfig(level=logging.INFO)

def log_message(message: str):
    """
    Log messages for important events or errors
    """
    logging.info(message)

def log_error(message: str):
    """
    Log errors for monitoring and troubleshooting
    """
    logging.error(message)

# ======================================================
# TESTING (Can be used for testing the guards and validation)
# ======================================================
@router.post("/test")
async def test_webhook(payload: dict, signature: str, ip: str):
    """
    Endpoint for testing webhook signature and rate limiting
    """
    try:
        verify_hmac(payload.encode(), signature)
        _rate_limit(ip, "api")
        log_message(f"Webhook processed successfully: {payload}")
        return {"status": "success", "message": "Webhook processed successfully"}
    except HTTPException as e:
        log_error(f"Error processing webhook: {str(e)}")
        raise e
