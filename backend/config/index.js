"use strict";

/* =========================================================
   BLOXIO GLOBAL CONFIG — ULTRA PRODUCTION
========================================================= */

require("dotenv").config();

const assert = require("assert");

/* =========================================================
   ENV HELPER
========================================================= */

function env(key, fallback = undefined) {
  const value = process.env[key];

  if (value === undefined || value === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`❌ Missing ENV: ${key}`);
  }

  return value;
}

function num(key, fallback) {
  const v = env(key, fallback);
  const n = Number(v);
  if (isNaN(n)) throw new Error(`❌ ENV ${key} must be number`);
  return n;
}

function bool(key, fallback = false) {
  const v = env(key, fallback);
  return v === "true" || v === true;
}

/* =========================================================
   CORE CONFIG
========================================================= */

const config = {

  /* ===== APP ===== */
  app: {
    name: "BLOXIO",
    env: env("NODE_ENV", "development"),
    port: num("PORT", 3000),
    url: env("APP_URL", "http://localhost:3000")
  },

  /* ===== SECURITY ===== */
  security: {
    jwtSecret: env("JWT_SECRET"),
    jwtExpire: env("JWT_EXPIRE", "7d"),

    bcryptRounds: num("BCRYPT_ROUNDS", 10),

    rateLimit: {
      windowMs: num("RATE_LIMIT_WINDOW", 60000),
      max: num("RATE_LIMIT_MAX", 100)
    }
  },

  /* ===== DATABASE ===== */
  db: {
    url: env("DB_URL"),
    ssl: bool("DB_SSL", false)
  },

  /* ===== REDIS ===== */
  redis: {
    url: env("REDIS_URL"),
    prefix: env("REDIS_PREFIX", "bx:")
  },

  /* ===== NOWPAYMENTS ===== */
  nowpayments: {
    apiKey: env("NOWPAY_KEY"),
    ipnSecret: env("NOWPAY_IPN_SECRET"),
    baseURL: "https://api.nowpayments.io/v1"
  },

  /* ===== TRADING ===== */
  trading: {
    fee: {
      maker: Number(env("MAKER_FEE", 0.001)),
      taker: Number(env("TAKER_FEE", 0.002))
    },
    minOrder: Number(env("MIN_ORDER", 1)),
    maxOrder: Number(env("MAX_ORDER", 100000))
  },

  /* ===== WITHDRAW ===== */
  withdraw: {
    min: Number(env("WITHDRAW_MIN", 10)),
    max: Number(env("WITHDRAW_MAX", 50000)),
    dailyLimit: Number(env("WITHDRAW_DAILY_LIMIT", 100000))
  },

  /* ===== FRAUD ===== */
  fraud: {
    maxWithdrawPerHour: num("FRAUD_WITHDRAW_HOUR", 5),
    maxIPsPerUser: num("FRAUD_MAX_IP", 5),
    blockScore: num("FRAUD_BLOCK_SCORE", 100)
  },

  /* ===== WS ===== */
  ws: {
    heartbeat: num("WS_HEARTBEAT", 30000)
  },

  /* ===== FEATURES ===== */
  features: {
    trading: bool("FEATURE_TRADING", true),
    casino: bool("FEATURE_CASINO", true),
    mining: bool("FEATURE_MINING", true),
    airdrop: bool("FEATURE_AIRDROP", true)
  }

};

/* =========================================================
   VALIDATION
========================================================= */

(function validate() {

  assert(config.security.jwtSecret.length >= 10, "JWT too short");

  if (config.app.env === "production") {
    if (!config.db.ssl) {
      console.warn("⚠️ DB SSL is disabled in production");
    }
  }

})();

/* =========================================================
   EXPORT
========================================================= */

module.exports = config;
