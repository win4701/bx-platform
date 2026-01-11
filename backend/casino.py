import random
import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from finance import (
    casino_debit,
    casino_credit,
    casino_history,
    rtp_stats
)
from key import admin_guard

router = APIRouter()

# =========================
# RTP PER GAME (HARSH)
# =========================
RTP = {
    "dice": 0.96,
    "coinflip": 0.95,
    "crash": 0.93,
    "ladder": 0.90,
    "roulette": 0.92,
    "abyss": 0.85,
}

def probability(multiplier: float, game: str) -> float:
    return (1 / multiplier) * RTP[game]

def roll(p: float) -> bool:
    return random.random() <= p

# =========================
# REQUEST
# =========================
class Play(BaseModel):
    uid: int
    game: str
    bet: float
    multiplier: float | None = None
    choice: str | None = None

# =========================
# GAMES
# =========================
def dice(bet, m): return roll(probability(m, "dice")), bet * m
def coinflip(bet): return roll(probability(2, "coinflip")), bet * 2
def crash(bet, m): return roll(probability(m, "crash")), bet * m
def ladder(bet, step):
    m = [2, 5, 10, 20][min(step, 3)]
    return roll(probability(m, "ladder")), bet * m
def roulette(bet, choice):
    m = 2 if choice in ("red", "black") else 36
    return roll(probability(m, "roulette")), bet * m
def abyss(bet, m):
    if m not in (100, 1000):
        raise HTTPException(400, "INVALID_MULTIPLIER")
    return roll(probability(m, "abyss")), bet * m

# =========================
# PLAY
# =========================
@router.post("/play")
def play(req: Play):
    g = req.game.lower()
    bet = req.bet

    if bet <= 0:
        raise HTTPException(400, "INVALID_BET")

    casino_debit(req.uid, bet, g)

    if g == "dice":
        win, payout = dice(bet, req.multiplier or 2)
    elif g == "coinflip":
        win, payout = coinflip(bet)
    elif g == "crash":
        win, payout = crash(bet, req.multiplier or 2)
    elif g == "ladder":
        win, payout = ladder(bet, int(req.multiplier or 0))
    elif g == "roulette":
        win, payout = roulette(bet, req.choice)
    elif g == "abyss":
        win, payout = abyss(bet, req.multiplier)
    else:
        raise HTTPException(400, "UNKNOWN_GAME")

    if win:
        casino_credit(req.uid, payout, g)

    casino_history(req.uid, g, bet, payout if win else 0, win)

    return {
        "game": g,
        "bet": bet,
        "win": win,
        "payout": payout if win else 0,
        "ts": int(time.time())
    }

# =========================
# LIVE RTP (ADMIN)
# =========================
@router.get("/admin/rtp", dependencies=[Depends(admin_guard)])
def live_rtp():
    return {
        "theoretical": RTP,
        "real": rtp_stats()
    }
