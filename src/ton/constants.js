import { Address } from "@ton/core";

/* =========================
   NETWORK
========================= */
export const TON_NETWORK = process.env.TON_NETWORK || "mainnet";
export const TON_RPC =
  process.env.TON_RPC ||
  (TON_NETWORK === "mainnet"
    ? "https://toncenter.com/api/v2/jsonRPC"
    : "https://testnet.toncenter.com/api/v2/jsonRPC");

export const TON_API_KEY = process.env.TON_API_KEY || "";

/* =========================
   ADMIN / TREASURY
========================= */
// محفظة جمع السيولة (TON + BX)
export const ADMIN_TON_WALLET = Address.parse(
  process.env.ADMIN_TON_WALLET ||
    "UQARo43EOAPcJs_839ntozSAv_Nktb-bvWJADqM0z9Gg8xad"
);

// مفتاح خاص admin (Base64)
export const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || "";

/* =========================
   BX JETTON
========================= */
// Jetton Master Address (BX)
export const BX_JETTON_MASTER = Address.parse(
  process.env.BX_JETTON_MASTER || ""
);

// Decimals (BX = 9)
export const BX_DECIMALS = 9;

/* =========================
   FEES & LIMITS
========================= */
export const MIN_WITHDRAW_BX = BigInt(10) * 10n ** 9n;     // 10 BX
export const MAX_WITHDRAW_BX = BigInt(1_000_000) * 10n ** 9n;

export const WITHDRAW_FEE_TON = 0.05; // رسوم تشغيلية
export const SWAP_FEE_PERCENT = 1.5;  // %

/* =========================
   SECURITY
========================= */
export const TX_CONFIRMATIONS_REQUIRED = 1;
export const MAX_TX_PER_HOUR = 5;

/* =========================
   PAYMENT IDS (OFF-CHAIN)
========================= */
// Binance / RedotPay (للعرض + التحقق اليدوي/شبه الآلي)
export const BINANCE_PAY_ID = process.env.BINANCE_PAY_ID || "35885398";
export const REDOTPAY_ID = process.env.REDOTPAY_ID || "1962397417";

/* =========================
   UI / META
========================= */
export const PROJECT_NAME = "Bloxio";
export const TOKEN_SYMBOL = "BX";
