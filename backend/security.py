# ==========================================================
# BLOXIO SECURITY CORE
# JWT • HASH • INTERNAL AUTH • RATE LIMIT • EVENT ENGINE
# ==========================================================

import os
import time
import hashlib
import hmac
from typing import Optional
from collections import defaultdict

from jose import jwt, JWTError
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ==========================================================
# ENV CONFIG
# ==========================================================

JWT_SECRET = os.getenv("JWT_SECRET", "CHANGE_THIS_NOW")
JWT_ALGO = "HS256"

INTERNAL_SECRET = os.getenv("INTERNAL_SECRET", "internal_secret")

TOKEN_EXPIRE_SECONDS = 60 * 60 * 24

security = HTTPBearer()

# ==========================================================
# PASSWORD HASH
# ==========================================================

def hash_text(text: str) -> str:

    return hashlib.sha256(text.encode()).hexdigest()


def verify_hash(text: str, hashed: str) -> bool:

    return hash_text(text) == hashed

# ==========================================================
# JWT CREATE
# ==========================================================

def create_jwt(user_id: int):

    payload = {

        "user_id": user_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + TOKEN_EXPIRE_SECONDS
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

# ==========================================================
# JWT VERIFY
# ==========================================================

def verify_jwt(token: str):

    try:

        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGO]
        )

        return payload

    except JWTError:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

# ==========================================================
# CURRENT USER (FASTAPI DEPENDENCY)
# ==========================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    payload = verify_jwt(token)

    return payload

# ==========================================================
# INTERNAL API PROTECTION
# ==========================================================

def verify_internal(secret: Optional[str]):

    if secret != INTERNAL_SECRET:

        raise HTTPException(
            status_code=403,
            detail="Internal access denied"
        )

# ==========================================================
# SIGNED REQUEST
# ==========================================================

def sign_payload(payload: str):

    return hmac.new(
        INTERNAL_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()


def verify_signature(payload: str, signature: str):

    expected = sign_payload(payload)

    if not hmac.compare_digest(expected, signature):

        raise HTTPException(
            status_code=403,
            detail="Invalid signature"
        )

# ==========================================================
# RATE LIMIT
# ==========================================================

RATE_LIMIT = {}

MAX_REQUESTS = 120
WINDOW_SECONDS = 60


def rate_limit(request: Request):

    ip = get_ip(request)

    now = time.time()

    if ip not in RATE_LIMIT:

        RATE_LIMIT[ip] = []

    RATE_LIMIT[ip] = [

        t for t in RATE_LIMIT[ip]
        if now - t < WINDOW_SECONDS
    ]

    RATE_LIMIT[ip].append(now)

    if len(RATE_LIMIT[ip]) > MAX_REQUESTS:

        raise HTTPException(
            status_code=429,
            detail="Too many requests"
        )

# ==========================================================
# SAFE IP EXTRACTION
# ==========================================================

def get_ip(request: Request):

    forwarded = request.headers.get("x-forwarded-for")

    if forwarded:

        return forwarded.split(",")[0].strip()

    return request.client.host

# ==========================================================
# ADMIN CHECK
# ==========================================================

ADMIN_IDS = set(
    int(x) for x in os.getenv("ADMIN_IDS", "").split(",") if x
)


def require_admin(user):

    if user["user_id"] not in ADMIN_IDS:

        raise HTTPException(
            status_code=403,
            detail="Admin only"
        )

# ==========================================================
# BLOXIO EVENT ENGINE
# ==========================================================

EVENTS = defaultdict(list)


def emit(event: str, data: dict):
    """
    Emit event to listeners
    """

    listeners = EVENTS.get(event, [])

    for fn in listeners:

        try:
            fn(data)

        except Exception:
            pass


def on(event: str):
    """
    Register event listener
    """

    def wrapper(fn):

        EVENTS[event].append(fn)

        return fn

    return wrapper
