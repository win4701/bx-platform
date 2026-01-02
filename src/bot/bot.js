import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import { handleMessage } from "./messages.js";
import { handleCallback } from "./callbacks.js";

dotenv.config();

export const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true,
});

bot.on("message", handleMessage);
bot.on("callback_query", handleCallback);

console.log("✅ BX Bot Started");
