/* =========================
   Imports
========================= */
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

/* =========================
   Load Environment
========================= */
dotenv.config();

/* =========================
   Fix __dirname (ESM)
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* =========================
   Express Server
========================= */
const app = express();
app.use(express.json());

/* 👉 هذا السطر هو الأهم */
app.use(express.static(path.join(__dirname, "../app")));

/* 👉 Route صريح للـ Mini App */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../app/index.html"));
});

/* Health check */
app.get("/health", (req, res) => {
  res.send("OK");
});

/* =========================
   Start Server (Render)
========================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

/* =========================
   Telegram Bot Init
========================= */
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
console.log("BX TON Bot starting...");

/* =========================
   /start
========================= */
bot.onText(/\/start/, async (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Welcome to *Bloxio (BX)* on TON 🚀\n\n" +
      "Use the menu or commands below to manage your BX.",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[
          {
            text: "🚀 Open BX App",
            web_app: { url: "https://bx-ton-bot.onrender.com/app" }
          }
        ]]
      }
    }
  );
});

/* =========================
   /wallet
========================= */
bot.onText(/\/wallet/, async (msg) => {
  const projectWallet = "EQD_PROJECT_WALLET_ADDRESS";
  const link = `ton://transfer/${projectWallet}?amount=0&text=BX_CONNECT`;

  bot.sendMessage(msg.chat.id, "Connect your TON wallet:", {
    reply_markup: {
      inline_keyboard: [[
        { text: "🔗 Connect TON Wallet", url: link }
      ]]
    }
  });
});

/* =========================
   /balance
========================= */
bot.onText(/\/balance/, async (msg) => {
  const wallet = await getWallet(msg.from.id);
  if (!wallet) {
    return bot.sendMessage(msg.chat.id, "❗ No wallet connected. Use /wallet.");
  }

  const balance = await getBalance(wallet);
  bot.sendMessage(
    msg.chat.id,
    `💰 Your BX balance: *${balance} BX*`,
    { parse_mode: "Markdown" }
  );
});

/* =========================
   /claim
========================= */
bot.onText(/\/claim/, async (msg) => {
  const wallet = await getWallet(msg.from.id);
  if (!wallet) {
    return bot.sendMessage(msg.chat.id, "❗ Connect your wallet first.");
  }

  if (await hasClaimed(msg.from.id)) {
    return bot.sendMessage(msg.chat.id, "⚠️ You already claimed.");
  }

  try {
    await claimBX(msg.from.id, wallet);
    await markClaimed(msg.from.id);
    bot.sendMessage(msg.chat.id, "✅ Claim successful!");
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ Claim failed: ${e.message}`);
  }
});

/* =========================
   /withdraw <amount>
========================= */
bot.onText(/\/withdraw\s+(\d+)/, async (msg, match) => {
  const amount = Number(match[1]);
  const wallet = await getWallet(msg.from.id);

  if (!wallet) {
    return bot.sendMessage(msg.chat.id, "❗ Connect your wallet first.");
  }
  if (!amount || amount <= 0) {
    return bot.sendMessage(msg.chat.id, "❗ Invalid amount.");
  }

  const allowed = await canWithdraw(msg.from.id, amount);
  if (!allowed) {
    return bot.sendMessage(msg.chat.id, "⚠️ Daily withdrawal limit reached.");
  }

  try {
    await withdrawBX(msg.from.id, wallet, amount);
    bot.sendMessage(msg.chat.id, "✅ Withdrawal sent.");
  } catch (e) {
    bot.sendMessage(msg.chat.id, `❌ Withdrawal failed: ${e.message}`);
  }
});

/* =========================
   /swap (STON.fi)
========================= */
bot.onText(/\/swap/, async (msg) => {
  bot.sendMessage(msg.chat.id, "Swap BX on STON.fi:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔁 TON → BX", url: tonToBX() }],
        [{ text: "🔁 BX → TON", url: bxToTON() }]
      ]
    }
  });
});

/* =========================
   /pool
========================= */
bot.onText(/\/pool/, async (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "💧 BX Liquidity Pool on STON.fi:\nhttps://ston.fi/pools/YOUR_POOL_ADDRESS"
  );
});

/* =========================
   /app (Mini App shortcut)
========================= */
bot.onText(/\/app/, async (msg) => {
  bot.sendMessage(msg.chat.id, "Open Bloxio Mini App:", {
    reply_markup: {
      inline_keyboard: [[
        {
          text: "🚀 Open BX App",
          web_app: { url: "https://bx-ton-bot.onrender.com/app" }
        }
      ]]
    }
  });
});
