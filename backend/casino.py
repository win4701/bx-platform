# ==========================================================
# BLOXIO CASINO ENGINE v2
# 12 Games • Wallet Integration • Stable API
# ==========================================================

import random
import time
import hashlib

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from security import get_current_user
from finance import credit_user, debit_user

router = APIRouter(prefix="/casino", tags=["casino"])

# ==========================================================
# GAME FLAGS (ADMIN CONTROL)
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
# REQUEST MODEL
# ==========================================================

class CasinoPlay(BaseModel):

    game: str
    bet: float
    multiplier: float | None = None
    choice: str | None = None
    client_seed: str | None = None


# ==========================================================
# PROVABLY FAIR
# ==========================================================

SERVER_SEED = "BLOXIO_SERVER_SEED"

def provably_fair(seed):

    h = hashlib.sha256(seed.encode()).hexdigest()

    return int(h[:8], 16) / 0xffffffff


# ==========================================================
# GAME ENGINES
# ==========================================================

def coinflip(bet, seed):

    r = provably_fair(seed)

    win = r > 0.5
    payout = bet * 2 if win else 0

    return win, payout


def dice(bet, multiplier, seed):

    r = provably_fair(seed)

    chance = 1 / multiplier

    win = r < chance

    payout = bet * multiplier if win else 0

    return win, payout


def limbo(bet, multiplier, seed):

    r = provably_fair(seed)

    win = r < (1 / multiplier)

    payout = bet * multiplier if win else 0

    return win, payout


def crash(bet, seed):

    r = provably_fair(seed)

    multiplier = 1 + (r * 9)

    win = multiplier > 2

    payout = bet * multiplier if win else 0

    return win, payout


def slot(bet, seed):

    r = provably_fair(seed)

    win = r > 0.75

    payout = bet * 5 if win else 0

    return win, payout


def plinko(bet, multiplier, seed):

    r = provably_fair(seed)

    win = r < 0.3

    payout = bet * (multiplier or 3) if win else 0

    return win, payout


def hilo(bet, choice, seed):

    r = provably_fair(seed)

    card = int(r * 13)

    win = (choice == "high" and card > 6) or (choice == "low" and card <= 6)

    payout = bet * 2 if win else 0

    return win, payout


def airboss(bet, multiplier, seed):

    r = provably_fair(seed)

    win = r < 0.25

    payout = bet * (multiplier or 4) if win else 0

    return win, payout


def fruit_party(bet, seed):

    r = provably_fair(seed)

    win = r > 0.8

    payout = bet * 6 if win else 0

    return win, payout


def banana_farm(bet, seed):

    r = provably_fair(seed)

    win = r > 0.7

    payout = bet * 4 if win else 0

    return win, payout


def blackjack_fast(bet, seed):

    r = provably_fair(seed)

    win = r > 0.48

    payout = bet * 2 if win else 0

    return win, payout


def birds_party(bet, seed):

    r = provably_fair(seed)

    win = r > 0.82

    payout = bet * 7 if win else 0

    return win, payout


# ==========================================================
# GAME ROUTER
# ==========================================================

def run_game(req, seed):

    g = req.game
    bet = req.bet

    if g == "coinflip":
        return coinflip(bet, seed)

    if g == "dice":
        return dice(bet, req.multiplier or 2, seed)

    if g == "limbo":
        return limbo(bet, req.multiplier or 2, seed)

    if g == "crash":
        return crash(bet, seed)

    if g == "slot":
        return slot(bet, seed)

    if g == "plinko":
        return plinko(bet, req.multiplier, seed)

    if g == "hilo":
        return hilo(bet, req.choice or "high", seed)

    if g == "airboss":
        return airboss(bet, req.multiplier, seed)

    if g == "fruit_party":
        return fruit_party(bet, seed)

    if g == "banana_farm":
        return banana_farm(bet, seed)

    if g == "blackjack_fast":
        return blackjack_fast(bet, seed)

    if g == "birds_party":
        return birds_party(bet, seed)

    raise HTTPException(400, "Unknown game")


# ==========================================================
# API FLAGS
# ==========================================================

@router.get("/flags")
def flags():

    return GAME_FLAGS


# ==========================================================
# PLAY API
# ==========================================================

@router.post("/play")
def play(req: CasinoPlay, user=Depends(get_current_user)):

    uid = user["user_id"]

    if req.game not in GAME_FLAGS:

        raise HTTPException(400, "Invalid game")

    if not GAME_FLAGS[req.game]:

        raise HTTPException(403, "Game disabled")

    bet = float(req.bet)

    if bet <= 0:

        raise HTTPException(400, "Invalid bet")

    # ======================================
    # WALLET DEBIT
    # ======================================

    debit_user(uid, "BX", bet)

    # ======================================
    # FAIR SEED
    # ======================================

    seed = f"{SERVER_SEED}:{req.client_seed}:{time.time()}"

    # ======================================
    # GAME ENGINE
    # ======================================

    win, payout = run_game(req, seed)

    # ======================================
    # CREDIT
    # ======================================

    if payout > 0:

        credit_user(uid, "BX", payout)

    return {

        "game": req.game,
        "bet": bet,
        "win": win,
        "payout": round(payout, 6),
        "timestamp": int(time.time())
    }
