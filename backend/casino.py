# ======================================================
# casino.py — PRODUCTION FINAL
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
from finance import casino_debit, casino_credit, casino_history, rtp_stats

router = APIRouter(prefix="/casino", dependencies=[Depends(api_guard)])

# ======================================================
# CONFIG
# ======================================================

SERVER_SEED = os.getenv("SERVER_SEED")
if not SERVER_SEED:
    raise RuntimeError("SERVER_SEED must be set")

GAME_FREEZE = bool(int(os.getenv("GAME_FREEZE", "0")))
AUDIT_MODE  = bool(int(os.getenv("AUDIT_MODE", "0")))
MAX_BET     = float(os.getenv("CASINO_MAX_BET", 1000))
MAX_MULTI   = float(os.getenv("CASINO_MAX_MULTIPLIER", 100))

LOCK = Lock()
logger = logging.getLogger("casino")

# ======================================================
# GAME INDEX
# ======================================================

GAME_INDEX = {
    "coinflip": 1,
    "crash": 2,
    "limbo": 3,
    "dice": 4,
    "slot": 5,
    "plinko": 6,
    "hilo": 7,
    "airboss": 8,
    "fruit_party": 9,
    "banana_farm": 10,
    "blackjack_fast": 11,
    "birds_party": 12,
}

# ======================================================
# RTP
# ======================================================

RTP = {
    "coinflip": 0.29,
    "crash": 0.31,
    "limbo": 0.29,
    "dice": 0.31,
    "slot": 0.31,
    "plinko": 0.31,
    "hilo": 0.31,
    "airboss": 0.31,
    "fruit_party": 0.29,
    "banana_farm": 0.30,
    "blackjack_fast": 0.30,
    "birds_party": 0.31,
}

def probability(multiplier: float, game: str) -> float:
    if multiplier <= 0 or multiplier > MAX_MULTI:
        raise HTTPException(400, "INVALID_MULTIPLIER")
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
# CLIENT SEED
# ======================================================

def parse_client_seed(seed: str) -> int:
    if not seed:
        raise HTTPException(400, "CLIENT_SEED_REQUIRED")
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
    bet: float = Field(gt=0)
    multiplier: Optional[float] = None
    choice: Optional[str] = None
    client_seed: str

# ======================================================
# GAME LOGIC
# ======================================================

def simple_rng(bet, m, rand, game):
    win = rand <= probability(m, game)
    return win, bet * m if win else 0

def play_slot_like(bet, rand):
    if rand < 0.7:
        return False, 0
    if rand < 0.9:
        return True, bet * 2
    if rand < 0.97:
        return True, bet * 5
    return True, bet * 10

def play_blackjack_fast(bet, rand):
    win = rand < 0.48
    return win, bet * 2 if win else 0

# ======================================================
# GAME REGISTRY
# ======================================================

GAMES = {
    "coinflip":       lambda r, rand: simple_rng(r.bet, 2, rand, "coinflip"),
    "crash":          lambda r, rand: simple_rng(r.bet, r.multiplier or 2, rand, "crash"),
    "limbo":          lambda r, rand: simple_rng(r.bet, r.multiplier or 2, rand, "limbo"),
    "dice":           lambda r, rand: simple_rng(r.bet, r.multiplier or 2, rand, "dice"),
    "slot":           lambda r, rand: play_slot_like(r.bet, rand),
    "plinko":         lambda r, rand: simple_rng(r.bet, r.multiplier or 2, rand, "plinko"),
    "hilo":           lambda r, rand: simple_rng(r.bet, 2, rand, "hilo"),
    "airboss":        lambda r, rand: simple_rng(r.bet, r.multiplier or 2, rand, "airboss"),
    "fruit_party":    lambda r, rand: play_slot_like(r.bet, rand),
    "banana_farm":    lambda r, rand: play_slot_like(r.bet, rand),
    "blackjack_fast": lambda r, rand: play_blackjack_fast(r.bet, rand),
    "birds_party":    lambda r, rand: simple_rng(r.bet, 2, rand, "birds_party"),
}

# ======================================================
# PLAY ENDPOINT (SAFE)
# ======================================================

@router.post("/play")
def play(req: PlayRequest):

    if GAME_FREEZE:
        raise HTTPException(503, "GAMES_DISABLED")

    if req.game not in GAMES:
        raise HTTPException(400, "GAME_NOT_SUPPORTED")

    if req.bet > MAX_BET:
        raise HTTPException(400, "BET_TOO_LARGE")

    payout = 0
    win = False

    nonce = int(time.time() * 1000) + secrets.randbelow(1000)
    _, seed = special_rule(req.client_seed, req.game, nonce)
    rand = provably_random(seed, nonce)

    with LOCK:
        casino_debit(req.uid, req.bet, req.game)

        try:
            win, payout = GAMES[req.game](req, rand)
            if win and payout > 0:
                casino_credit(req.uid, payout, req.game)
        finally:
            casino_history(
                req.uid,
                req.game,
                req.bet,
                payout,
                win
            )

    logger.info(f"Game: {req.game} | UID: {req.uid} | Win: {win} | Payout: {payout}")

    return {
        "game": req.game,
        "win": win,
        "payout": payout,
        "nonce": nonce,
        "seed": seed,
        "server_seed_hash": server_seed_hash(),
        "audit_mode": AUDIT_MODE
    }

# ======================================================
# ADMIN
# ======================================================

@router.get("/admin/rtp", dependencies=[Depends(admin_guard)])
def admin_rtp():
    return {
        "enabled_games": list(GAMES.keys()),
        "theoretical": RTP,
        "real": rtp_stats()
}
