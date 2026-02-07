import os
import time
import sqlite3
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

from key import api_guard, admin_guard

# ======================================================
# ROUTER
# ======================================================
router = APIRouter(prefix="/watcher", dependencies=[Depends(api_guard)])

# ======================================================
# CONFIG
# ======================================================
DB_PATH = os.getenv("DB_PATH", "db/db.sqlite")

MIN_WITHDRAW_USDT = 10.0
MAX_WITHDRAW_RATIO = 0.5        # 50%
MAX_WITHDRAW_MONTH = 15

ALLOWED_ASSETS = {"usdt", "ton", "sol", "btc", "eth", "avax", "bnb", "bx"}

# ======================================================
# DB HELPERS (FLY SAFE)
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def get_cursor():
    conn = db()
    conn.row_factory = sqlite3.Row
    return conn.cursor(), conn

def close(conn):
    conn.commit()
    conn.close()

# ======================================================
# LEDGER (DOUBLE ENTRY — SAFE)
# ======================================================
def ledger(ref: str, debit_account: str, credit_account: str, amount: float):
    if amount <= 0:
        return

    ts = int(time.time())
    c, conn = get_cursor()
    try:
        c.execute(
            "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
            (ref, debit_account, amount, 0, ts)
        )
        c.execute(
            "INSERT INTO ledger(ref, account, debit, credit, ts) VALUES (?,?,?,?,?)",
            (ref, credit_account, 0, amount, ts)
        )
    except Exception:
        raise HTTPException(500, "LEDGER_ERROR")
    finally:
        close(conn)

# ======================================================
# CREDIT DEPOSIT (IDEMPOTENT)
# ======================================================
def credit_deposit(uid: int, asset: str, amount: float, txid: str):
    if amount <= 0:
        return

    asset = asset.lower()
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")

    c, conn = get_cursor()
    try:
        # idempotency
        if c.execute(
            "SELECT 1 FROM used_txs WHERE txid=?",
            (txid,)
        ).fetchone():
            return

        c.execute(
            f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?",
            (amount, uid)
        )

        c.execute(
            """INSERT INTO history
               (uid, action, asset, amount, ref, ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, "deposit", asset, amount, txid, int(time.time()))
        )

        ledger(f"deposit:{asset}", f"treasury_{asset}", f"user_{asset}", amount)

        c.execute(
            "INSERT INTO used_txs(txid, asset, ts) VALUES (?,?,?)",
            (txid, asset, int(time.time()))
        )
    except Exception as e:
        raise HTTPException(500, str(e))
    finally:
        close(conn)

# ======================================================
# PENDING DEPOSITS
# ======================================================
def save_pending_deposit(uid: int, asset: str, amount: float, txid: str, reason: str):
    asset = asset.lower()
    if asset not in ALLOWED_ASSETS:
        raise HTTPException(400, "INVALID_ASSET")

    c, conn = get_cursor()
    try:
        c.execute(
            """INSERT OR IGNORE INTO pending_deposits
               (txid, uid, asset, amount, reason, ts)
               VALUES (?,?,?,?,?,?)""",
            (txid, uid, asset, amount, reason, int(time.time()))
        )
    finally:
        close(conn)

# ======================================================
# USER WALLET (READ)
# ======================================================
@router.get("/me")
def wallet_me(uid: int):
    c, conn = get_cursor()
    try:
        r = c.execute(
            "SELECT usdt, ton, sol, bnb, eth, avax, btc, bx FROM wallets WHERE uid=?",
            (uid,)
        ).fetchone()

        if not r:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        return {
            "wallet": dict(r),
            "deposit_status": "confirmed"
        }
    finally:
        close(conn)

# ======================================================
# WITHDRAW VALIDATION
# ======================================================
def validate_withdraw(uid: int, amount: float):
    if amount < MIN_WITHDRAW_USDT:
        raise HTTPException(400, "MIN_WITHDRAW_10")

    c, conn = get_cursor()
    try:
        bal = c.execute(
            "SELECT usdt FROM wallets WHERE uid=?",
            (uid,)
        ).fetchone()

        if not bal:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        if amount > bal["usdt"] * MAX_WITHDRAW_RATIO:
            raise HTTPException(400, "WITHDRAW_LIMIT_50_PERCENT")

        month_start = int(time.time()) - 30 * 86400
        count = c.execute(
            """SELECT COUNT(*) AS c FROM withdraw_queue
               WHERE uid=? AND status='sent' AND ts>?""",
            (uid, month_start)
        ).fetchone()["c"]

        if count >= MAX_WITHDRAW_MONTH:
            raise HTTPException(400, "WITHDRAW_MONTH_LIMIT")
    finally:
        close(conn)

# ======================================================
# WITHDRAW REQUEST
# ======================================================
@router.post("/withdraw")
def request_withdraw(uid: int, amount: float, address: str):
    validate_withdraw(uid, amount)

    c, conn = get_cursor()
    try:
        c.execute(
            """INSERT INTO withdraw_queue
               (uid, asset, amount, address, status, ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, "usdt", amount, address, "requested", int(time.time()))
        )
        return {"status": "requested"}
    finally:
        close(conn)

# ======================================================
# ADMIN — PENDING DEPOSITS
# ======================================================
@router.get("/admin/pending", dependencies=[Depends(admin_guard)])
def admin_pending():
    c, conn = get_cursor()
    try:
        return c.execute(
            "SELECT * FROM pending_deposits ORDER BY ts DESC"
        ).fetchall()
    finally:
        close(conn)

@router.post("/admin/approve", dependencies=[Depends(admin_guard)])
def admin_approve(txid: str):
    c, conn = get_cursor()
    try:
        row = c.execute(
            "SELECT uid, asset, amount FROM pending_deposits WHERE txid=?",
            (txid,)
        ).fetchone()

        if not row:
            raise HTTPException(404, "NOT_FOUND")

        credit_deposit(row["uid"], row["asset"], row["amount"], txid)

        c.execute(
            "DELETE FROM pending_deposits WHERE txid=?",
            (txid,)
        )
        return {"status": "approved"}
    finally:
        close(conn)

# ======================================================
# ADMIN — WITHDRAW
# ======================================================
@router.get("/admin/withdrawals", dependencies=[Depends(admin_guard)])
def admin_withdrawals():
    c, conn = get_cursor()
    try:
        return c.execute(
            "SELECT * FROM withdraw_queue ORDER BY ts DESC"
        ).fetchall()
    finally:
        close(conn)

@router.post("/admin/withdraw/approve", dependencies=[Depends(admin_guard)])
def approve_withdraw(id: int):
    c, conn = get_cursor()
    try:
        row = c.execute(
            "SELECT uid, amount FROM withdraw_queue WHERE id=? AND status='requested'",
            (id,)
        ).fetchone()

        if not row:
            raise HTTPException(404)

        c.execute(
            "UPDATE wallets SET usdt = usdt - ? WHERE uid=?",
            (row["amount"], row["uid"])
        )

        ledger("withdraw:usdt", "user_usdt", "treasury_usdt", row["amount"])

        c.execute(
            "UPDATE withdraw_queue SET status='approved' WHERE id=?",
            (id,)
        )

        return {"status": "approved"}
    finally:
        close(conn)

# ======================================================
# ADMIN — LEDGER EXPORT
# ======================================================
@router.get("/admin/ledger/export", dependencies=[Depends(admin_guard)])
def export_ledger():
    c, conn = get_cursor()
    try:
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
            headers={
                "Content-Disposition": "attachment; filename=ledger.csv"
            }
        )
    finally:
        close(conn)
