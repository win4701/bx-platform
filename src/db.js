// src/db.js

// تخزين مؤقت (في الذاكرة)
// ⚠️ عند إعادة تشغيل Render يتم المسح
const users = new Map();

/*
  user = {
    wallet: string,
    claimed: boolean,
    lastWithdrawAt: number
  }
*/

export function getWallet(userId) {
  const user = users.get(userId);
  return user?.wallet || null;
}

export function saveWallet(userId, wallet) {
  const user = users.get(userId) || {};
  user.wallet = wallet;
  users.set(userId, user);
}

export function hasClaimed(userId) {
  const user = users.get(userId);
  return user?.claimed === true;
}

export function markClaimed(userId) {
  const user = users.get(userId) || {};
  user.claimed = true;
  users.set(userId, user);
}

export function getLastWithdraw(userId) {
  const user = users.get(userId);
  return user?.lastWithdrawAt || 0;
}

export function setLastWithdraw(userId, timestamp) {
  const user = users.get(userId) || {};
  user.lastWithdrawAt = timestamp;
  users.set(userId, user);
}
