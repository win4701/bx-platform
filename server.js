import express from "express";
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

if (!process.env.BOT_TOKEN) {
  console.error("❌ BOT_TOKEN missing");
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.static("."));

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

/* ======================
   In-Memory Store (مرحلة 1)
====================== */
const users = {};
const adminIds = [/* ضع ID الأدمن هنا */];

/* ======================
   Helpers
====================== */
function getUser(id) {
  if (!users[id]) {
    users[id] = {
      bx: 0,
      pendingBuy: null,
    };
  }
  return users[id];
}

/* ======================
   Telegram Bot
====================== */
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  getUser(chatId);

  bot.sendMessage(chatId, "🎰 Welcome to Bloxio Casino\nChoose an action:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🎮 Play", web_app: { url: process.env.APP_URL } }],
        [{ text: "💼 Wallet", callback_data: "wallet" }],
        [{ text: "🎁 Rewards", callback_data: "rewards" }],
      ],
    },
  });
});

bot.on("callback_query", async (q) => {
  const id = q.from.id;
  const data = q.data;
  const user = getUser(id);

  if (data === "wallet") {
    bot.sendMessage(id, `💼 BX Balance: ${user.bx}`);
  }

  if (data === "rewards") {
    bot.sendMessage(
      id,
      "🎁 Rewards:\nJoin Telegram: +5 BX\nPlay 3 games: +10 BX\nInvite friend: +20 BX"
    );
  }

  if (data.startsWith("approve_")) {
    if (!adminIds.includes(id)) return;

    const targetId = data.split("_")[1];
    users[targetId].bx += users[targetId].pendingBuy.bx;
    users[targetId].pendingBuy = null;

    bot.sendMessage(targetId, "✅ Payment approved. BX credited.");
  }

  if (data.startsWith("reject_")) {
    if (!adminIds.includes(id)) return;

    const targetId = data.split("_")[1];
    users[targetId].pendingBuy = null;

    bot.sendMessage(targetId, "❌ Payment rejected.");
  }
});

/* ======================
   Buy BX API (TON / USDT)
====================== */
app.post("/buy", (req, res) => {
  const { telegramId, amount, method } = req.body;
  const user = getUser(telegramId);

  const bxAmount = amount * 2; // مثال: 1 TON = 2 BX

  user.pendingBuy = { bx: bxAmount, method };

  // إشعار الأدمن
  adminIds.forEach((admin) => {
    bot.sendMessage(
      admin,
      `🧾 New Buy Request\nUser: ${telegramId}\nBX: ${bxAmount}\nMethod: ${method}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Approve", callback_data: `approve_${telegramId}` },
              { text: "❌ Reject", callback_data: `reject_${telegramId}` },
            ],
          ],
        },
      }
    );
  });

  res.json({ ok: true });
});
// داخل server.js
app.post("/buy-ton", async (req,res)=>{
  const {telegramId, ton, txHash}=req.body;
  // TODO: verify txHash (مرحلة لاحقة)
  pending[telegramId]={bx: ton*2, txHash};
  notifyAdmins(telegramId, ton, txHash);
  res.json({ok:true});
});
/* ======================
   Start Server
====================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Server running on", PORT);
});
