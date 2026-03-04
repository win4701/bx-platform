import os
import logging
import requests
from telegram import Update, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from telegram.ext import Updater, CommandHandler, CallbackContext

======================================================

CONFIG

======================================================

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://bx-vw7a.onrender.com")
API_BASE = os.getenv("API_BASE_URL", "https://bx-vw7a.onrender.com")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bloxio_bot")

======================================================

SAFE API

======================================================

def api_get(endpoint, params=None):
try:
r = requests.get(f"{API_BASE}{endpoint}", params=params, timeout=10)
r.raise_for_status()
return r.json()
except Exception as e:
logger.error(e)
return None

======================================================

MAIN MENU

======================================================

def main_menu():

keyboard = [

    [
        InlineKeyboardButton(
            "🎰 Casino",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )
    ],

    [
        InlineKeyboardButton(
            "💰 Wallet",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )
    ],

    [
        InlineKeyboardButton(
            "📈 Market",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )
    ],

    [
        InlineKeyboardButton(
            "⛏ Mining",
            web_app=WebAppInfo(url=WEBAPP_URL)
        )
    ]

]

return InlineKeyboardMarkup(keyboard)

======================================================

START

======================================================

def start(update: Update, context: CallbackContext):

user = update.message.from_user

update.message.reply_text(

    f"Welcome {user.first_name} 🚀\n\n"
    "Bloxio platform is ready.\n"
    "Choose a section below:",

    reply_markup=main_menu()
)

======================================================

WALLET COMMAND

======================================================

def wallet(update: Update, context: CallbackContext):

uid = update.message.from_user.id

data = api_get("/api/wallet", {"uid": uid})

if not data:
    update.message.reply_text("Wallet unavailable.")
    return

text = "💰 Wallet\n\n"

for k, v in data.items():
    text += f"{k.upper()} : {v}\n"

update.message.reply_text(text)

======================================================

CASINO BIG WIN NOTIFY

======================================================

def notify_big_win(context: CallbackContext):

data = api_get("/public/rtp")

if not data:
    return

message = (
    "🔥 Big Casino Win!\n\n"
    "Someone just won big on Bloxio 🎰"
)

for uid in context.bot_data.get("users", []):
    try:
        context.bot.send_message(uid, message)
    except:
        pass

======================================================

DEPOSIT NOTIFY

======================================================

def notify_deposit(context: CallbackContext):

deposits = api_get("/finance/history")

if not deposits:
    return

for d in deposits:

    uid = d.get("uid")

    try:
        context.bot.send_message(
            uid,
            f"💰 Deposit received\n\n{d['amount']} {d['asset']}"
        )
    except:
        pass

======================================================

START BOT

======================================================

def start_bot():

if not TELEGRAM_TOKEN:
    logger.warning("No TELEGRAM_TOKEN")
    return

updater = Updater(TELEGRAM_TOKEN, use_context=True)

dp = updater.dispatcher

dp.add_handler(CommandHandler("start", start))
dp.add_handler(CommandHandler("wallet", wallet))

# notifications loop
updater.job_queue.run_repeating(notify_big_win, 60)
updater.job_queue.run_repeating(notify_deposit, 120)

logger.info("Telegram bot started")

updater.start_polling()
updater.idle()
