import os
import logging
import requests
from telegram import Update
from telegram.ext import Updater, CommandHandler, CallbackContext
from fastapi import HTTPException
from finance import debit_wallet, credit_wallet, casino_history

# ======================================================
# CONFIG
# ======================================================

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

#  Admin Telegram IDs
ADMINS = {123456789}  # عدّلها

#  Feature Flags (Source of Truth)
FEATURES = {
    "market": True,
    "casino": True,
    "mining": True,
    "ston_fi": False,   #  مخفي افتراضيًا
}

# ======================================================
# SETUP
# ======================================================

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

updater = Updater(token=TELEGRAM_TOKEN, use_context=True)
dispatcher = updater.dispatcher

# ======================================================
# HELPERS
# ======================================================

def api_get(endpoint: str, params=None):
    r = requests.get(f"{API_BASE_URL}{endpoint}", params=params, timeout=15)
    r.raise_for_status()
    return r.json()

def api_post(endpoint: str, data=None):
    r = requests.post(f"{API_BASE_URL}{endpoint}", json=data, timeout=15)
    r.raise_for_status()
    return r.json()

# ------------------ Guards ------------------

def feature_required(feature):
    def decorator(fn):
        def wrapper(update: Update, context: CallbackContext):
            if not FEATURES.get(feature, False):
                update.message.reply_text(" This feature is temporarily disabled.")
                return
            return fn(update, context)
        return wrapper
    return decorator

def admin_only(fn):
    def wrapper(update: Update, context: CallbackContext):
        uid = update.message.from_user.id
        if uid not in ADMINS:
            update.message.reply_text(" Admins only.")
            return
        return fn(update, context)
    return wrapper

# ======================================================
# BASIC
# ======================================================

def start(update: Update, context: CallbackContext):
    msg = " Welcome to BX Bot\n\n"

    if FEATURES["mining"]:
        msg += "/mining\n"

    if FEATURES["market"]:
        msg += "/recent_market\n"

    msg += (
        "/deposit_binance <amount>\n"
        "/deposit_ton\n"
        "/balance\n"
        "/ton_history\n"
    )

    update.message.reply_text(msg)

# ======================================================
# AIRDROP
# ======================================================

def airdrop(update: Update, context: CallbackContext):
    uid = update.message.from_user.id
    r = api_get("/bxing/airdrop/status", {"uid": uid})

    if r.get("claimed"):
        update.message.reply_text(" You already claimed your airdrop.")
    else:
        update.message.reply_text(
            f" Airdrop reward: {r['reward']} BX\nUse /claim to receive it."
        )

def claim(update: Update, context: CallbackContext):
    uid = update.message.from_user.id
    r = api_post("/bxing/airdrop/claim", {"uid": uid})

    if r.get("status") == "ok":
        update.message.reply_text(f" Airdrop claimed: {r['reward']} BX")
    else:
        update.message.reply_text(" Airdrop already claimed.")

# ======================================================
# REFERRAL
# ======================================================

def referral(update: Update, context: CallbackContext):
    uid = update.message.from_user.id
    r = api_get("/bxing/referral/link", {"uid": uid})
    update.message.reply_text(f"🔗 Your referral link:\n{r['link']}")

def leaderboard(update: Update, context: CallbackContext):
    rows = api_get("/bxing/referral/leaderboard")
    msg = " Top Referrals:\n\n"
    for i, u in enumerate(rows, 1):
        msg += f"{i}. UID {u['id']} — {u['referrals']} referrals\n"
    update.message.reply_text(msg)

# ======================================================
# MINING
# ======================================================

@feature_required("mining")
def mining(update: Update, context: CallbackContext):
    uid = update.message.from_user.id
    rows = api_get("/bxing/mining/active", {"uid": uid})

    if not rows:
        update.message.reply_text(" No active mining orders.")
        return

    msg = " Active Mining:\n\n"
    for o in rows:
        msg += f"{o['asset']} | Plan {o['plan']} | ROI {o['roi']} BX\n"
    update.message.reply_text(msg)

def start_mining(update: Update, context: CallbackContext):
    uid = update.message.from_user.id
    try:
        asset, plan, amount = context.args
        amount = float(amount)
    except Exception:
        update.message.reply_text("Usage: /start_mining <asset> <plan> <amount>")
        return

    r = api_post("/bxing/mining/start", {
        "uid": uid,
        "asset": asset,
        "plan_id": plan,
        "investment": amount
    })

    if r.get("status") == "started":
        update.message.reply_text(
            f" Mining started\nExpected ROI: {r['estimated_return']} BX"
        )
    else:
        update.message.reply_text(" Failed to start mining.")

# ======================================================
# BINANCE PAY (DEPOSIT ONLY — SAFE)
# ======================================================

# API_KEY و URL متغيرات البيئة
BINANCE_PAY_URL = os.getenv("BINANCE_PAY_URL")
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")

