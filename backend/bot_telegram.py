import os
import logging
import requests
from telegram import Update
from telegram.ext import Updater, CommandHandler, CallbackContext

# إعدادات الـ Token الخاص بـ Telegram Bot
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")  # تأكد من أنك قد قمت بإعداد التوكن في البيئة

updater = Updater(token=TELEGRAM_TOKEN, use_context=True)
dispatcher = updater.dispatcher

# إعدادات تسجيل الدخول
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

# API Endpoints
API_BASE_URL = "http://localhost:8000"  # تأكد من إدخال الرابط الصحيح لـ API
STON_FI_API_BASE = "https://api.ston.fi"  # API لـ ston.fi (تأكد من الرابط الصحيح)
WALLETCONNECT_API_URL = "https://api.walletconnect.org"  # API لـ WalletConnect
BINANCE_PAY_API_URL = "https://api.binancepay.com"  # API لـ Binance Pay

# --------------------- Helper Functions ---------------------

# دالة GET للتفاعل مع API
def api_get(endpoint: str):
    url = f"{API_BASE_URL}{endpoint}"
    response = requests.get(url)
    return response.json()

# دالة POST للتفاعل مع API
def api_post(endpoint: str, data=None):
    url = f"{API_BASE_URL}{endpoint}"
    response = requests.post(url, json=data)
    return response.json()

# --------------------- Airdrop ---------------------

def airdrop(update: Update, context: CallbackContext):
    user_id = update.message.from_user.id
    response = api_get(f"/bxing/airdrop/status?uid={user_id}")
    
    if response["claimed"]:
        update.message.reply_text("🎉 You've already claimed your Airdrop!")
    else:
        update.message.reply_text(f"💰 Your Airdrop reward: {response['reward']} BX. Type /claim to claim it.")

def claim(update: Update, context: CallbackContext):
    user_id = update.message.from_user.id
    response = api_post(f"/bxing/airdrop/claim?uid={user_id}")
    
    if response["status"] == "ok":
        update.message.reply_text(f"🎉 You've successfully claimed your Airdrop of {response['reward']} BX!")
    else:
        update.message.reply_text("❌ You have already claimed your Airdrop.")

# --------------------- Referral ---------------------

def referral(update: Update, context: CallbackContext):
    user_id = update.message.from_user.id
    referral_link = api_get(f"/bxing/referral/link?uid={user_id}")
    
    update.message.reply_text(f"Your referral link: {referral_link['link']}")

def leaderboard(update: Update, context: CallbackContext):
    leaderboard = api_get("/bxing/referral/leaderboard")
    
    message = "Top Referrals:\n"
    for idx, user in enumerate(leaderboard, 1):
        message += f"{idx}. User {user['id']} - {user['referrals']} referrals\n"
    
    update.message.reply_text(message)

# --------------------- Mining ---------------------

def mining(update: Update, context: CallbackContext):
    user_id = update.message.from_user.id
    mining_data = api_get(f"/bxing/mining/active?uid={user_id}")
    
    if mining_data:
        message = "Your Active Mining Orders:\n"
        for order in mining_data:
            message += f"Asset: {order['asset']} | Plan: {order['plan']} | ROI: {order['roi']} BX\n"
    else:
        message = "You have no active mining orders."
    
    update.message.reply_text(message)

def start_mining(update: Update, context: CallbackContext):
    user_id = update.message.from_user.id
    asset = context.args[0]
    plan_id = context.args[1]
    investment = float(context.args[2])
    
    response = api_post(f"/bxing/mining/start?uid={user_id}&asset={asset}&plan_id={plan_id}&investment={investment}")
    
    if response["status"] == "started":
        update.message.reply_text(f"Started mining with {asset} for plan {plan_id}. Expected ROI: {response['estimated_return']} BX.")
    else:
        update.message.reply_text("❌ Failed to start mining.")

# --------------------- WalletConnect ---------------------

# دالة لربط محفظة المستخدم مع WalletConnect
def connect_wallet(update: Update, context: CallbackContext):
    user_id = update.message.from_user.id
    wallet_address = context.args[0]  # عنوان المحفظة المدخل من المستخدم
    
    # إرسال طلب لـ WalletConnect لتوصيل المحفظة
    response = requests.post(f"{WALLETCONNECT_API_URL}/connect", json={"user_id": user_id, "wallet_address": wallet_address})
    
    if response.status_code == 200:
        update.message.reply_text(f"✅ Wallet connected successfully with address: {wallet_address}")
    else:
        update.message.reply_text("❌ Failed to connect wallet.")

