process.env.PORT  const chatId = msg.chat.id;
  const wallet = await getWallet(msg.from.id);

  if (!wallet) {
    return bot.sendMessage(chatId, "❗ No wallet connected. Use /wallet first.");
  }

  const balance = await getBalance(wallet);
  bot.sendMessage(chatId, `💰 Your BX balance: *${balance} BX*`, {
    parse_mode: "Markdown"
  });
});

/* =========================
   /claim (Airdrop)
========================= */
bot.onText(/\/claim/, async (msg) => {
  const chatId = msg.chat.id;
  const wallet = await getWallet(msg.from.id);

  if (!wallet) {
    return bot.sendMessage(chatId, "❗ Connect your wallet first.");
  }

  if (await hasClaimed(msg.from.id)) {
    return bot.sendMessage(chatId, "⚠️ You have already claimed.");
  }

  try {
    await claimBX(msg.from.id, wallet);
    await markClaimed(msg.from.id);
    bot.sendMessage(chatId, "✅ Claim successful!");
  } catch (e) {
    bot.sendMessage(chatId, `❌ Claim failed: ${e.message}`);
  }
});

/* =========================
   /withdraw <amount>
========================= */
bot.onText(/\/withdraw\s+(\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const amount = Number(match[1]);
  const wallet = await getWallet(msg.from.id);

  if (!wallet) {
    return bot.sendMessage(chatId, "❗ Connect your wallet first.");
  }

  if (!amount || amount <= 0) {
    return bot.sendMessage(chatId, "❗ Invalid amount.");
  }

  const allowed = await canWithdraw(msg.from.id, amount);
  if (!allowed) {
    return bot.sendMessage(chatId, "⚠️ Daily withdrawal limit reached.");
  }

  try {
    await withdrawBX(msg.from.id, wallet, amount);
    bot.sendMessage(chatId, "✅ Withdrawal sent successfully.");
  } catch (e) {
    bot.sendMessage(chatId, `❌ Withdrawal failed: ${e.message}`);
  }
});

/* =========================
   /swap (STON.fi)
========================= */
bot.onText(/\/swap/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "Swap BX via STON.fi:", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔁 TON → BX", url: tonToBX() }],
        [{ text: "🔁 BX → TON", url: bxToTON() }]
      ]
    }
  });
});

/* =========================
   /pool (Liquidity)
========================= */
bot.onText(/\/pool/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    "💧 BX Liquidity Pool on STON.fi:\n" +
      "https://ston.fi/pools/EQCRYlkaR6GlssLRrQlBH3HOPJSMk_vzfAAyyuhnriX-7a_a"
  );
});

/* =========================
   /app (Mini App)
========================= */
bot.onText(/\/app/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "Open Bloxio Mini App:", {
    reply_markup: {
      inline_keyboard: [[
        {
          text: "🚀 Open Mini App",
          web_app: { url: "https://bx-ton-bot.onrender.com" }
        }
      ]]
    }
  });
});

/* =========================
   Fallback
========================= */
bot.on("message", (msg) => {
  if (!msg.text?.startsWith("/")) return;
});