def process_binancepay_deposit(uid: int, amount: float, asset: str, txid: str):
    """
    معاملة إيداع عبر BinancePay مع التحقق من النجاح.
    """
    if not BINANCE_API_KEY or not BINANCE_PAY_URL:
        raise HTTPException(500, "BINANCE_PAY_NOT_CONFIGURED")

    # تحقق من الرصيد
    if amount <= 0:
        raise HTTPException(400, "AMOUNT_INVALID")

    try:
        # إرسال طلب إلى API الخاص بـ BinancePay
        response = requests.post(
            BINANCE_PAY_URL,
            json={
                "api_key": BINANCE_API_KEY,
                "uid": uid,
                "asset": asset,
                "amount": amount,
                "txid": txid,
            }
        )

        # تحقق من استجابة BinancePay
        if response.status_code != 200:
            raise HTTPException(500, f"BINANCE_PAY_ERROR: {response.text}")

        # إذا تمت المعاملة بنجاح
        if response.json().get("status") == "success":
            # تحديث المحفظة
            credit_wallet(uid, asset, amount, f"binancepay_deposit_{txid}")
            return {"status": "success", "amount": amount}

        else:
            raise HTTPException(500, "BINANCE_PAY_TRANSACTION_FAILED")

    except requests.exceptions.RequestException as e:
        raise HTTPException(500, f"BINANCE_PAY_CONNECTION_ERROR: {str(e)}")
# ======================================================
# TON
# ======================================================

def deposit_ton(update: Update, context: CallbackContext):
    uid = update.message.from_user.id
    r = api_get("/api/ton/address", {"uid": uid})

    update.message.reply_text(
        f" TON Deposit Address:\n\n{r['address']}\n\n"
        f" Send only TON.\nBalance updates after confirmation."
    )

def ton_history(update: Update, context: CallbackContext):
    uid = update.message.from_user.id
    rows = api_get("/api/ton/deposits", {"uid": uid})

    if not rows:
        update.message.reply_text(" No TON deposits yet.")
        return

    msg = " TON Deposit History:\n\n"
    for r in rows[:10]:
        msg += f"{r['amount']} TON — {r['tx_hash'][:10]}...\n"
    update.message.reply_text(msg)

# ======================================================
# WALLET / MARKET / CASINO
# ======================================================

def balance(update: Update, context: CallbackContext):
    uid = update.message.from_user.id
    r = api_get("/api/wallet", {"uid": uid})

    msg = " Balance:\n\n"
    for k, v in r.items():
        msg += f"{k.upper()}: {v}\n"
    update.message.reply_text(msg)

@feature_required("market")
def recent_market(update: Update, context: CallbackContext):
    rows = api_get("/market/recent")
    msg = " Recent Market Trades:\n\n"
    for t in rows:
        msg += f"{t['pair']} | {t['side']} {t['amount']} @ {t['price']}\n"
    update.message.reply_text(msg)

@feature_required("casino")
def recent_casino(update: Update, context: CallbackContext):
    rows = api_get("/casino/recent")
    msg = " Recent Casino Games:\n\n"
    for g in rows:
        msg += f"{g['game']} | Bet {g['bet']} | Reward {g['reward']}\n"
    update.message.reply_text(msg)

# ======================================================
# STON.FI — ADMIN ONLY (HIDDEN)
# ======================================================

@admin_only
@feature_required("ston_fi")
def ston_price(update: Update, context: CallbackContext):
    r = api_get("/api/ston/price")
    update.message.reply_text(
        f" STON.FI BX/TON\nPrice: {r['price']} TON\nLiquidity: {r['liquidity']} TON"
    )

# ======================================================
# HANDLERS
# ======================================================

dispatcher.add_handler(CommandHandler("start", start))
dispatcher.add_handler(CommandHandler("airdrop", airdrop))
dispatcher.add_handler(CommandHandler("claim", claim))
dispatcher.add_handler(CommandHandler("referral", referral))
dispatcher.add_handler(CommandHandler("leaderboard", leaderboard))
dispatcher.add_handler(CommandHandler("mining", mining))
dispatcher.add_handler(CommandHandler("start_mining", start_mining))
dispatcher.add_handler(CommandHandler("deposit_binance", deposit_binance))
dispatcher.add_handler(CommandHandler("deposit_ton", deposit_ton))
dispatcher.add_handler(CommandHandler("ton_history", ton_history))
dispatcher.add_handler(CommandHandler("balance", balance))
dispatcher.add_handler(CommandHandler("recent_market", recent_market))
dispatcher.add_handler(CommandHandler("recent_casino", recent_casino))

# 👑 Admin-only (مخفي)
dispatcher.add_handler(CommandHandler("ston_price", ston_price))

# ======================================================
# RUN
# ======================================================

updater.start_polling()
updater.idle()
