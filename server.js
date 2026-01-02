import express from "express";
import TelegramBot from "node-telegram-bot-api";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

/* ================= DB ================= */
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ================= BOT ================= */
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

/* ================= APP ================= */
const app = express();
app.use(express.json());

/* ===== Serve Mini App ===== */
app.get("/", (req, res) => {
  res.sendFile(process.cwd() + "/index.html");
});

/* ================= BOT LOGIC ================= */
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  await db.query(`
    INSERT INTO users (telegram_id)
    VALUES ($1)
    ON CONFLICT DO NOTHING
  `, [chatId]);

  bot.sendMessage(chatId,
`🎰 Bloxio Casino

Wallet • Games • Rewards • Market

👇 Open Mini App`,
  {
    reply_markup: {
      inline_keyboard: [[
        { text: "🚀 Open App", web_app: { url: process.env.APP_URL } }
      ]]
    }
  });
});

/* ================= BUY BX ================= */
bot.on("callback_query", async (q) => {
  if (q.data === "buy_bx") {
    bot.sendMessage(q.message.chat.id,
`💳 Buy BX

Send payment to:
TON Wallet:
UQARo43EOAPcJs_839ntozSAv_Nktb-bvWJADqM0z9Gg8xad

Then send proof.`);
  }
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("✅ Server running on", PORT));
