export function calculateSlippage({ liquidity, amount }) {
  let s = 0.3;
  if (liquidity < 100_000) s += 0.5;
  if (liquidity < 50_000) s += 1;
  if (amount > liquidity * 0.05) s += 0.5;
  if (amount > liquidity * 0.1) s += 1;
  return Math.min(s, 5);
}
