import { MODE, STRESS_END_AT } from "../config.js";
import { runGoNoGo } from "./stressDecision.js";

export async function stressAutoExit(bot) {
  if (MODE !== "stress" || !STRESS_END_AT) return;

  if (Date.now() < STRESS_END_AT) return;

  const decision = await runGoNoGo();

  if (decision === "GO") {
    process.env.MODE = "production";
    process.env.STRESS_END_AT = "";
    await bot.sendMessage(
      process.env.ADMIN_ALERT_CHAT,
      "✅ Stress Mode ended automatically.\nDecision: GO → Production enabled."
    );
  } else {
    await bot.sendMessage(
      process.env.ADMIN_ALERT_CHAT,
      "⛔ Stress Mode extended.\nDecision: NO-GO → Issues detected."
    );
  }
}
