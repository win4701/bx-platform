# ==========================================================
# BLOXIO CASINO ENGINE
# Games • Wallet Integration • Fair Results
# ==========================================================

import random
import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import get_current_user
from finance import credit_user, debit_user

router = APIRouter(prefix="/casino", tags=["casino"])

# ==========================================================
# GAME FLAGS (ADMIN TOGGLE)
# ==========================================================

GAME_FLAGS = {
    "coinflip": True,
    "crash": True,
    "limbo": True,
    "dice": True,
    "slot": True,
    "plinko": True,
    "hilo": True,
    "airboss": True,
    "fruit_party": True,
    "banana_farm": True,
    "blackjack_fast": True,
    "birds_party": True
}

# ==========================================================
# GAME MODEL
# ==========================================================

class CasinoPlay(BaseModel):

    game: str
    bet: float
    multiplier: float | None = None
    choice: str | None = None
    client_seed: str | None = None


# ==========================================================
# FLAGS API
# ==========================================================

@router.get("/flags")
def get_flags():

    return GAME_FLAGS


# ==========================================================
# GAME LOGIC
# ==========================================================

def coinflip(bet):

    win = random.random() > 0.5
    payout = bet * 2 if win else 0

    return win, payout


def dice(bet, multiplier):

    chance = 1 / multiplier

    win = random.random() < chance
    payout = bet * multiplier if win else 0

    return win, payout


def limbo(bet, multiplier):

    win = random.random() < (1 / multiplier)
    payout = bet * multiplier if win else 0

    return win, payout


def crash(bet):

    multiplier = random.uniform(1, 10)

    win = multiplier > 2
    payout = bet * multiplier if win else 0

    return win, payout


def slot(bet):

    win = random.random() > 0.7
    payout = bet * 5 if win else 0

    return win, payout


# ==========================================================
# PLAY
# ==========================================================

@router.post("/play")
def play(req: CasinoPlay, user=Depends(get_current_user)):

    user_id = user["user_id"]

    game = req.game
    bet = float(req.bet)

    if game not in GAME_FLAGS:

        raise HTTPException(400, "Unknown game")

    if GAME_FLAGS[game] is False:

        raise HTTPException(403, "Game disabled")

    if bet <= 0:

        raise HTTPException(400, "Invalid bet")

    # ======================================
    # DEBIT BET
    # ======================================

    debit_user(user_id, "BX", bet)

    # ======================================
    # GAME ENGINE
    # ======================================

    if game == "coinflip":

        win, payout = coinflip(bet)

    elif game == "dice":

        win, payout = dice(bet, req.multiplier or 2)

    elif game == "limbo":

        win, payout = limbo(bet, req.multiplier or 2)

    elif game == "crash":

        win, payout = crash(bet)

    elif game == "slot":

        win, payout = slot(bet)

    else:

        win = random.random() > 0.5
        payout = bet * 2 if win else 0

    # ======================================
    # CREDIT WIN
    # ======================================

    if payout > 0:

        credit_user(user_id, "BX", payout)

    return {
        "game": game,
        "bet": bet,
        "win": win,
        "payout": round(payout, 6),
        "timestamp": int(time.time())
    }
