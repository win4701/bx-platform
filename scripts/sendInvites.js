// scripts/sendInvites.js
import { generateCodes } from "../src/invite/generate.js";
import TelegramBot from "node-telegram-bot-api";

const bot = new TelegramBot(process.env.BOT_TOKEN);

const influencers = [
  { name:"Influencer A", tg:123456 },
  { name:"Influencer B", tg:789012 },
  // أضف الباقي
];

await generateCodes(influencers.map(i=>i.name));

for (const i of influencers) {
  const code = "INV-BX-XXXX"; // اجلبه من DB بعد التوليد
  await bot.sendMessage(i.tg,
`🎟️ You’re invited to Bloxio (BX)

Your private invite code:
${code}

• Limited access
• Early features
• Exclusive tournament

Use:
/start ${code}`);
}
