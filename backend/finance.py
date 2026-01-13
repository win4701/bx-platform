import time
import sqlite3
from fastapi import APIRouter, HTTPException, Depends

from key import api_guard, admin_guard

router = APIRouter(dependencies=[Depends(api_guard)])
DB_PATH = "db.sqlite"

# ======================================================
# DB
# ======================================================
import psycopg2, os

def db():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

# ======================================================
# LEDGER (DOUBLE ENTRY)
# ======================================================
def ledger(ref: str, debit: str, credit: str, amount: float):
    ts = int(time.time())
    c = db().cursor()
    c.execute(
        "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
        (ref, debit, amount, 0, ts)
    )
    c.execute(
        "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
        (ref, credit, 0, amount, ts)
    )
    c.connection.commit()

# ======================================================
# WALLET HELPERS
# ======================================================
def get_wallet(uid: int):
    c = db().cursor()
    c.execute(
        "SELECT usdt, ton, sol, btc, bx, usdt_confirmed, bx_confirmed, deposit_status "
        "FROM wallets WHERE uid=?",
        (uid,)
    )
    row = c.fetchone()
    if not row:
        raise HTTPException(404, "WALLET_NOT_FOUND")
    return {
        "usdt": row[0],
        "ton": row[1],
        "sol": row[2],
        "btc": row[3],
        "bx": row[4],
        "usdt_confirmed": row[5],
        "bx_confirmed": row[6],
        "deposit_status": row[7],
    }

def set_deposit_status(uid: int, status: str):
    c = db().cursor()
    c.execute(
        "UPDATE wallets SET deposit_status=? WHERE uid=?",
        (status, uid)
    )
    c.connection.commit()

# ======================================================
# DEPOSITS (USED BY WATCHER)
# ======================================================
def credit_deposit(uid: int, asset: str, amount: float, txid: str):
    ts = int(time.time())
    c = db().cursor()

    # credit balance
    c.execute(
        f"UPDATE wallets SET {asset}={asset}+?, {asset}_confirmed={asset}_confirmed+? WHERE uid=?",
        (amount, amount, uid)
    )

    ledger(f"deposit:{asset}", f"treasury_{asset}", f"user_{asset}", amount)

    c.execute(
        "INSERT INTO history(uid, action, asset, amount, ref, ts) VALUES (?,?,?,?,?,?)",
        (uid, "deposit", asset, amount, txid, ts)
    )

    set_deposit_status(uid, "confirmed")
    c.connection.commit()

def save_pending_deposit(uid: int, asset: str, amount: float, txid: str, reason: str):
    ts = int(time.time())
    c = db().cursor()
    c.execute(
        """INSERT INTO deposits(uid, asset, txid, amount, confirmations, credited, ts)
           VALUES (?,?,?,?,0,0,?)""",
        (uid, asset, txid, amount, ts)
    )
    set_deposit_status(uid, "pending")
    c.connection.commit()

# ======================================================
# ADMIN: APPROVE PENDING DEPOSIT
# ======================================================
@router.post("/admin/approve_deposit")
def admin_approve_deposit(deposit_id: int, admin=Depends(admin_guard)):
    c = db().cursor()
    c.execute(
        "SELECT uid, asset, amount, txid FROM deposits WHERE id=? AND credited=0",
        (deposit_id,)
    )
    dep = c.fetchone()
    if not dep:
        raise HTTPException(404, "DEPOSIT_NOT_FOUND")

    uid, asset, amount, txid = dep
    credit_deposit(uid, asset, amount, txid)

    c.execute(
        "UPDATE deposits SET credited=1 WHERE id=?",
        (deposit_id,)
    )
    c.connection.commit()
    return {"status": "approved"}

# ======================================================
# ADMIN: VIEW PENDING DEPOSITS
# ======================================================
@router.get("/admin/pending_deposits")
def admin_pending_deposits(admin=Depends(admin_guard)):
    c = db().cursor()
    c.execute(
        "SELECT id, uid, asset, amount, txid, ts FROM deposits WHERE credited=0 ORDER BY ts DESC"
    )
    rows = c.fetchall()
    return [
        {
            "id": r[0],
            "uid": r[1],
            "asset": r[2],
            "amount": r[3],
            "txid": r[4],
            "ts": r[5],
        }
        for r in rows
    ]

# ======================================================
# ADMIN: LEDGER VIEW (READ ONLY)
# ======================================================
@router.get("/admin/ledger")
def admin_ledger(admin=Depends(admin_guard)):
    c = db().cursor()
    c.execute(
        "SELECT ref, account, debit, credit, ts FROM ledger ORDER BY ts DESC LIMIT 500"
    )
    rows = c.fetchall()
    return [
        {
            "ref": r[0],
            "account": r[1],
            "debit": r[2],
            "credit": r[3],
            "ts": r[4],
        }
        for r in rows
    ]

# ======================================================
# RTP STATS (PUBLIC READ ONLY)
# ======================================================
def rtp_stats():
    c = db().cursor()
    c.execute("SELECT SUM(bet), SUM(win) FROM game_history")
    bet, win = c.fetchone()
    if not bet or bet == 0:
        return {"rtp": 1.0}
    return {"rtp": round(win / bet, 4)}

# ======================================================
# CONFIRMED BALANCE (USED BY CASINO / MARKET)
# ======================================================
def get_confirmed_balance(uid: int):
    w = get_wallet(uid)
    return {
        "usdt": w["usdt_confirmed"],
        "bx": w["bx_confirmed"],
    }
