import os
import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# إعداد FastAPI
app = FastAPI(
    title="Bloxio API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# إضافة CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.bloxio.online", "https://bloxio.online"],  # تحديد مصادر السماح
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API URLs
BINANCE_PAY_API_URL = "https://api.binancepay.com"
WALLETCONNECT_API_URL = "https://api.walletconnect.org"
STON_FI_API_BASE = "https://api.ston.fi"
API_BASE_URL = "http://localhost:8000"

# Dummy Data for Casino and Market
recent_casino_data = [
    {"game": "Roulette", "player": "User123", "bet": 50, "outcome": "Win", "reward": 100},
    {"game": "Blackjack", "player": "User456", "bet": 30, "outcome": "Lose", "reward": 0},
    {"game": "Poker", "player": "User789", "bet": 100, "outcome": "Win", "reward": 200},
]

recent_market_data = [
    {"pair": "BX/USDT", "side": "buy", "amount": 10, "price": 100},
    {"pair": "BX/USDT", "side": "sell", "amount": 5, "price": 105},
    {"pair": "BX/ETH", "side": "buy", "amount": 2, "price": 2500},
]

# ================== Models ==================

# نموذج API لعملية التعدين
class MiningOrder(BaseModel):
    asset: str
    plan: str
    investment: float
    user_id: int

# ================== Routes ==================

@app.get("/")
def root():
    return {"status": "running", "service": "bloxio-api", "env": os.getenv("ENV", "production")}

@app.get("/health")
def health():
    return {"status": "ok"}

# ================== Recent Casino ==================

@app.get("/casino/recent")
def get_recent_casino():
    """ استرجاع بيانات الألعاب الأخيرة في الكازينو """
    return {"recent_casino": recent_casino_data}

# ================== Recent Market ==================

@app.get("/market/recent")
def get_recent_market():
    """ استرجاع بيانات العمليات الأخيرة في السوق """
    return {"recent_market": recent_market_data}

# ================== Airdrop ==================

@app.get("/bxing/airdrop/status")
def airdrop_status(uid: int):
    """ استرجاع حالة Airdrop للمستخدم """
    # في حالة وهمية، لا بد من التحقق في قاعدة البيانات الحقيقية هنا.
    return {"claimed": False, "reward": 50}

@app.post("/bxing/airdrop/claim")
def claim_airdrop(uid: int):
    """ مطالبة المستخدم بـ Airdrop """
    # في حالة وهمية، لا بد من التحقق في قاعدة البيانات الحقيقية هنا.
    return {"status": "ok", "reward": 50}

# ================== Referral ==================

@app.get("/bxing/referral/link")
def get_referral_link(uid: int):
    """ استرجاع رابط الإحالة للمستخدم """
    # نقوم بإنشاء رابط إحالة وهمي
    return {"link": f"https://bloxio.online/referral/{uid}"}

@app.get("/bxing/referral/leaderboard")
def get_referral_leaderboard():
    """ استرجاع قائمة المتصدرين للإحالات """
    return [
        {"id": 1, "referrals": 50},
        {"id": 2, "referrals": 30},
        {"id": 3, "referrals": 10},
    ]

# ================== Mining ==================

@app.post("/bxing/mining/start")
def start_mining(order: MiningOrder):
    """ بدء عملية التعدين للمستخدم """
    # التحقق من صلاحية الطلب
    if order.investment < 10:
        raise HTTPException(status_code=400, detail="Minimum investment is 10.")
    
    # إنشاء العملية الوهمية
    return {"status": "started", "estimated_return": order.investment * 1.2}  # مثال لحساب العائد المتوقع

@app.get("/bxing/mining/active")
def get_active_mining(uid: int):
    """ استرجاع العمليات النشطة للتعدين للمستخدم """
    return [
        {"asset": "BX", "plan": "Starter", "roi": 2.5},
        {"asset": "TON", "plan": "Platinum", "roi": 5.5}
    ]

# ================== WalletConnect ==================

@app.post("/walletconnect/connect")
def connect_wallet(user_id: int, wallet_address: str):
    """ ربط محفظة المستخدم مع WalletConnect """
    # الاتصال مع WalletConnect (دالة وهمية)
    return {"status": "success", "message": f"Wallet {wallet_address} connected successfully."}

# ================== Binance Pay ==================

@app.post("/binancepay/pay")
def binance_pay(user_id: int, amount: float, recipient_address: str):
    """ إجراء دفع باستخدام Binance Pay """
    # إرسال طلب لـ Binance Pay
    transaction_data = {
        "user_id": user_id,
        "amount": amount,
        "recipient_address": recipient_address
    }
    
    # الرد الوهمي
    return {"status": "success", "message": f"Successfully paid {amount} to {recipient_address} via Binance Pay."}

# ================== Ston.fi ==================

@app.get("/stonfi/bx_price")
def get_bx_price():
    """ استرجاع سعر BX من Ston.fi """
    return {"price": 100}  # قيمة وهمية

@app.post("/stonfi/buy")
def buy_bx(user_id: int, amount: float, price: float):
    """ تنفيذ عملية شراء BX عبر Ston.fi """
    total_price = amount * price
    return {"status": "success", "message": f"Bought {amount} BX for {total_price} USDT."}

@app.post("/stonfi/sell")
def sell_bx(user_id: int, amount: float, price: float):
    """ تنفيذ عملية بيع BX عبر Ston.fi """
    total_price = amount * price
    return {"status": "success", "message": f"Sold {amount} BX for {total_price} USDT."}
