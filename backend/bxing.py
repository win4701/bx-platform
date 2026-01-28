import requests
from fastapi import HTTPException
from decimal import Decimal
import sqlite3
from time import time

DB_PATH = "db/bxing.db"

def db():
    connection = sqlite3.connect(DB_PATH)
    return connection

def close_connection(connection):
    connection.commit()
    connection.close()

# ============================================
# عمليات بيع وشراء عبر ston.fi
# ============================================

def buy_bx(amount: float, token: str):
    """
    تنفيذ عملية شراء لعملة BX مقابل العملة المحددة (مثل USDT أو TON).
    """
    url = f"https://app.ston.fi/swap?chartVisible=false&ft={token}&tt=EQCRYlkaR6GlssLRrQlBH3HOPJSMk_vzfAAyyuhnriX-7a_a&fa=%221%22"
    
    payload = {
        "amount": amount,
        "from_token": token,
        "to_token": "BX"
    }

    try:
        response = requests.post(url, data=payload)

        if response.status_code == 200:
            transaction_data = response.json()
            txid = transaction_data.get('txid')
            # تسجيل المعاملة في قاعدة البيانات
            return {"status": "success", "transaction": transaction_data}
        else:
            raise HTTPException(400, "Failed to buy BX")
    except Exception as e:
        raise HTTPException(500, f"Error during buy transaction: {str(e)}")

def sell_bx(amount: float, token: str):
    """
    تنفيذ عملية بيع لعملة BX مقابل العملة المحددة (مثل USDT أو TON).
    """
    url = f"https://app.ston.fi/swap?chartVisible=false&ft=BX&tt=EQCRYlkaR6GlssLRrQlBH3HOPJSMk_vzfAAyyuhnriX-7a_a&fa=%221%22"
    
    payload = {
        "amount": amount,
        "from_token": "BX",
        "to_token": token
    }

    try:
        response = requests.post(url, data=payload)

        if response.status_code == 200:
            transaction_data = response.json()
            txid = transaction_data.get('txid')
            # تسجيل المعاملة في قاعدة البيانات
            return {"status": "success", "transaction": transaction_data}
        else:
            raise HTTPException(400, "Failed to sell BX")
    except Exception as e:
        raise HTTPException(500, f"Error during sell transaction: {str(e)}")


# ============================================
# Airdrop - توزيع المكافآت
# ============================================

def process_airdrop(uid: int, asset: str, amount: float):
    """
    معالجة توزيع الـ Airdrop بناءً على المعايير مثل حجم الإيداع.
    """
    if asset not in ["BX", "SOL", "BNB", "USDT"]:
        raise HTTPException(400, "Airdrop is available only for BX, SOL, BNB, and USDT")

    if amount < 10:  # فرض شرط الحد الأدنى للإيداع
        raise HTTPException(400, "Airdrop minimum amount is 10 units of the asset")

    # تحقق من أهلية المستخدم لتوزيع Airdrop
    eligible = check_eligibility(uid)
    if eligible:
        distribute_airdrop(uid, asset, amount)
    else:
        raise HTTPException(400, "User not eligible for airdrop")

def check_eligibility(uid: int) -> bool:
    """
    التحقق من أهلية المستخدم لتوزيع الـ Airdrop
    """
    return True  # فرضية أن المستخدم مؤهل

def distribute_airdrop(uid: int, asset: str, amount: float):
    """
    توزيع Airdrop فعليًا للمستخدم
    """
    try:
        c = db().cursor()
        # تحديث الرصيد في قاعدة البيانات
        c.execute("UPDATE wallets SET {0} = {0} + ? WHERE uid=?".format(asset), (amount, uid))
        # إضافة المعاملة في سجل التاريخ
        record_transaction(uid, "airdrop", asset, amount, "airdrop_txid_placeholder")
        close_connection(c.connection)
        print(f"Airdrop of {amount} {asset} distributed to user {uid}")
    except Exception as e:
        raise HTTPException(500, f"Error distributing airdrop: {str(e)}")


# ============================================
# تسجيل المعاملات في قاعدة البيانات
# ============================================

