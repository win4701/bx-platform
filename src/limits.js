const hits = new Map();

export function rateLimit(key, max = 10, windowMs = 60000) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length <= max;
}

export function canWithdraw(amount, dailyLimit = 1000) {
  return amount > 0 && amount <= dailyLimit;
}
