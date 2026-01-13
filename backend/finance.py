import os
import time
import sqlite3
from typing import Dict

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from key import api_guard, admin_guard, audit_guard

# ======================================================
# ROUTER
# ======================================================
router = APIRouter(dependencies=[Depends(api_guard)])

# ======================================================
# CONFIG
# ======================================================
DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")

MIN_WITHDRAW_USDT = 10.0
MAX_WITHDRAW_RATIO = 0.5       # 50%
MAX_WITHDRAW_MONTH = 10        # مرات شهريًا

# ======================================================
# DB
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

# ======================================================
# LEDGER (DOUBLE ENTRY)
# ======================================================
def ledger(ref: str, debit_account: str, credit_account: str, amount: float):
    ts = int(time.time())
    c = db().cursor()
    c.execute(
        "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
        (ref, debit_account, amount, 0, ts)
    )
    c.execute(
        "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
        (ref, credit_account, 0, amount, ts)
    )
    c.connection.commit()

# ======================================================
# INTERNAL API (WATCHER ONLY)
# ======================================================
def credit_deposit(uid: int, asset: str, amount: float, txid: str):
    """
    يُستدعى فقط من watcher.py
    """
    if amount <= 0:
        return

    c = db().cursor()

    # Dedup
    if c.execute(
        "SELECT 1 FROM used_txs WHERE txid=?",
        (txid,)
    ).fetchone():
        return

    # Wallet update
    c.execute(
        f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
        (amount, uid)
    )

    # History
    c.execute(
        """INSERT INTO history
           (uid, action, asset, amount, ref, ts)
           VALUES (?,?,?,?,?,?)""",
        (uid, "deposit", asset, amount, txid, int(time.time()))
    )

    # Ledger
    ledger(f"deposit:{asset}", f"treasury_{asset}", f"user_{asset}", amount)

    # Mark tx used
    c.execute(
        "INSERT OR IGNORE INTO used_txs(txid, ts) VALUES (?,?)",
        (txid, int(time.time()))
    )

    c.connection.commit()

def save_pending_deposit(uid: int, asset: str, amount: float, txid: str, reason: str):
    c = db().cursor()
    c.execute(
        """INSERT INTO pending_deposits
           (txid, uid, asset, amount, reason, ts)
           VALUES (?,?,?,?,?,?)""",
        (txid, uid, asset, amount, reason, int(time.time()))
    )
    c.connection.commit()

# ======================================================
# USER WALLET
# ======================================================
@router.get("/me")
def wallet_me(uid: int):
    c = db().cursor()
    r = c.execute(
        "SELECT usdt, ton, sol, btc, bx FROM wallets WHERE uid=?",
        (uid,)
    ).fetchone()

    if not r:
        raise HTTPException(404, "WALLET_NOT_FOUND")

    return {
        "wallet": dict(zip(["usdt", "ton", "sol", "btc", "bx"], r)),
        "deposit_status": "confirmed"
    }

# ======================================================
# WITHDRAW (USER REQUEST)
# ======================================================
def validate_withdraw(uid: int, amount: float):
    if amount < MIN_WITHDRAW_USDT:
        raise HTTPException(400, "MIN_WITHDRAW_10")

    c = db().cursor()
    bal = c.execute(
        "SELECT usdt FROM wallets WHERE uid=?",
        (uid,)
    ).fetchone()

    if not bal:
        raise HTTPException(404, "WALLET_NOT_FOUND")

    if amount > bal[0] * MAX_WITHDRAW_RATIO:
        raise HTTPException(400, "WITHDRAW_LIMIT_50_PERCENT")

    month_start = int(time.time()) - 30 * 86400
    count = c.execute(
        """SELECT COUNT(*) FROM withdrawals
           WHERE uid=? AND status='sent' AND ts>?""",
        (uid, month_start)
    ).fetchone()[0]

    if count >= MAX_WITHDRAW_MONTH:
        raise HTTPException(400, "WITHDRAW_MONTH_LIMIT")

