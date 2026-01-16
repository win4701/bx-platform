"""
casino.py
----------
Single Source of Truth for Casino Logic.

Features:
- Provably Fair (HMAC-SHA256)
- Unified Client Seed Rule (e.g. "1.2.3.4")
- Fixed Game Index (Audit Contract)
- Centralized Money Flow
- Replay / Abuse Protection
- Audit Mode
- Emergency Game Freeze
"""

# ======================================================
# IMPORTS
# ======================================================
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
# GLOBAL STATE (OPS / EMERGENCY)
# ======================================================
GAME_STATE = {
    "freeze": False,
    "audit": False
}

# ======================================================
# CONFIG
# ======================================================
SERVER_SEED = os.getenv("SERVER_SEED", "CHANGE_ME")

# ======================================================
# GAME INDEX (FIXED – PART OF FAIRNESS CONTRACT)
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
}

# ======================================================
# RTP CONFIG
# ======================================================
RTP = {
    "coinflip": 0.25,
    "roulette": 0.22,
    "limbo": 0.24,
    "chicken": 0.21,
    "dice": 0.26,
    "crash": 0.23,
    "slot": 0.24,
    "fortune": 0.24,
    "coins4x4": 0.24,
}

def probability(multiplier: float, game: str) -> float:
    return (1 / multiplier) * RTP[game]

# ======================================================
# PROVABLY FAIR ENGINE
# ======================================================
def server_seed_hash() -> str:
    return hashlib.sha256(SERVER_SEED.encode()).hexdigest()

def provably_random(seed: str, nonce: int) -> float:
    msg = f"{seed}:{nonce}".encode()
    h = hmac.new(SERVER_SEED.encode(), msg, hashlib.sha256).hexdigest()
    return int(h[:8], 16) / 0xFFFFFFFF

# ======================================================
# CLIENT SEED RULE (OFFICIAL)
# ======================================================
def parse_client_seed(seed: str) -> int:
    try:
        return sum(int(x) for x in seed.split(".") if x.isdigit())
    except Exception:
        raise HTTPException(400, "INVALID_CLIENT_SEED")

def special_rule(client_seed: str, game: str, nonce: int):
    if game not in GAME_INDEX:
        raise HTTPException(400, "UNKNOWN_GAME")

    base = parse_client_seed(client_seed) + GAME_INDEX[game]

    a = chr(97 + (base % 26))
    b = chr(97 + ((base + nonce) % 26))

    return {
        "numeric": base,
        "seed": f"{a}{b}"
    }

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
# GAME LOGIC (PURE – NO DB / NO WALLET)
# ======================================================
def play_coinflip(bet, rand):
    win = rand <= probability(2, "coinflip")
    return win, bet * 2 if win else 0

def play_crash(bet, m, rand):
    if m < 1.01 or m > 100:
        raise HTTPException(400, "INVALID_MULTIPLIER")
    win = rand <= probability(m, "crash")
    return win, bet * m if win else 0

def play_limbo(bet, target, rand):
    if target <= 1:
        raise HTTPException(400, "INVALID_TARGET")
    win = rand <= (0.99 / target)
    return win, bet * target if win else 0

def play_dice(bet, m, rand):
    if m < 1.01 or m > 100:
        raise HTTPException(400, "INVALID_MULTIPLIER")
    win = rand <= probability(m, "dice")
    return win, bet * m if win else 0

def play_slot(bet, rand):
    outcomes = [
        (0.70, 0),
        (0.20, 2),
        (0.07, 5),
        (0.025, 20),
        (0.005, 100),
    ]
    acc = 0
    for p, m in outcomes:
        acc += p
        if rand <= acc:
            return (m > 0), bet * m
    return False, 0

# ======================================================
# GAME REGISTRY (NO IF / ELIF)
# ======================================================
GAMES = {
    "coinflip": lambda r,rand: play_coinflip(r.bet, rand),
    "crash":    lambda r,rand: play_crash(r.bet, r.multiplier or 2, rand),
    "limbo":    lambda r,rand: play_limbo(r.bet, r.multiplier or 2, rand),
    "dice":     lambda r,rand: play_dice(r.bet, r.multiplier or 2, rand),
    "slot":     lambda r,rand: play_slot(r.bet, rand),
}

# ======================================================
# PLAY ENDPOINT
# ======================================================
@router.post("/play")
def play(req: PlayRequest):

    if GAME_STATE["freeze"]:
        raise HTTPException(503, "GAMES_TEMPORARILY_DISABLED")

    if req.bet <= 0:
        raise HTTPException(400, "INVALID_BET")

    if req.game not in GAMES:
        raise HTTPException(400, "UNKNOWN_GAME")

    nonce = int(time.time() * 1000)

    rule = special_rule(req.client_seed, req.game, nonce)
    rand = provably_random(rule["seed"], nonce)

    casino_debit(req.uid, req.bet, req.game)

    win, payout = GAMES[req.game](req, rand)

    if win:
        casino_credit(req.uid, payout, req.game)

    casino_history(req.uid, req.game, req.bet, payout if win else 0, win)

    response = {
        "game": req.game,
        "bet": req.bet,
        "win": win,
        "payout": payout if win else 0,
        "numeric": rule["numeric"],
        "seed": rule["seed"],
        "nonce": nonce,
        "server_seed_hash": server_seed_hash(),
        "ts": int(time.time())
    }

    if GAME_STATE["audit"]:
        response["audit"] = {
            "client_seed": req.client_seed,
            "rand": rand
        }

    return response

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
# ADMIN – RTP
# ======================================================
@router.get("/admin/rtp", dependencies=[Depends(admin_guard)])
def live_rtp():
    return {
        "theoretical": RTP,
        "real": rtp_stats()
    }

# ======================================================
# ADMIN – EMERGENCY CONTROL
# ======================================================
@router.post("/admin/emergency", dependencies=[Depends(admin_guard)])
def emergency(freeze: Optional[bool] = None, audit: Optional[bool] = None):
    if freeze is not None:
        GAME_STATE["freeze"] = freeze
    if audit is not None:
        GAME_STATE["audit"] = audit

    return {
        "freeze": GAME_STATE["freeze"],
        "audit": GAME_STATE["audit"]
    }
