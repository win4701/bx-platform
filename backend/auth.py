# ======================================================
# auth.py — JWT AUTH MODULE (NO CIRCULAR IMPORT)
# ======================================================

import os
import time
from jose import jwt
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer

SECRET_KEY = os.getenv("JWT_SECRET", "CHANGE_ME_NOW")
ALGORITHM = "HS256"

security = HTTPBearer()

def create_token(user_id: int):
    payload = {
        "user_id": user_id,
        "exp": int(time.time()) + 60 * 60 * 24
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token=Depends(security)):
    try:
        payload = jwt.decode(
            token.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload
    except:
        raise HTTPException(401, "Invalid token")
