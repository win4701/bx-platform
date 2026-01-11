import time
import hmac
import hashlib
import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

# Finance interface (المالك الوحيد للأموال)
from finance import (
    casino_debit,
    casino_credit,
    casino_history,
    rtp_stats
)

# Security
from key import api_guard, admin_guard

router = APIRouter(dependencies=[Depends(api_guard)])

# ======================================================
# PROVABLY FAIR
# ======================================================
SERVER_SEED = os.getenv("SERVER_SEED", "CHANGE_ME_SERVER_SEED")

def server_seed_hash() -> str:
    return hashlib.sha256(SERVER_SEED.encode()).hexdigest()

def provably_random(client_seed: str, nonce: int) -> float:
    msg = f"{client_seed}:{nonce}".encode()
    digest = hmac.new(
        SERVER_SEED.encode(),
        msg,
        hashlib.sha256
    ).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF

# ======================================================
# RTP (HARSH ON PURPOSE)
# ======================================================
RTP = {
    "dice": 0.16,
    "coinflip": 0.15,
    "crash": 0.23,
    "ladder": 0.20,
    "roulette": 0.22,
    "abyss": 0.57
}

def probability(multiplier: float, game: str) -> float:
    if multiplier <= 0:
        raise ValueError("INVALID_MULTIPLIER")
    return (1 / multiplier) * RTP[game]

def roll(p: float, client_seed: str, nonce: int) -> bool:
    return provably_random(client_seed, nonce) <= p

# ======================================================
# REQUEST MODELS
# ======================================================
class PlayRequest(BaseModel):
    uid: int
    game: str
    bet: float
    multiplier: Optional[float] = None
    choice: Optional[str] = None
    client_seed: str

# ======================================================
# GAME LOGIC (PURE)
# ======================================================
def game_dice(bet: float, m: float, cs: str, n: int):
    p = probability(m, "dice")
    return roll(p, cs, n), bet * m

def game_coinflip(bet: float, cs: str, n: int):
    p = probability(2, "coinflip")
    return roll(p, cs, n), bet * 2

def game_crash(bet: float, m: float, cs: str, n: int):
    p = probability(m, "crash")
    return roll(p, cs, n), bet * m

def game_ladder(bet: float, step: int, cs: str, n: int):
    multipliers = [2, 5, 10, 20]
    m = multipliers[min(step, len(multipliers) - 1)]
    p = probability(m, "ladder")
    return roll(p, cs, n), bet * m

def game_roulette(bet: float, choice: str, cs: str, n: int):
    if choice in ("red", "black"):
        m = 2
    elif choice == "number":
        m = 36
    else:
        raise HTTPException(400, "INVALID_ROULETTE_CHOICE")

    p = probability(m, "roulette")
    return roll(p, cs, n), bet * m

def game_abyss(bet: float, m: float, cs: str, n: int):
    if m not in (100, 1000):
        raise HTTPException(400, "INVALID_MULTIPLIER")
    p = probability(m, "abyss")
    return roll(p, cs, n), bet * m

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

    # nonce = timestamp (مستقل لكل ضغطة)
    nonce = int(time.time() * 1000)

    # خصم BX أولًا (لا رحمة)
    casino_debit(req.uid, req.bet, game)

    # تنفيذ اللعبة
    if game == "dice":
        win, payout = game_dice(
            req.bet, req.multiplier or 2,
            req.client_seed, nonce
        )

    elif game == "coinflip":
        win, payout = game_coinflip(
            req.bet, req.client_seed, nonce
        )

    elif game == "crash":
        if not req.multiplier:
            raise HTTPException(400, "MULTIPLIER_REQUIRED")
        win, payout = game_crash(
            req.bet, req.multiplier,
            req.client_seed, nonce
        )

    elif game == "ladder":
        win, payout = game_ladder(
            req.bet, int(req.multiplier or 0),
            req.client_seed, nonce
        )

    elif game == "roulette":
        if not req.choice:
            raise HTTPException(400, "CHOICE_REQUIRED")
        win, payout = game_roulette(
            req.bet, req.choice,
            req.client_seed, nonce
        )

    elif game == "abyss":
        if not req.multiplier:
            raise HTTPException(400, "MULTIPLIER_REQUIRED")
        win, payout = game_abyss(
            req.bet, req.multiplier,
            req.client_seed, nonce
        )

    else:
        raise HTTPException(400, "INVALID_GAME")

    # دفع BX إذا فاز
    if win:
        casino_credit(req.uid, payout, game)

    # تسجيل التاريخ (دائمًا)
    casino_history(
        uid=req.uid,
        game=game,
        bet=req.bet,
        payout=payout if win else 0,
        win=win
    )

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
# HISTORY (FOR UI / CHART)
# ======================================================
@router.get("/history")
def history(uid: int, limit: int = 50):
    from finance import db
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
        {
            "game": g,
            "bet": b,
            "payout": p,
            "win": bool(w),
            "ts": t
        }
        for g, b, p, w, t in rows
    ]

# ======================================================
# LIVE RTP (ADMIN)
# ======================================================
@router.get("/admin/rtp", dependencies=[Depends(admin_guard)])
def live_rtp():
    return {
        "theoretical_rtp": RTP,
        "real_rtp": rtp_stats()
    }
