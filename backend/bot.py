import os
import logging
import requests
import time
from collections import defaultdict, deque
from telegram import Update
from telegram.ext import Updater, CommandHandler, CallbackContext

# ======================================================
# CONFIG
# ======================================================

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

if not TELEGRAM_TOKEN:
    logger.warning("TELEGRAM_TOKEN not set — bot disabled")
    TELEGRAM_TOKEN = None

ADMINS = {123456789}

FEATURES = {
    "market": True,
    "casino": True,
    "mining": True,
    "ston_fi": True,   # مفعّل الآن
}

RATE_LIMIT_SECONDS = 2

# ======================================================
# LOGGING
# ======================================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Bloxio_bot")

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
# SETUP
# ======================================================

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

if not TELEGRAM_TOKEN:
    logger.warning("TELEGRAM_TOKEN not set — bot disabled")
    
# ======================================================
# GUARDS
# ======================================================

def feature_required(feature):
    def decorator(fn):
        def wrapper(update: Update, context: CallbackContext):
            if not FEATURES.get(feature):
                update.message.reply_text("Feature temporarily disabled.")
                return
            return fn(update, context)
        return wrapper
    return decorator

def admin_only(fn):
    def wrapper(update: Update, context: CallbackContext):
        if update.message.from_user.id not in ADMINS:
            update.message.reply_text("Admins only.")
            return
        return fn(update, context)
    return wrapper

def safe_handler(fn):
    def wrapper(update: Update, context: CallbackContext):
        try:
            uid = update.message.from_user.id
            if rate_limited(uid):
                update.message.reply_text("Too many requests. Slow down.")
                return
            return fn(update, context)
        except Exception as e:
            logger.error(f"Handler error: {e}")
            update.message.reply_text("Internal error. Try again later.")
    return wrapper

# ======================================================
# BASIC
# ======================================================

@safe_handler
def start(update: Update, context: CallbackContext):
    msg = "BX Bot Commands:\n\n"
    msg += "/balance\n"
    msg += "/deposit_binance <amount>\n"
    msg += "/deposit_ton\n"
    msg += "/ton_history\n"
    msg += "/recent_market BX/USDT\n"
    msg += "/ston_price\n"
    msg += "/ston_quote <amount>\n"
    update.message.reply_text(msg)

# ======================================================
# WALLET
# ======================================================

@safe_handler
def balance(update: Update, context: CallbackContext):
    uid = update.message.from_user.id
    r = safe_get("/me", {"uid": uid})

    if not r:
        update.message.reply_text("Failed to fetch wallet.")
        return

    wallet = r.get("wallet", {})
    msg = "Balance:\n\n"
    for k, v in wallet.items():
        msg += f"{k.upper()}: {v}\n"
    update.message.reply_text(msg)

# ======================================================
# BINANCE PAY
# ======================================================

@safe_handler
def deposit_binance(update: Update, context: CallbackContext):
    if not context.args:
        update.message.reply_text("Usage: /deposit_binance <amount>")
        return

    uid = update.message.from_user.id

    try:
        amount = float(context.args[0])
    except:
        update.message.reply_text("Invalid amount.")
        return

    r = safe_post("/wallet/binancepay", {
        "uid": uid,
        "amount": amount
    })

    if not r:
        update.message.reply_text("Deposit failed.")
        return

    update.message.reply_text("Deposit request created.")

# ======================================================
# TON
# ======================================================

@safe_handler
def deposit_ton(update: Update, context: CallbackContext):
    uid = update.message.from_user.id
    r = safe_get("/api/ton/address", {"uid": uid})

    if not r:
        update.message.reply_text("Failed to get address.")
        return

    update.message.reply_text(f"TON Address:\n\n{r['address']}")

@safe_handler
def ton_history(update: Update, context: CallbackContext):
    uid = update.message.from_user.id
    rows = safe_get("/api/ton/deposits", {"uid": uid})

    if not rows:
        update.message.reply_text("No TON deposits.")
        return

    msg = "TON Deposits:\n\n"
    for r in rows[:10]:
        msg += f"{r['amount']} TON\n"
    update.message.reply_text(msg)

# ======================================================
# MARKET
# ======================================================

@safe_handler
@feature_required("market")
def recent_market(update: Update, context: CallbackContext):
    if not context.args:
        update.message.reply_text("Usage: /recent_market <pair>")
        return

    pair = context.args[0]
    rows = safe_get(f"/market/recent/{pair}")

    if not rows:
        update.message.reply_text("No trades.")
        return

    msg = f"{pair} Trades:\n\n"
    for t in rows[:10]:
        msg += f"{t['amount']} @ {t['price']}\n"
    update.message.reply_text(msg)

# ======================================================
# STON.FI (FULL INTEGRATION)
# ======================================================

@safe_handler
@feature_required("ston_fi")
def ston_price(update: Update, context: CallbackContext):
    r = safe_get("/ston/price")
    if not r:
        update.message.reply_text("STON unavailable.")
        return

    update.message.reply_text(
        f"STON BX/TON\nPrice: {r['price']} TON\nLiquidity: {r['liquidity']} TON"
    )

@safe_handler
@feature_required("ston_fi")
def ston_quote(update: Update, context: CallbackContext):
    if not context.args:
        update.message.reply_text("Usage: /ston_quote <bx_amount>")
        return

    try:
        amount = float(context.args[0])
    except:
        update.message.reply_text("Invalid amount.")
        return

    r = safe_get("/ston/quote", {"amount": amount})
    if not r:
        update.message.reply_text("Quote failed.")
        return

    update.message.reply_text(
        f"Swap Simulation:\nBX In: {r['bx_in']}\nTON Out: {r['ton_out']}\nFee: {r['fee']}"
    )

# ======================================================
# REGISTER HANDLERS
# ======================================================

if dispatcher:
    dispatcher.add_handler(CommandHandler("start", start))
    dispatcher.add_handler(CommandHandler("balance", balance))
    dispatcher.add_handler(CommandHandler("deposit_binance", deposit_binance))
    dispatcher.add_handler(CommandHandler("deposit_ton", deposit_ton))
    dispatcher.add_handler(CommandHandler("ton_history", ton_history))
    dispatcher.add_handler(CommandHandler("recent_market", recent_market))
    dispatcher.add_handler(CommandHandler("ston_price", ston_price))
    dispatcher.add_handler(CommandHandler("ston_quote", ston_quote))
    
# ======================================================
# RUN
# ======================================================

def start_bot():
    if not TELEGRAM_TOKEN:
        logger.warning("Bot not started — no TELEGRAM_TOKEN")
        return

    logger.info("🤖 Telegram Bot starting...")

    try:
        updater.start_polling()
        updater.idle()
    except Exception as e:
        logger.error(f"Telegram Bot crashed: {e}")