@router.post("/withdraw")
def request_withdraw(uid: int, amount: float, address: str):
    validate_withdraw(uid, amount)

    c = db().cursor()
    c.execute(
        """INSERT INTO withdrawals
           (uid, asset, amount, address, status, ts)
           VALUES (?,?,?,?,?,?)""",
        (uid, "usdt", amount, address, "requested", int(time.time()))
    )
    c.connection.commit()
    return {"status": "requested"}

# ======================================================
# ADMIN — DEPOSITS
# ======================================================
@router.get("/admin/pending", dependencies=[Depends(admin_guard)])
def admin_pending():
    c = db().cursor()
    return c.execute(
        "SELECT * FROM pending_deposits ORDER BY ts DESC"
    ).fetchall()

@router.post("/admin/approve", dependencies=[Depends(admin_guard)])
def admin_approve(txid: str):
    c = db().cursor()
    row = c.execute(
        "SELECT uid, asset, amount FROM pending_deposits WHERE txid=?",
        (txid,)
    ).fetchone()

    if not row:
        raise HTTPException(404, "NOT_FOUND")

    uid, asset, amount = row
    credit_deposit(uid, asset, amount, txid)

    c.execute(
        "DELETE FROM pending_deposits WHERE txid=?",
        (txid,)
    )
    c.connection.commit()
    return {"status": "approved"}

# ======================================================
# ADMIN — WITHDRAW
# ======================================================
@router.get("/admin/withdrawals", dependencies=[Depends(admin_guard)])
def admin_withdrawals():
    c = db().cursor()
    return c.execute(
        "SELECT * FROM withdrawals ORDER BY ts DESC"
    ).fetchall()

@router.post("/admin/withdraw/approve", dependencies=[Depends(admin_guard)])
def approve_withdraw(id: int):
    c = db().cursor()
    row = c.execute(
        "SELECT uid, amount FROM withdrawals WHERE id=? AND status='requested'",
        (id,)
    ).fetchone()
    if not row:
        raise HTTPException(404)

    uid, amount = row

    c.execute(
        "UPDATE wallets SET usdt = usdt - ? WHERE uid=?",
        (amount, uid)
    )

    ledger("withdraw:usdt", "user_usdt", "treasury_usdt", amount)

    c.execute(
        "UPDATE withdrawals SET status='approved' WHERE id=?",
        (id,)
    )
    c.connection.commit()
    return {"status": "approved"}

@router.post("/admin/withdraw/sent", dependencies=[Depends(admin_guard)])
def withdraw_sent(id: int, txid: str):
    c = db().cursor()
    c.execute(
        "UPDATE withdrawals SET status='sent', txid=? WHERE id=?",
        (txid, id)
    )
    c.connection.commit()
    return {"status": "sent"}

@router.post("/admin/withdraw/reject", dependencies=[Depends(admin_guard)])
def withdraw_reject(id: int, reason: str):
    c = db().cursor()
    c.execute(
        "UPDATE withdrawals SET status='rejected', reason=? WHERE id=?",
        (reason, id)
    )
    c.connection.commit()
    return {"status": "rejected"}

# ======================================================
# LEDGER EXPORT / AUDIT
# ======================================================
@router.get("/admin/ledger/export", dependencies=[Depends(admin_guard)])
def export_ledger():
    c = db().cursor()
    rows = c.execute(
        "SELECT ref, account, debit, credit, ts FROM ledger ORDER BY ts"
    )

    def gen():
        yield "ref,account,debit,credit,ts\n"
        for r in rows:
            yield ",".join(map(str, r)) + "\n"

    return StreamingResponse(
        gen(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ledger.csv"}
    )

@router.get("/audit/ledger", dependencies=[Depends(audit_guard)])
def audit_ledger():
    c = db().cursor()
    return c.execute(
        "SELECT * FROM ledger ORDER BY ts DESC LIMIT 1000"
    ).fetchall()

# ======================================================
# RTP STATS (PUBLIC READ ONLY)
# ======================================================
def rtp_stats() -> Dict:
    c = db().cursor()
    rows = c.execute(
        """SELECT game, SUM(bet), SUM(payout)
           FROM game_history
           GROUP BY game"""
    ).fetchall()

    return {
        g: {
            "total_bet": b or 0,
            "total_payout": p or 0,
            "rtp_real": round((p / b), 4) if b else 0
        }
        for g, b, p in rows
    }
