# ======================================================
# casino.py
# Core Casino Logic (Simple & Clean)
# ======================================================

import time
import os
import hmac
import hashlib
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from key import api_guard, admin_guard
from finance import casino_debit, casino_credit, casino_history, rtp_stats

router = APIRouter(dependencies=[Depends(api_guard)])

# ======================================================
# SIMPLE GLOBAL FLAGS (NO COMPLEX STATE)
# ======================================================
GAME_FREEZE = False
AUDIT_MODE = False

# ======================================================
# CONFIG
# ======================================================
SERVER_SEED = os.getenv("SERVER_SEED", "CHANGE_ME")

# ======================================================
# GAME INDEX (12 GAMES – FIXED)
# ======================================================
GAME_INDEX = {
    "coinflip": 1,
    "roulette": 2,
    "limbo": 3,
    "chicken": 4,
    "dice": 5,
    "crash": 6,
    "slot": 7,
    "fortune": 8,
    "coins4x4": 9,
    "plinko": 10,
    "hilo": 11,
    "airboss": 12,
}

# ======================================================
# RTP
# ======================================================
RTP = {
    "coinflip": 0.35,
    "roulette": 0.32,
    "limbo": 0.34,
    "chicken": 0.31,
    "dice": 0.36,
    "crash": 0.33,
    "slot": 0.34,
    "fortune": 0.31,
    "coins4x4": 0.31,
    "plinko": 0.31,
    "hilo": 0.31,
    "airboss": 0.31,
}

def probability(multiplier: float, game: str) -> float:
    return (1 / multiplier) * RTP[game]

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
# CLIENT SEED RULE (1.2.3.4)
# ======================================================
def parse_client_seed(seed: str) -> int:
    return sum(int(x) for x in seed.split(".") if x.isdigit())

def special_rule(client_seed: str, game: str, nonce: int):
    base = parse_client_seed(client_seed) + GAME_INDEX[game]
    a = chr(97 + (base % 26))
    b = chr(97 + ((base + nonce) % 26))
    return base, f"{a}{b}"

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
# GAME LOGIC (PURE & SIMPLE)
# ======================================================
def play_coinflip(bet, rand):
    win = rand <= probability(2, "coinflip")  
    payout = bet * 2 if win else 0
    return win, payout

def play_crash(bet, m, rand):
    if m < 1.01 or m > 100:
        raise HTTPException(400, "INVALID_MULTIPLIER")
    win = rand <= probability(m, "crash")
    return win, bet * m if win else 0

def play_limbo(bet, m, rand):
    if m <= 1:
        raise HTTPException(400, "INVALID_TARGET")
    win = rand <= (0.99 / m)
    return win, bet * m if win else 0

def play_dice(bet, m, rand):
    if m < 1.01 or m > 100:
        raise HTTPException(400, "INVALID_MULTIPLIER")
    win = rand <= probability(m, "dice")
    return win, bet * m if win else 0

def play_slot(bet, rand):
    if rand < 0.7:
        return False, 0
    if rand < 0.9:
        return True, bet * 2
    if rand < 0.97:
        return True, bet * 5
    if rand < 0.995:
        return True, bet * 20
    return True, bet * 100

def play_plinko(bet, m, rand):
    if m < 1.5 or m > 10:
        raise HTTPException(400, "INVALID_MULTIPLIER")
    win = rand <= probability(m, "plinko")
    return win, bet * m if win else 0

def play_hilo(bet, choice, rand):
    if choice not in ("high", "low"):
        raise HTTPException(400, "INVALID_CHOICE")
    win = rand <= probability(2, "hilo")
    return win, bet * 2 if win else 0

def play_airboss(bet, m, rand):
    if m < 1.2 or m > 50:
        raise HTTPException(400, "INVALID_MULTIPLIER")
    win = rand <= probability(m, "airboss")
    return win, bet * m if win else 0

# ======================================================
# GAME REGISTRY
# ======================================================
GAMES = {
    "coinflip": lambda r, rand: play_coinflip(r.bet, rand),
    "crash":    lambda r, rand: play_crash(r.bet, r.multiplier or 2, rand),
    "limbo":    lambda r, rand: play_limbo(r.bet, r.multiplier or 2, rand),
    "dice":     lambda r, rand: play_dice(r.bet, r.multiplier or 2, rand),
    "slot":     lambda r, rand: play_slot(r.bet, rand),
    "plinko":   lambda r, rand: play_plinko(r.bet, r.multiplier or 2, rand),
    "hilo":     lambda r, rand: play_hilo(r.bet, r.choice, rand),
    "airboss":  lambda r, rand: play_airboss(r.bet, r.multiplier or 2, rand),
}

# ======================================================
# PLAY ENDPOINT
# ======================================================
@router.post("/play")
def play(req: PlayRequest):

    if GAME_FREEZE:
        raise HTTPException(503, "GAMES_DISABLED")

    if req.bet <= 0:
        raise HTTPException(400, "INVALID_BET")

    if req.game not in GAMES:
        raise HTTPException(400, "UNKNOWN_GAME")

    nonce = int(time.time() * 1000)
    numeric, seed = special_rule(req.client_seed, req.game, nonce)
    rand = provably_random(seed, nonce)

    casino_debit(req.uid, req.bet, req.game)
    win, payout = GAMES[req.game](req, rand)

    if win:
        casino_credit(req.uid, payout, req.game)

    casino_history(req.uid, req.game, req.bet, payout if win else 0, win)

    response = {
        "game": req.game,
        "win": win,
        "payout": payout if win else 0,
        "seed": seed,
        "numeric": numeric,
        "nonce": nonce,
        "server_seed_hash": server_seed_hash()
    }

    if AUDIT_MODE:
        response["audit"] = {"rand": rand}

    return response

# ======================================================
# ADMIN – RTP
# ======================================================
@router.get("/admin/rtp", dependencies=[Depends(admin_guard)])
def live_rtp():
    return {"theoretical": RTP, "real": rtp_stats()}
