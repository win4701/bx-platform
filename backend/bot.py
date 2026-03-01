import os
import logging
import requests
import time
from collections import defaultdict
from telegram import Update
from telegram.ext import Updater, CommandHandler, CallbackContext

# ======================================================
# LOGGING
# ======================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Bloxio_bot")

# ======================================================
# CONFIG
# ======================================================

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

ADMINS = {123456789}

FEATURES = {
    "market": True,
    "casino": True,
    "mining": True,
    "ston_fi": True,
}

RATE_LIMIT_SECONDS = 2

# ======================================================
# RATE LIMIT
# ======================================================

_user_last_call = defaultdict(float)

def rate_limited(uid):
    now = time.time()
    if now - _user_last_call[uid] < RATE_LIMIT_SECONDS:
        return True
    _user_last_call[uid] = now
    return False

# ======================================================
# SAFE API WRAPPERS
# ======================================================

def safe_get(endpoint, params=None):
    try:
        r = requests.get(f"{API_BASE_URL}{endpoint}", params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"GET {endpoint} failed: {e}")
        return None

def safe_post(endpoint, data=None):
    try:
        r = requests.post(f"{API_BASE_URL}{endpoint}", json=data, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        logger.error(f"POST {endpoint} failed: {e}")
        return None

# ======================================================
# HANDLERS
# ======================================================

def safe_handler(fn):
    def wrapper(update: Update, context: CallbackContext):
        try:
            uid = update.message.from_user.id
            if rate_limited(uid):
                update.message.reply_text("Too many requests.")
                return
            return fn(update, context)
        except Exception as e:
            logger.error(f"Handler error: {e}")
            update.message.reply_text("Internal error.")
    return wrapper


@safe_handler
def start(update: Update, context: CallbackContext):
    update.message.reply_text("Bot is running.")

# ======================================================
# START BOT (SAFE)
# ======================================================

def start_bot():
    if not TELEGRAM_TOKEN:
        logger.warning("Bot not started — TELEGRAM_TOKEN missing")
        return

    try:
        updater = Updater(token=TELEGRAM_TOKEN, use_context=True)
        dispatcher = updater.dispatcher

        dispatcher.add_handler(CommandHandler("start", start))

        logger.info("🤖 Telegram Bot started")
        updater.start_polling()
        updater.idle()

    except Exception as e:
        logger.error(f"Bot crashed: {e}")
