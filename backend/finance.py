import os
import time
import sqlite3
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse

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
MAX_WITHDRAW_MONTH = 15        # 

# ======================================================
# DB
# ======================================================
def db():
    return sqlite3.connect(DB_PATH, check_same_thread=False)

def get_cursor():
    connection = db()
    cursor = connection.cursor()
    return cursor, connection

def close_connection(connection):
    connection.commit()
    connection.close()

# ======================================================
# LEDGER (DOUBLE ENTRY)
# ======================================================
def ledger(ref: str, debit_account: str, credit_account: str, amount: float):
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
        conn.commit()
    except Exception as e:
        print(f"Error in ledger: {str(e)}")
        raise HTTPException(500, "Internal Server Error")
    finally:
        close_connection(conn)

# ======================================================
# CREDIT DEPOSIT
# ======================================================
def credit_deposit(uid: int, asset: str, amount: float, txid: str):
    if amount <= 0:
        return

    c, conn = get_cursor()
    try:
        # Deduplication check
        if c.execute(
            "SELECT 1 FROM used_txs WHERE txid=?", (txid,)
        ).fetchone():
            return

        # Wallet update
        c.execute(
            f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?", (amount, uid)
        )

        # History
        c.execute(
            """INSERT INTO history (uid, action, asset, amount, ref, ts)
               VALUES (?,?,?,?,?,?)""", 
            (uid, "deposit", asset, amount, txid, int(time.time()))
        )

        # Ledger update
        ledger(f"deposit:{asset}", f"treasury_{asset}", f"user_{asset}", amount)

        # Mark tx as used
        c.execute(
            "INSERT OR IGNORE INTO used_txs(txid, ts) VALUES (?,?)",
            (txid, int(time.time()))
        )
        conn.commit()
    except Exception as e:
        print(f"Error in credit_deposit: {str(e)}")
        raise HTTPException(500, "Internal Server Error")
    finally:
        close_connection(conn)

# ======================================================
# SAVE PENDING DEPOSIT
# ======================================================
def save_pending_deposit(uid: int, asset: str, amount: float, txid: str, reason: str):
    c, conn = get_cursor()
    try:
        c.execute(
            """INSERT OR IGNORE INTO pending_deposits
               (txid, uid, asset, amount, reason, ts)
               VALUES (?,?,?,?,?,?)""",
            (txid, uid, asset, amount, reason, int(time.time()))
        )
        conn.commit()
    except Exception as e:
        print(f"Error in save_pending_deposit: {str(e)}")
        raise HTTPException(500, "Internal Server Error")
    finally:
        close_connection(conn)

# ======================================================
# USER WALLET
# ======================================================
@router.get("/me")
def wallet_me(uid: int):
    c, conn = get_cursor()
    try:
        r = c.execute(
            "SELECT usdt, ton,  bnb, eth, sol, btc, bx FROM wallets WHERE uid=?", (uid,)
        ).fetchone()

        if not r:
            raise HTTPException(404, "WALLET_NOT_FOUND")

        return {
            "wallet": dict(zip(["usdt", "ton", "sol", "bnb", "eth", "btc", "bx"], r)),
            "deposit_status": "confirmed"
        }
    except Exception as e:
        print(f"Error in wallet_me: {str(e)}")
        raise HTTPException(500, "Internal Server Error")
    finally:
        close_connection(conn)

# ======================================================
# WITHDRAW (USER REQUEST)
# ======================================================
def validate_withdraw(uid: int, amount: float):
    if amount < MIN_WITHDRAW_USDT:
        raise HTTPException(400, "MIN_WITHDRAW_10")

    c, conn = get_cursor()
    try:
        bal = c.execute(
            "SELECT usdt FROM wallets WHERE uid=?", (uid,)
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
    except Exception as e:
        print(f"Error in validate_withdraw: {str(e)}")
        raise HTTPException(500, "Internal Server Error")
    finally:
        close_connection(conn)

@router.post("/withdraw")
def request_withdraw(uid: int, amount: float, address: str):
    validate_withdraw(uid, amount)

    c, conn = get_cursor()
    try:
        c.execute(
            """INSERT INTO withdrawals
               (uid, asset, amount, address, status, ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, "usdt", amount, address, "requested", int(time.time()))
        )
        conn.commit()
        return {"status": "requested"}
    except Exception as e:
        print(f"Error in request_withdraw: {str(e)}")
        raise HTTPException(500, "Internal Server Error")
    finally:
        close_connection(conn)

# ======================================================
# ADMIN — DEPOSITS
# ======================================================
@router.get("/admin/pending", dependencies=[Depends(admin_guard)])
def admin_pending():
    c, conn = get_cursor()
    try:
        return c.execute(
            "SELECT * FROM pending_deposits ORDER BY ts DESC"
        ).fetchall()
    except Exception as e:
        print(f"Error in admin_pending: {str(e)}")
        raise HTTPException(500, "Internal Server Error")
    finally:
        close_connection(conn)

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

        uid, asset, amount = row
        credit_deposit(uid, asset, amount, txid)

        c.execute(
            "DELETE FROM pending_deposits WHERE txid=?",
            (txid,)
        )
        conn.commit()
        return {"status": "approved"}
    except Exception as e:
        print(f"Error in admin_approve: {str(e)}")
        raise HTTPException(500, "Internal Server Error")
    finally:
        close_connection(conn)

# ======================================================
# ADMIN — WITHDRAW
# ======================================================
@router.get("/admin/withdrawals", dependencies=[Depends(admin_guard)])
def admin_withdrawals():
    c, conn = get_cursor()
    try:
        return c.execute(
            "SELECT * FROM withdrawals ORDER BY ts DESC"
        ).fetchall()
    except Exception as e:
        print(f"Error in admin_withdrawals: {str(e)}")
        raise HTTPException(500, "Internal Server Error")
    finally:
        close_connection(conn)

@router.post("/admin/withdraw/approve", dependencies=[Depends(admin_guard)])
def approve_withdraw(id: int):
    c, conn = get_cursor()
    try:
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
        conn.commit()
        return {"status": "approved"}
    except Exception as e:
        print(f"Error in approve_withdraw: {str(e)}")
        raise HTTPException(500, "Internal Server Error")
    finally:
        close_connection(conn)

# ======================================================
# EXPORT / AUDIT
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
            headers={"Content-Disposition": "attachment; filename=ledger.csv"}
        )
    except Exception as e:
        print(f"Error in export_ledger: {str(e)}")
        raise HTTPException(500, "Internal Server Error")
    finally:
        close_connection(conn)
