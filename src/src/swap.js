/**
 * STON.fi Swap helper
 * Non-custodial swap via deep links
 */

const STON_BASE = "https://app.ston.fi/swap";

/**
 * Build STON.fi swap URL
 * @param {string} from - token address (TON or Jetton)
 * @param {string} to - token address (Jetton or TON)
 */
export function buildSwapUrl(from, to) {
  const params = new URLSearchParams({
    ft: from,   // from token
    tt: to      // to token
  });
  return `${STON_BASE}?${params.toString()}`;
}

/**
 * Predefined swaps
 */
export function tonToBX() {
  return buildSwapUrl("TON", process.env.JETTON_MASTER);
}

export function bxToTON() {
  return buildSwapUrl(process.env.JETTON_MASTER, "TON");
}
