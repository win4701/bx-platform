import time
import os
import hmac
import hashlib
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from key import api_guard, admin_guard
from finance import (
    casino_debit,
    casino_credit,
    casino_history,
    rtp_stats,
    db
)

router = APIRouter(dependencies=[Depends(api_guard)])

# ======================================================
# PROVABLY FAIR
# ======================================================
SERVER_SEED = os.getenv("SERVER_SEED", "CHANGE_ME")

def server_seed_hash() -> str:
    return hashlib.sha256(SERVER_SEED.encode()).hexdigest()

def provably_random(client_seed: str, nonce: int) -> float:
    msg = f"{client_seed}:{nonce}".encode()
    h = hmac.new(SERVER_SEED.encode(), msg, hashlib.sha256).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF

# ======================================================
# RTP CONFIG (FINAL)
# ======================================================
RTP = {
    "dice": 0.26,
    "coinflip": 0.25,
    "crash": 0.23,
    "ladder": 0.20,
    "roulette": 0.22,
    "abyss": 0.25,
    "slot": 0.24,
    "chicken": 0.21
}

def probability(multiplier: float, game: str) -> float:
    return (1 / multiplier) * RTP[game]

def roll(p: float, cs: str, n: int) -> bool:
    return provably_random(cs, n) <= p

# ======================================================
# REQUEST MODEL
# ======================================================
class PlayRequest(BaseModel):
    uid: int
    game: str
    bet: float
    multiplier: Optional[float] = None
    choice: Optional[str] = None
    client_seed: str

# ======================================================
# GAME LOGIC
# ======================================================
def game_dice(bet, m, cs, n):
    return roll(probability(m, "dice"), cs, n), bet * m

def game_coinflip(bet, cs, n):
    return roll(probability(2, "coinflip"), cs, n), bet * 2

def game_crash(bet, m, cs, n):
    return roll(probability(m, "crash"), cs, n), bet * m

def game_ladder(bet, step, cs, n):
    multipliers = [2, 5, 10, 20]
    m = multipliers[min(step, len(multipliers) - 1)]
    return roll(probability(m, "ladder"), cs, n), bet * m

def game_roulette(bet, choice, cs, n):
    m = 2 if choice in ("red", "black") else 36
    return roll(probability(m, "roulette"), cs, n), bet * m

def game_abyss(bet, m, cs, n):
    if m not in (100, 1000):
        raise HTTPException(400, "INVALID_MULTIPLIER")
    return roll(probability(m, "abyss"), cs, n), bet * m

# ---------- SLOT ----------
def game_slot(bet, cs, n):
    outcomes = [
        (0.70, 0),
        (0.20, 2),
        (0.07, 5),
        (0.025, 20),
        (0.005, 100),
    ]
    r = provably_random(cs, n)
    acc = 0
    for p, m in outcomes:
        acc += p
        if r <= acc:
            return (m > 0), bet * m
    return False, 0

# ---------- CHICKEN ROAD ----------
CHICKEN_STEPS = [
    (1.2, 0.05),
    (1.6, 0.10),
    (2.3, 0.18),
    (3.5, 0.30),
    (6.0, 0.55),
]

def game_chicken(bet, step, cs, n):
    if step < 1 or step > len(CHICKEN_STEPS):
        raise HTTPException(400, "INVALID_STEP")
    multiplier, death = CHICKEN_STEPS[step - 1]
    if provably_random(cs, n) <= death:
        return False, 0
    return True, bet * multiplier

# ======================================================
# PLAY ENDPOINT
# ======================================================
@router.post("/play")
def play(req: PlayRequest):
    game = req.game.lower()
    if req.bet <= 0:
        raise HTTPException(400, "INVALID_BET")
    if game not in RTP:
        raise HTTPException(400, "UNKNOWN_GAME")

    nonce = int(time.time() * 1000)

    casino_debit(req.uid, req.bet, game)

    if game == "dice":
        win, payout = game_dice(req.bet, req.multiplier or 2, req.client_seed, nonce)
    elif game == "coinflip":
        win, payout = game_coinflip(req.bet, req.client_seed, nonce)
    elif game == "crash":
        win, payout = game_crash(req.bet, req.multiplier or 2, req.client_seed, nonce)
    elif game == "ladder":
        win, payout = game_ladder(req.bet, int(req.multiplier or 0), req.client_seed, nonce)
    elif game == "roulette":
        if not req.choice:
            raise HTTPException(400, "CHOICE_REQUIRED")
        win, payout = game_roulette(req.bet, req.choice, req.client_seed, nonce)
    elif game == "abyss":
        win, payout = game_abyss(req.bet, req.multiplier, req.client_seed, nonce)
    elif game == "slot":
        win, payout = game_slot(req.bet, req.client_seed, nonce)
    elif game == "chicken":
        win, payout = game_chicken(req.bet, int(req.multiplier), req.client_seed, nonce)
    else:
        raise HTTPException(400, "INVALID_GAME")

    if win:
        casino_credit(req.uid, payout, game)

    casino_history(req.uid, game, req.bet, payout if win else 0, win)

    return {
        "game": game,
        "bet": req.bet,
        "win": win,
        "payout": payout if win else 0,
        "nonce": nonce,
        "client_seed": req.client_seed,
        "server_seed_hash": server_seed_hash(),
        "ts": int(time.time())
    }

# ======================================================
# HISTORY
# ======================================================
@router.get("/history")
def history(uid: int, limit: int = 50):
    c = db().cursor()
    rows = c.execute(
        """SELECT game, bet, payout, win, created_at
           FROM game_history
           WHERE uid=?
           ORDER BY created_at DESC
           LIMIT ?""",
        (uid, limit)
    ).fetchall()
    return [
        {"game": g, "bet": b, "payout": p, "win": bool(w), "ts": t}
        for g, b, p, w, t in rows
    ]

# ======================================================
# ADMIN – LIVE RTP
# ======================================================
@router.get("/admin/rtp", dependencies=[Depends(admin_guard)])
def live_rtp():
    return {
        "theoretical": RTP,
        "real": rtp_stats()
    }
