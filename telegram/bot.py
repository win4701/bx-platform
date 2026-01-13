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

# ======================================================
# ENV
# ======================================================
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
API_BASE = os.getenv("API_BASE", "https://api.bloxio.online")
API_KEY = os.getenv("API_KEY")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")  # للـ Admin فقط

HEADERS = {
    "X-API-KEY": API_KEY,
    "Content-Type": "application/json"
}

ADMIN_HEADERS = {
    **HEADERS,
    "X-ADMIN-TOKEN": ADMIN_TOKEN
}

if not BOT_TOKEN or not API_KEY:
    raise RuntimeError("Missing TELEGRAM_BOT_TOKEN or API_KEY")

# ======================================================
# API HELPERS
# ======================================================
def api_get(path, params=None, admin=False):
    h = ADMIN_HEADERS if admin else HEADERS
    r = requests.get(API_BASE + path, headers=h, params=params, timeout=10)
    r.raise_for_status()
    return r.json()

# ======================================================
# KEYBOARDS
# ======================================================
def main_keyboard(uid: int):
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton(
                "🚀 Open App",
                web_app=WebAppInfo(
                    url=f"https://your-render-app.onrender.com/?uid={uid}"
                )
            )
        ],
        [
            InlineKeyboardButton("💼 Wallet", callback_data="wallet"),
            InlineKeyboardButton("💰 Deposit", callback_data="deposit"),
        ],
        [
            InlineKeyboardButton("📊 Market", callback_data="market"),
            InlineKeyboardButton("🎰 Casino", callback_data="casino"),
        ],
        [
            InlineKeyboardButton("⛏ Mining", callback_data="mining"),
            InlineKeyboardButton("🎁 Airdrop", callback_data="airdrop"),
        ],
        [
            InlineKeyboardButton("📜 History", callback_data="history"),
            InlineKeyboardButton("📈 Status", callback_data="status"),
        ],
        [
            InlineKeyboardButton("🛠 Admin", callback_data="admin"),
        ],
    ])

# ======================================================
# COMMANDS
# ======================================================
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    uid = update.effective_user.id
    await update.message.reply_text(
        "👋 Welcome to *Bloxio*\n\n"
        "• Secure deposits\n"
        "• BX Market\n"
        "• Casino / Mining\n"
        "• Airdrop rewards\n\n"
        "Use the buttons below 👇",
        parse_mode="Markdown",
        reply_markup=main_keyboard(uid)
    )

# ======================================================
# CALLBACK HANDLER
# ======================================================
async def on_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    q = update.callback_query
    await q.answer()
    uid = q.from_user.id

    try:
        # ---------------- Wallet ----------------
        if q.data == "wallet":
            me = api_get("/finance/me", {"uid": uid})
            w = me["wallet"]
            msg = (
                "💼 *Wallet*\n\n"
                f"BX: `{w['bx']}`\n"
                f"USDT: `{w['usdt']}`\n"
                f"TON: `{w['ton']}`\n"
                f"SOL: `{w['sol']}`\n"
                f"BTC: `{w['btc']}`"
            )
            await q.edit_message_text(msg, parse_mode="Markdown",
                                      reply_markup=main_keyboard(uid))

        # ---------------- Deposit ----------------
        elif q.data == "deposit":
            d = api_get("/finance/deposit_addresses")
            msg = (
                "💰 *Deposit*\n\n"
                "*SOL*\n"
                f"`{d['sol']}`\n"
                f"Memo: `UID:{uid}`\n\n"
                "*BTC*\n"
                f"`{d['btc']}`\n\n"
                "_Minimum 10 USDT equivalent_"
            )
            await q.edit_message_text(msg, parse_mode="Markdown",
                                      reply_markup=main_keyboard(uid))

        # ---------------- Market ----------------
        elif q.data == "market":
            p = api_get("/public/prices")
            msg = (
                "📊 *Market Prices*\n\n"
                f"BX: `{p['bx']}`\n"
                f"USDT: `{p['usdt']}`\n"
                f"TON: `{p['ton']}`\n"
                f"SOL: `{p['sol']}`\n"
                f"BTC: `{p['btc']}`"
            )
            await q.edit_message_text(msg, parse_mode="Markdown",
                                      reply_markup=main_keyboard(uid))

        # ---------------- Casino ----------------
        elif q.data == "casino":
            me = api_get("/finance/me", {"uid": uid})
            if me["deposit_status"] != "confirmed":
                msg = "⏳ Deposit not confirmed yet."
            else:
                msg = (
                    "🎰 *Casino*\n\n"
                    "• Slot\n"
                    "• Dice\n"
                    "• Crash\n"
                    "• Roulette\n"
                    "• Coinflip\n"
                    "• Chicken Road\n"
                    "• Beast ×100\n\n"
                    "Open the app to play."
                )
            await q.edit_message_text(msg, parse_mode="Markdown",
                                      reply_markup=main_keyboard(uid))

        # ---------------- Mining ----------------
        elif q.data == "mining":
            msg = (
                "⛏ *Mining*\n\n"
                "• Stake BX or SOL\n"
                "• Earn rewards\n"
                "• Dynamic difficulty\n\n"
                "Open the app for details."
            )
            await q.edit_message_text(msg, parse_mode="Markdown",
                                      reply_markup=main_keyboard(uid))

        # ---------------- Airdrop ----------------
        elif q.data == "airdrop":
            msg = (
                "🎁 *Airdrop*\n\n"
                "• Invite users\n"
                "• Bring liquidity\n"
                "• Earn BX rewards\n\n"
                "Tracked transparently."
            )
            await q.edit_message_text(msg, parse_mode="Markdown",
                                      reply_markup=main_keyboard(uid))

        # ---------------- History ----------------
        elif q.data == "history":
            msg = (
                "📜 *History*\n\n"
                "• Deposits\n"
                "• Trades\n"
                "• Casino games\n\n"
                "Available inside the app."
            )
            await q.edit_message_text(msg, parse_mode="Markdown",
                                      reply_markup=main_keyboard(uid))

        # ---------------- Status ----------------
        elif q.data == "status":
            h = api_get("/health")
            msg = (
                "📈 *System Status*\n\n"
                f"API: `{h['status']}`\n"
                f"Time: `{h['ts']}`"
            )
            await q.edit_message_text(msg, parse_mode="Markdown",
                                      reply_markup=main_keyboard(uid))

        # ---------------- Admin ----------------
        elif q.data == "admin":
            try:
                m = api_get("/health", admin=True)
                msg = (
                    "🛠 *Admin Panel*\n\n"
                    "• Pending deposits\n"
                    "• Ledger\n"
                    "• Watcher metrics\n\n"
                    "Use the web admin UI."
                )
            except:
                msg = "❌ Admin access only."
            await q.edit_message_text(msg, parse_mode="Markdown",
                                      reply_markup=main_keyboard(uid))

    except Exception as e:
        await q.edit_message_text(
            f"❌ Error: {e}",
            reply_markup=main_keyboard(uid)
        )

# ======================================================
# MAIN
# ======================================================
def main():
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(on_callback))
    app.run_polling(drop_pending_updates=True)

if __name__ == "__main__":
    main()
