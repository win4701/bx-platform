from aiogram import Bot, Dispatcher, executor, types
import os

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = "https://bx-ton-bot.onrender.com"

bot = Bot(BOT_TOKEN)
dp = Dispatcher(bot)

@dp.message_handler(commands=["start"])
async def start(msg: types.Message):
    kb = types.InlineKeyboardMarkup()
    kb.add(
        types.InlineKeyboardButton(
            text="🚀 Open BX App",
            web_app=types.WebAppInfo(url=WEBAPP_URL)
        )
    )
    await msg.answer(
        "Welcome to BX Platform ⛏️\nTap below to start mining.",
        reply_markup=kb
    )

if __name__ == "__main__":
    executor.start_polling(dp)
