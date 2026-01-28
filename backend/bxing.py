# bxing.py
from fastapi import HTTPException
from decimal import Decimal
import sqlite3
from time import time

# إعدادات قاعدة البيانات
DB_PATH = "db/bxing.db"

def db():
    connection = sqlite3.connect(DB_PATH)
    return connection

def close_connection(connection):
    connection.commit()
    connection.close()

# ============================================
#  Airdrop - توزيع المكافآت
# ============================================
def process_airdrop(uid: int, asset: str, amount: float):
    """
    يقوم هذا الدالة بمعالجة توزيع الـ Airdrop بناءً على معايير محددة مثل حجم الإيداع
    """
    if asset not in ["BX", "SOL", "BNB"]:
        raise HTTPException(400, "Airdrop is available only for BX, SOL, and BNB assets")
    
    if amount < 10:  # فرض شرط الحد الأدنى للإيداع
        raise HTTPException(400, "Airdrop minimum amount is 10 units of the asset")
    
    # تحقق من تأهيل المستخدم لتوزيع Airdrop
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
        # تنفيذ التوزيع في قاعدة البيانات
        c.execute("INSERT INTO airdrop (uid, asset, amount, timestamp) VALUES (?, ?, ?, ?)",
                  (uid, asset, amount, int(time())))
        close_connection(c.connection)
        print(f"Airdrop of {amount} {asset} distributed to user {uid}")
    except Exception as e:
        raise HTTPException(500, f"Error distributing airdrop: {str(e)}")

# ============================================
#  Mining - حساب العوائد
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
