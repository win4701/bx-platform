# ==========================================================
# BLOXIO AIRDROP ENGINE
# Referral • Claim • Reward System
# ==========================================================

import sqlite3
import time
import os

from fastapi import APIRouter, Depends, HTTPException

from security import get_current_user
from finance import credit_user

router = APIRouter(prefix="/bxing", tags=["airdrop"])

DB_PATH = os.getenv("DB_PATH", "bloxio.db")

# ==========================================================
# CONFIG
# ==========================================================

AIRDROP_REWARD = 100   # BX
REFERRAL_REWARD = 0.25 # BX
CASINO_REWARD = 0.33   # BX


# ==========================================================
# DATABASE
# ==========================================================

def db():

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ==========================================================
# AIRDROP STATUS
# ==========================================================

@router.get("/airdrop/status")
def airdrop_status(user=Depends(get_current_user)):

    user_id = user["user_id"]

    conn = db()
    cur = conn.cursor()

    cur.execute(
        """
        SELECT claimed
        FROM airdrops
        WHERE user_id=?
        """,
        (user_id,)
    )

    row = cur.fetchone()

    conn.close()

    if not row:

        return {
            "claimed": False,
            "reward": AIRDROP_REWARD
        }

    return {
        "claimed": bool(row["claimed"]),
        "reward": AIRDROP_REWARD
    }


# ==========================================================
# CLAIM AIRDROP
# ==========================================================

@router.post("/airdrop/claim")
def claim_airdrop(user=Depends(get_current_user)):

    user_id = user["user_id"]

    conn = db()
    cur = conn.cursor()

    cur.execute(
        "SELECT claimed FROM airdrops WHERE user_id=?",
        (user_id,)
    )

    row = cur.fetchone()

    if row and row["claimed"]:

        conn.close()

        return {"status": "already"}

    # =====================================
    # CREDIT WALLET
    # =====================================

    credit_user(user_id, "BX", AIRDROP_REWARD)

    # =====================================
    # SAVE CLAIM
    # =====================================

    cur.execute(
        """
        INSERT OR REPLACE INTO airdrops
        (user_id, claimed, claimed_at)
        VALUES(?,?,?)
        """,
        (
            user_id,
            1,
            int(time.time())
        )
    )

    conn.commit()
    conn.close()

    return {
        "status": "ok",
        "reward": AIRDROP_REWARD
    }


# ==========================================================
# REFERRAL BONUS
# ==========================================================

def reward_referral(referrer_id):

    credit_user(referrer_id, "BX", REFERRAL_REWARD)


# ==========================================================
# CASINO BONUS
# ==========================================================

def reward_casino(user_id):

    credit_user(user_id, "BX", CASINO_REWARD)
