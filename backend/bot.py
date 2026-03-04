# ==========================================================
# BLOXIO TELEGRAM BOT
# Casino • Wallet • Market • Mining • Airdrop
# ==========================================================

import os
import requests

from telegram import (
    Update,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo
)

from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes
)

API_URL = os.getenv("API_URL", "https://bx-vw7a.onrender.com")
BOT_TOKEN = os.getenv("TELEGRAM_TOKEN")

# ==========================================================
# MENU
# ==========================================================

def main_menu():

    keyboard = [

        [
            InlineKeyboardButton(
                "💰 Wallet",
                web_app=WebAppInfo(url=f"{API_URL}")
            )
        ],

        [
            InlineKeyboardButton("🎰 Casino", callback_data="casino"),
            InlineKeyboardButton("📈 Market", callback_data="market")
        ],

        [
            InlineKeyboardButton("⛏ Mining", callback_data="mining"),
            InlineKeyboardButton("🎁 Airdrop", callback_data="airdrop")
        ]
    ]

    return InlineKeyboardMarkup(keyboard)


# ==========================================================
# START
# ==========================================================

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):

    user = update.effective_user

    text = f"""
🚀 Welcome to BLOXIO

User: {user.first_name}

Features:
💰 Wallet
🎰 Casino
📈 Market
⛏ Mining
🎁 Airdrop
"""

    await update.message.reply_text(
        text,
        reply_markup=main_menu()
    )


# ==========================================================
# CASINO
# ==========================================================

async def casino_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):

    q = update.callback_query
    await q.answer()

    text = """
🎰 Casino

Play games directly in WebApp.
"""

    await q.edit_message_text(
        text,
        reply_markup=InlineKeyboardMarkup(
            [[InlineKeyboardButton("🎰 Open Casino", web_app=WebAppInfo(url=API_URL))]]
        )
    )


# ==========================================================
# MARKET
# ==========================================================

async def market_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):

    q = update.callback_query
    await q.answer()

    text = """
📈 Market

Trade crypto assets.
"""

    await q.edit_message_text(
        text,
        reply_markup=InlineKeyboardMarkup(
            [[InlineKeyboardButton("📈 Open Market", web_app=WebAppInfo(url=API_URL))]]
        )
    )


# ==========================================================
# MINING
# ==========================================================

async def mining_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):

    q = update.callback_query
    await q.answer()

    text = """
⛏ Mining

Subscribe to mining plans.
"""

    await q.edit_message_text(
        text,
        reply_markup=InlineKeyboardMarkup(
            [[InlineKeyboardButton("⛏ Start Mining", web_app=WebAppInfo(url=API_URL))]]
        )
    )


# ==========================================================
# AIRDROP
# ==========================================================

async def airdrop_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):

    q = update.callback_query
    await q.answer()

    text = """
🎁 Airdrop

Claim your reward.
"""

    await q.edit_message_text(
        text,
        reply_markup=InlineKeyboardMarkup(
            [[InlineKeyboardButton("🎁 Claim Airdrop", web_app=WebAppInfo(url=API_URL))]]
        )
    )


# ==========================================================
# BIG WIN NOTIFICATION
# ==========================================================

def notify_big_win(username, amount, game):

    try:

        requests.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={
                "chat_id": "@bloxio_wins",
                "text": f"🎉 BIG WIN\n\nUser: {username}\nGame: {game}\nAmount: {amount} BX"
            }
        )

    except:
        pass


# ==========================================================
# DEPOSIT NOTIFICATION
# ==========================================================

def notify_deposit(username, amount, asset):

    try:

        requests.post(
            f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage",
            json={
                "chat_id": "@bloxio_deposits",
                "text": f"💰 Deposit\n\nUser: {username}\nAmount: {amount} {asset}"
            }
        )

    except:
        pass


# ==========================================================
# CALLBACK ROUTER
# ==========================================================

async def router(update: Update, context: ContextTypes.DEFAULT_TYPE):

    q = update.callback_query

    if q.data == "casino":
        await casino_menu(update, context)

    elif q.data == "market":
        await market_menu(update, context)

    elif q.data == "mining":
        await mining_menu(update, context)

    elif q.data == "airdrop":
        await airdrop_menu(update, context)


# ==========================================================
# START BOT
# ==========================================================

async def start_bot():

    if not BOT_TOKEN:
        print("Telegram token missing")
        return

    app = ApplicationBuilder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(router))

    print("Telegram bot started")

    await app.initialize()
    await app.start()
    await app.updater.start_polling()
