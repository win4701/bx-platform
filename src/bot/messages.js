import { bot } from "./bot.js";

export async function handleMessage(msg) {
  if (!msg.web_app_data) return;

  const data = JSON.parse(msg.web_app_data.data);
  const chatId = msg.chat.id;

  switch (data.action) {
    case "BUY_BX":
      return bot.sendMessage(chatId,
        "🟢 Buy BX\nSend payment proof (TON / USDT / Binance / RedotPay)");

    case "SELL_BX":
      return bot.sendMessage(chatId,
        "🔴 Sell BX\nSend amount + wallet. Admin approval.");

    case "PLAY_CHICKEN":
      return bot.sendMessage(chatId, "🐔 Chicken game started!");

    case "PLAY_CRASH":
      return bot.sendMessage(chatId, "📈 Crash game started!");

    case "OPEN_AIRDROP":
      return bot.sendMessage(chatId,
        "🎁 Tasks:\n• Join Telegram +5 BX\n• Play 3 games +10 BX\n• Invite friend +20 BX");

    case "OPEN_MARKET":
      return bot.sendMessage(chatId, "📊 BX price from STON.fi");

    case "OPEN_PROOF":
      return bot.sendMessage(chatId, "🔒 Proof-of-Reserve active");
  }
}
