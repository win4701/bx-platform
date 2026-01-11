import random
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

HOUSE_EDGE = 0.05  # 5%

# =========================
# Request Model
# =========================
class PlayRequest(BaseModel):
    uid: int
    game: str
    bet: float
    multiplier: float | None = None
    choice: str | None = None  # red/black/number/etc

# =========================
# Helpers
# =========================
def probability(multiplier: float) -> float:
    return (1 / multiplier) * (1 - HOUSE_EDGE)

def roll(p: float) -> bool:
    return random.random() <= p

# =========================
# Games
# =========================

def game_dice(bet, multiplier):
    p = probability(multiplier)
    win = roll(p)
    return win, bet * multiplier if win else 0

def game_coinflip(bet):
    p = probability(2)
    win = roll(p)
    return win, bet * 2 if win else 0

def game_crash(bet, multiplier):
    p = probability(multiplier)
    win = roll(p)
    return win, bet * multiplier if win else 0

def game_ladder(bet, step):
    multipliers = [2, 5, 10, 20]
    m = multipliers[min(step, len(multipliers)-1)]
    p = probability(m)
    win = roll(p)
    return win, bet * m if win else 0

def game_roulette(bet, choice):
    if choice in ("red", "black"):
        p = probability(2)
        win = roll(p)
        return win, bet * 2 if win else 0
    elif choice == "number":
        p = probability(36)
        win = roll(p)
        return win, bet * 36 if win else 0
    else:
        raise HTTPException(400, "INVALID_ROULETTE_CHOICE")

# =========================
# Main Endpoint
# =========================
@router.post("/play")
def play(req: PlayRequest):
    bet = req.bet
    if bet <= 0:
        raise HTTPException(400, "INVALID_BET")

    game = req.game.lower()

    if game == "dice":
        win, payout = game_dice(bet, req.multiplier or 2)

    elif game == "coinflip":
        win, payout = game_coinflip(bet)

    elif game == "crash":
        if not req.multiplier:
            raise HTTPException(400, "MULTIPLIER_REQUIRED")
        win, payout = game_crash(bet, req.multiplier)

    elif game == "ladder":
        step = int(req.multiplier or 0)
        win, payout = game_ladder(bet, step)

    elif game == "roulette":
        if not req.choice:
            raise HTTPException(400, "CHOICE_REQUIRED")
        win, payout = game_roulette(bet, req.choice)

    else:
        raise HTTPException(400, "UNKNOWN_GAME")

    return {
        "game": game,
        "bet": bet,
        "win": win,
        "payout": payout,
        "ts": int(time.time())
    }