def record_transaction(uid: int, action: str, asset: str, amount: float, txid: str):
    """تسجيل المعاملة في قاعدة البيانات"""
    c, conn = db().cursor(), db()
    try:
        c.execute(
            """INSERT INTO history (uid, action, asset, amount, ref, ts)
               VALUES (?,?,?,?,?,?)""",
            (uid, action, asset, amount, txid, int(time()))
        )
        conn.commit()
    except Exception as e:
        raise HTTPException(500, f"Error recording transaction: {str(e)}")
    finally:
        close_connection(conn)


# ============================================
# تحديث المحفظة (Wallet)
# ============================================

def update_wallet(uid: int, asset: str, amount: float, action: str):
    """تحديث رصيد المحفظة بعد إتمام المعاملة"""
    c, conn = db().cursor(), db()
    try:
        if action == "buy":
            c.execute(f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?", (amount, uid))
        elif action == "sell":
            c.execute(f"UPDATE wallets SET {asset} = {asset} - ? WHERE uid=?", (amount, uid))
        elif action == "airdrop":
            c.execute(f"UPDATE wallets SET {asset} = {asset} + ? WHERE uid=?", (amount, uid))
        
        conn.commit()
    except Exception as e:
        raise HTTPException(500, f"Error updating wallet: {str(e)}")
    finally:
        close_connection(conn)


# ============================================
# عمليات التعدين (Mining)
# ============================================

MINING_PLANS = {
    "BX": [
        {"name": "Starter", "roi": 2.5, "min": 10, "max": 100, "days": 10},
        {"name": "Basic", "roi": 5, "min": 50, "max": 300, "days": 21},
        {"name": "Golden", "roi": 8, "min": 200, "max": 800, "days": 30},
        {"name": "Advanced", "roi": 12, "min": 400, "max": 2500, "days": 45},
        {"name": "Platine", "roi": 17, "min": 750, "max": 9000, "days": 60},
        {"name": "Infinity", "roi": 25, "min": 1000, "max": 20000, "days": 90, "vip": True}
    ],
    "SOL": [
        {"name": "Starter", "roi": 1, "min": 1, "max": 5, "days": 10},
        {"name": "Basic", "roi": 2.8, "min": 10, "max": 50, "days": 21},
        {"name": "Golden", "roi": 4, "min": 40, "max": 160, "days": 30},
        {"name": "Advanced", "roi": 7, "min": 120, "max": 500, "days": 45},
        {"name": "Platine", "roi": 9, "min": 200, "max": 1000, "days": 60},
        {"name": "Infinity", "roi": 14, "min": 500, "max": 2500, "days": 90, "vip": True}
    ],
    "BNB": [
        {"name": "Starter", "roi": 0.8, "min": 0.05, "max": 1, "days": 10},
        {"name": "Basic", "roi": 1.8, "min": 1, "max": 4, "days": 21},
        {"name": "Golden", "roi": 3, "min": 5, "max": 50, "days": 30},
        {"name": "Advanced", "roi": 5, "min": 10, "max": 100, "days": 45},
        {"name": "Platine", "roi": 7, "min": 15, "max": 150, "days": 60},
        {"name": "Infinity", "roi": 11, "min": 25, "max": 200, "days": 90, "vip": True}
    ]
}

def calculate_roi(investment: Decimal, roi: float, days: int) -> Decimal:
    """حساب العوائد بناءً على الاستثمار"""
    return investment * roi * days

def find_mining_plan(investment: Decimal, asset: str):
    """البحث عن خطة التعدين المناسبة بناءً على الاستثمار و العملة"""
    if asset not in MINING_PLANS:
        raise HTTPException(400, f"Mining plans are not available for {asset}")
    
    for plan in MINING_PLANS[asset]:
        if plan["min"] <= investment <= plan["max"]:
            return plan
    return None

def start_mining(investment: Decimal, asset: str):
    """بدء التعدين بناءً على الاستثمار والعملات المدعومة"""
    if investment <= 0:
        raise HTTPException(400, "Invalid investment")
    
    plan = find_mining_plan(investment, asset)
    if not plan:
        raise HTTPException(400, "Investment does not match any available plans for this asset")
    
    roi = calculate_roi(investment, plan["roi"], plan["days"])
    return {"plan": plan["name"], "roi": roi, "asset": asset}
