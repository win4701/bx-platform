import os
import logging
import requests
from telegram import Update
from telegram.ext import Updater, CommandHandler, CallbackContext

# إعداد الـ Token الخاص بـ Telegram Bot
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")  # تأكد من أنك قد قمت بإعداد التوكن في البيئة

updater = Updater(token=TELEGRAM_TOKEN, use_context=True)
dispatcher = updater.dispatcher

# إعدادات تسجيل الدخول
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

# API Endpoints
API_BASE_URL = "http://localhost:8000"  # تأكد من إدخال الرابط الصحيح لـ API

def api_get(endpoint: str):
    url = f"{API_BASE_URL}{endpoint}"
    response = requests.get(url)
    return response.json()

def api_post(endpoint: str, data=None):
    url = f"{API_BASE_URL}{endpoint}"
    response = requests.post(url, json=data)
    return response.json()

# ================= Airdrop ==================

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

# ================= Referral ==================

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

# ================= Mining ==================

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

# ================= Command Handlers ==================

# Adding Command Handlers for the bot
dispatcher.add_handler(CommandHandler("airdrop", airdrop))
dispatcher.add_handler(CommandHandler("claim", claim))
dispatcher.add_handler(CommandHandler("referral", referral))
dispatcher.add_handler(CommandHandler("leaderboard", leaderboard))
dispatcher.add_handler(CommandHandler("mining", mining))
dispatcher.add_handler(CommandHandler("start_mining", start_mining))

# ================= Main ==================

# Start the bot
updater.start_polling()
updater.idle()
