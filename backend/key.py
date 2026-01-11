import os
import hmac
import hashlib
from fastapi import Header, HTTPException, Depends, Request

# ======================================================
# ENV
# ======================================================
API_KEY = os.getenv("API_KEY", "")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")
AUDIT_TOKEN = os.getenv("AUDIT_TOKEN", "")  # read-only audit
HMAC_SECRET = os.getenv("HMAC_SECRET", "")

# ======================================================
# BASIC GUARDS
# ======================================================
def api_guard(x_api_key: str = Header(None)):
    """
    حماية عامة لكل Endpoints الخاصة بالمستخدم
    """
    if not API_KEY:
        return
    if x_api_key != API_KEY:
        raise HTTPException(401, "INVALID_API_KEY")

def admin_guard(x_admin_token: str = Header(None)):
    """
    صلاحيات المشرف (أموال / إعدادات / تحكم)
    """
    if x_admin_token != ADMIN_TOKEN:
        raise HTTPException(401, "ADMIN_ONLY")

def audit_guard(x_audit_token: str = Header(None)):
    """
    صلاحيات التدقيق الخارجي (قراءة فقط)
    """
    if x_audit_token != AUDIT_TOKEN:
        raise HTTPException(401, "AUDIT_ONLY")

# ======================================================
# HMAC SIGNATURE (OPTIONAL – FOR AUDIT / WEBHOOKS)
# ======================================================
def sign_payload(payload: bytes) -> str:
    """
    توقيع الاستجابات الحساسة
    """
    if not HMAC_SECRET:
        return ""
    return hmac.new(
        HMAC_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

def verify_signature(payload: bytes, signature: str):
    """
    التحقق من التوقيع
    """
    expected = sign_payload(payload)
    if expected and not hmac.compare_digest(expected, signature):
        raise HTTPException(401, "INVALID_SIGNATURE")

# ======================================================
# RATE LIMIT (LIGHT – OPTIONAL)
# ======================================================
# ملاحظة: هذا ليس بديلًا عن rate-limit على مستوى السيرفر
_REQUESTS = {}

def rate_limit(request: Request, limit: int = 60, window: int = 60):
    """
    حد بسيط: X طلب / window ثانية
    """
    ip = request.client.host
    now = int(time.time())

    bucket = _REQUESTS.get(ip, [])
    bucket = [t for t in bucket if now - t < window]

    if len(bucket) >= limit:
        raise HTTPException(429, "TOO_MANY_REQUESTS")

    bucket.append(now)
    _REQUESTS[ip] = bucket

# ======================================================
# COMBINED GUARDS (OPTIONAL)
# ======================================================
def api_with_rate_limit(
    request: Request,
    x_api_key: str = Header(None)
):
    api_guard(x_api_key)
    rate_limit(request)
