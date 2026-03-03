# ======================================================
# auth.py — PRODUCTION JWT AUTH SYSTEM
# Secure • Modular • No Circular Import
# ======================================================

import os
import time
from jose import jwt, JWTError
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ======================================================
# CONFIG
# ======================================================

SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET not configured")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 60 * 60 * 24  # 24h

security = HTTPBearer()

# ======================================================
# TOKEN CREATION
# ======================================================

def create_access_token(user_id: int):

    now = int(time.time())

    payload = {
        "sub": str(user_id),
        "user_id": user_id,
        "iat": now,
        "exp": now + ACCESS_TOKEN_EXPIRE_SECONDS,
        "type": "access"
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ======================================================
# TOKEN VALIDATION
# ======================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")

        return payload

    except JWTError:
        raise HTTPException(401, "Invalid or expired token")
