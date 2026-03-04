# ==========================================================
# BLOXIO AUTH SYSTEM
# Telegram Login • JWT • User Identity
# ==========================================================

import time
import sqlite3
import os

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from security import create_jwt, verify_jwt

router = APIRouter(prefix="/auth", tags=["auth"])

security = HTTPBearer()

DB_PATH = os.getenv("DB_PATH", "bloxio.db")

# ==========================================================
# DATABASE
# ==========================================================

def db():

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ==========================================================
# MODELS
# ==========================================================

class TelegramAuth(BaseModel):

    telegram_id: int
    username: str | None = None
    first_name: str | None = None


# ==========================================================
# TELEGRAM LOGIN
# ==========================================================

@router.post("/telegram")
def telegram_login(data: TelegramAuth):

    user_id = data.telegram_id

    conn = db()
    cur = conn.cursor()

    cur.execute(
        "SELECT id FROM users WHERE telegram_id=?",
        (user_id,)
    )

    row = cur.fetchone()

    # =========================================
    # USER NOT EXIST → CREATE
    # =========================================

    if not row:

        cur.execute(
            """
            INSERT INTO users
            (telegram_id, username, first_name, created_at)
            VALUES(?,?,?,?)
            """,
            (
                data.telegram_id,
                data.username,
                data.first_name,
                int(time.time())
            )
        )

        conn.commit()

        user_db_id = cur.lastrowid

    else:

        user_db_id = row["id"]

    conn.close()

    # =========================================
    # CREATE JWT
    # =========================================

    token = create_jwt(user_db_id)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


# ==========================================================
# CURRENT USER
# ==========================================================

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):

    token = credentials.credentials

    payload = verify_jwt(token)

    return payload


# ==========================================================
# USER PROFILE
# ==========================================================

@router.get("/me")
def auth_me(user=Depends(get_current_user)):

    user_id = user["user_id"]

    conn = db()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT id, telegram_id, username, first_name
        FROM users
        WHERE id=?
        """,
        (user_id,)
    )

    row = cur.fetchone()

    conn.close()

    if not row:

        raise HTTPException(404, "User not found")

    return dict(row)