# --------------------- Binance Pay ---------------------

# دالة لإجراء مدفوعات باستخدام Binance Pay
def binance_pay(update: Update, context: CallbackContext):
    user_id = update.message.from_user.id
    amount = float(context.args[0])  # المبلغ المدخل من المستخدم
    recipient_address = context.args[1]  # عنوان المستلم
    
    # تحقق من أن المبلغ أكبر من 0
    if amount <= 0:
        update.message.reply_text("❌ Please enter a valid amount to pay.")
        return
    
    # إرسال طلب إلى Binance Pay لتنفيذ الدفع
    transaction_data = {
        "user_id": user_id,
        "amount": amount,
        "recipient_address": recipient_address
    }
    
    response = requests.post(f"{BINANCE_PAY_API_URL}/pay", json=transaction_data)
    
    if response.status_code == 200:
        update.message.reply_text(f"✅ You have successfully paid {amount} to {recipient_address} via Binance Pay.")
    else:
        update.message.reply_text("❌ Failed to make the payment.")

# --------------------- Ston.fi Integration ---------------------

# دالة لشراء BX عبر ston.fi
def buy_bx(update: Update, context: CallbackContext):
    user_id = update.message.from_user.id
    amount = float(context.args[0])  # المبلغ المدخل من المستخدم
    price = get_bx_price()  # استرجاع سعر BX من ston.fi

    if amount <= 0:
        update.message.reply_text("❌ Please enter a valid amount to buy.")
        return

    total_price = amount * price
    if user_balance(user_id) < total_price:
        update.message.reply_text("❌ Insufficient funds!")
        return

    # تنفيذ عملية الشراء عبر ston.fi
    response = execute_buy_order(user_id, amount, price)

    if response["status"] == "success":
        update.message.reply_text(f"✅ You have successfully bought {amount} BX for {total_price} USDT.")
    else:
        update.message.reply_text("❌ Something went wrong while buying BX.")

# دالة للحصول على سعر BX من ston.fi
def get_bx_price():
    response = requests.get(f"{STON_FI_API_BASE}/bx_price")
    data = response.json()
    return data["price"]

# دالة لتنفيذ أمر الشراء على ston.fi
def execute_buy_order(user_id, amount, price):
    order_data = {
        "user_id": user_id,
        "amount": amount,
        "price": price
    }
    response = requests.post(f"{STON_FI_API_BASE}/buy", json=order_data)
    return response.json()

# --------------------- Recent Casino ---------------------

# دالة لعرض الألعاب الأخيرة في الكازينو
def recent_casino(update: Update, context: CallbackContext):
    response = api_get("/casino/recent")
    
    message = "Recent Casino Games:\n"
    for game in response["recent_casino"]:
        message += f"Game: {game['game']} | Player: {game['player']} | Bet: {game['bet']} | Outcome: {game['outcome']} | Reward: {game['reward']}\n"
    
    update.message.reply_text(message)

# --------------------- Recent Market ---------------------

# دالة لعرض العمليات الأخيرة في السوق
def recent_market(update: Update, context: CallbackContext):
    response = api_get("/market/recent")
    
    message = "Recent Market Trades:\n"
    for trade in response["recent_market"]:
        message += f"Pair: {trade['pair']} | Side: {trade['side']} | Amount: {trade['amount']} | Price: {trade['price']}\n"
    
    update.message.reply_text(message)

# --------------------- Command Handlers ---------------------

# إضافة الأوامر للبوت
dispatcher.add_handler(CommandHandler("airdrop", airdrop))
dispatcher.add_handler(CommandHandler("claim", claim))
dispatcher.add_handler(CommandHandler("referral", referral))
dispatcher.add_handler(CommandHandler("leaderboard", leaderboard))
dispatcher.add_handler(CommandHandler("mining", mining))
dispatcher.add_handler(CommandHandler("start_mining", start_mining))
dispatcher.add_handler(CommandHandler("connect_wallet", connect_wallet))
dispatcher.add_handler(CommandHandler("binance_pay", binance_pay))
dispatcher.add_handler(CommandHandler("buy_bx", buy_bx))
dispatcher.add_handler(CommandHandler("recent_casino", recent_casino))
dispatcher.add_handler(CommandHandler("recent_market", recent_market))

# بدء البوت
updater.start_polling()
updater.idle()
