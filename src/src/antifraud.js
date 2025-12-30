import { todayWithdrawn } from "./db.js";

export async function canWithdraw(tid, amount) {
  if (amount <= 0) return false;
  const used = await todayWithdrawn(tid);
  return used + amount <= Number(process.env.DAILY_WITHDRAW_LIMIT);
}
