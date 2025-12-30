// src/antifraud.js
import { getLastWithdraw, setLastWithdraw } from "./db.js";

const DAILY_LIMIT = 1000; // BX
const COOLDOWN = 24 * 60 * 60 * 1000; // 24h

export async function canWithdraw(userId, amount) {
  if (amount > DAILY_LIMIT) {
    return false;
  }

  const last = getLastWithdraw(userId);
  const now = Date.now();

  if (now - last < COOLDOWN) {
    return false;
  }

  setLastWithdraw(userId, now);
  return true;
}
