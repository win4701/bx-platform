# ======================================================
# casino.py — STABLE PRODUCTION v2
# ======================================================

import os
import time
import hmac
import hashlib
import secrets
import logging
from threading import Lock
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from key import api_guard, admin_guard
from finance import casino_debit, casino_credit, casino_history
from main import get_current_user

# ======================================================
# ROUTER
# ======================================================

router = APIRouter(
    prefix="/casino",
    dependencies=[Depends(api_guard)]
)

logger = logging.getLogger("casino")
LOCK = Lock()

# ======================================================
# CONFIG
# ======================================================

SERVER_SEED = os.getenv("SERVER_SEED", secrets.token_hex(32))
MAX_BET = float(os.getenv("CASINO_MAX_BET", 1000))
MIN_BET = float(os.getenv("CASINO_MIN_BET", 0.1))
MAX_MULTI = float(os.getenv("CASINO_MAX_MULTIPLIER", 100))
GAME_FREEZE = bool(int(os.getenv("GAME_FREEZE", "0")))

# ======================================================
# GAME LIST
# ======================================================

SUPPORTED_GAMES = [
    "coinflip","crash","limbo","dice","slot",
    "plinko","hilo","airboss","fruit_party",
    "banana_farm","blackjack_fast","birds_party"
]

# ======================================================
# PROVABLY FAIR
# ======================================================

def server_seed_hash():
    return hashlib.sha256(SERVER_SEED.encode()).hexdigest()

def provably_random(seed: str, nonce: int) -> float:
    msg = f"{seed}:{nonce}".encode()
    h = hmac.new(SERVER_SEED.encode(), msg, hashlib.sha256).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF

# ======================================================
# REQUEST MODEL
# ======================================================

class PlayRequest(BaseModel):
    game: str
    bet: float = Field(gt=0)
    multiplier: Optional[float] = None
    choice: Optional[str] = None
    client_seed: str

# ======================================================
# GAME ENGINE
# ======================================================

def simple_game(bet, multiplier, rand):
    win = rand <= (1 / multiplier)
    return win, bet * multiplier if win else 0

def slot_game(bet, rand):
    if rand < 0.7:
        return False, 0
    if rand < 0.9:
        return True, bet * 2
    if rand < 0.97:
        return True, bet * 5
    return True, bet * 10

# ======================================================
# PLAY ENDPOINT
# ======================================================

@router.post("/play")
def play(req: PlayRequest, user=Depends(get_current_user)):

    if GAME_FREEZE:
        raise HTTPException(503, "CASINO_DISABLED")

    if req.game not in SUPPORTED_GAMES:
        raise HTTPException(400, "GAME_NOT_SUPPORTED")

    if req.bet < MIN_BET:
        raise HTTPException(400, "BET_TOO_SMALL")

    if req.bet > MAX_BET:
        raise HTTPException(400, "BET_TOO_LARGE")

    nonce = int(time.time() * 1000) + secrets.randbelow(999)
    rand = provably_random(req.client_seed, nonce)

    win = False
    payout = 0

    with LOCK:

        casino_debit(user["user_id"], req.bet, req.game)

        try:
            if req.game in ["coinflip","dice","hilo"]:
                win, payout = simple_game(req.bet, 2, rand)

            elif req.game in ["crash","limbo","plinko","airboss"]:
                multi = req.multiplier or 2
                if multi > MAX_MULTI:
                    raise HTTPException(400, "MULTIPLIER_TOO_HIGH")
                win, payout = simple_game(req.bet, multi, rand)

            elif req.game in ["slot","fruit_party","banana_farm","birds_party"]:
                win, payout = slot_game(req.bet, rand)

            elif req.game == "blackjack_fast":
                win = rand < 0.48
                payout = req.bet * 2 if win else 0

            if win and payout > 0:
                casino_credit(user["user_id"], payout, req.game)

        finally:
            casino_history(
                user["user_id"],
                req.game,
                req.bet,
                payout,
                win
            )

    logger.info(
        f"CASINO | {req.game} | UID={user['user_id']} | WIN={win} | PAY={payout}"
    )

    return {
        "game": req.game,
        "win": win,
        "payout": payout,
        "nonce": nonce,
        "server_seed_hash": server_seed_hash()
    }

# ======================================================
# FLAGS ENDPOINT (FRONTEND REQUIRED)
# ======================================================

@router.get("/flags")
def get_flags():
    return {g: True for g in SUPPORTED_GAMES}

# ======================================================
# ADMIN RTP (SAFE)
# ======================================================

@router.get("/admin/rtp", dependencies=[Depends(admin_guard)])
def admin_rtp():
    return {
        "games": SUPPORTED_GAMES,
        "max_bet": MAX_BET,
        "min_bet": MIN_BET
    }
