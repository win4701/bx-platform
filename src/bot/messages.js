export function registerMessages(bot) {
  bot.onText(/\/start\s*(.*)?/, async (msg) => {
    bot.sendMessage(msg.chat.id, "Welcome to Bloxio (BX)", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🎁 Airdrop", callback_data: "airdrop" }],
          [{ text: "💱 Buy / Sell BX", callback_data: "payments" }],
          [{ text: "📈 Price", callback_data: "price" }],
          [{ text: "🧭 Ecosystem", callback_data: "portfolio" }],
          [{ text: "🚀 Open App", web_app: { url: process.env.APP_URL } }]
        ]
      }
    });
  });
}
