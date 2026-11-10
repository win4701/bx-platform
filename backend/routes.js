
"use strict";

/* =========================================================
   BLOXIO API GATEWAY — ROUTES V8
   Main API Router
   Mounted by server.js at: /api
========================================================= */

const express = require("express");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const db = require("./database");

const router = express.Router();

/* =========================================================
   LOAD MODULE ROUTERS
========================================================= */

const authRoutes = require("./modules/auth");
const walletRoutes = require("./modules/wallet");
const casinoRoutes = require("./modules/casino");
const marketRoutes = require("./modules/market");
const miningRoutes = require("./modules/mining");
const airdropRoutes = require("./modules/airdrop");
const paymentsRoutes = require("./modules/payments");

/* =========================================================
   AUTHENTICATION
========================================================= */

const authMiddleware = authRoutes.authMiddleware;

if (typeof authMiddleware !== "function") {
  throw new Error(
    "BLOXIO ROUTES: authMiddleware is missing from modules/auth"
  );
}

/* =========================================================
   VALIDATE MODULE ROUTERS
========================================================= */

const modules = {
  auth: authRoutes,
  wallet: walletRoutes,
  casino: casinoRoutes,
  market: marketRoutes,
  mining: miningRoutes,
  airdrop: airdropRoutes,
  payments: paymentsRoutes
};

for (const [name, moduleRouter] of Object.entries(modules)) {
  if (
    typeof moduleRouter !== "function" ||
    typeof moduleRouter.use !== "function"
  ) {
    throw new Error(
      `BLOXIO ROUTES: Invalid Express router: ${name}`
    );
  }
}

/* =========================================================
   REQUEST ID
========================================================= */

router.use((req, res, next) => {
  req.requestId = crypto.randomUUID();

  res.setHeader("X-Request-ID", req.requestId);

  next();
});

/* =========================================================
   RATE LIMITERS
========================================================= */

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "too_many_requests"
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "auth_rate_limit"
  }
});

router.use(globalLimiter);

/* =========================================================
   ROOT
========================================================= */

router.get("/", (req, res) => {
  return res.json({
    success: true,
    name: "BLOXIO API",
    status: "online",
    version: "8.0.0",
    requestId: req.requestId,
    timestamp: Date.now()
  });
});

/* =========================================================
   HEALTH
========================================================= */

router.get("/health", async (req, res) => {
  try {
    const dbHealth = await db.health();

    const healthy =
      dbHealth === true ||
      dbHealth?.status === "ok" ||
      dbHealth?.healthy === true;

    return res.status(healthy ? 200 : 503).json({
      success: healthy,
      status: healthy ? "ok" : "degraded",
      services: {
        database: dbHealth
      },
      uptime: process.uptime(),
      requestId: req.requestId,
      timestamp: Date.now()
    });

  } catch (error) {
    return res.status(503).json({
      success: false,
      status: "unhealthy",
      error: "database_unavailable",
      requestId: req.requestId
    });
  }
});

/* =========================================================
   AUTH ROUTES
========================================================= */

router.use(
  "/auth",
  authLimiter,
  authRoutes
);

/* =========================================================
   WALLET COMPATIBILITY
   Existing frontend calls: GET /api/wallet
========================================================= */

router.get(
  "/wallet",
  authMiddleware,
  async (req, res) => {
    try {
      const result = await db.query(
        `
          SELECT asset, balance
          FROM wallet_balances
          WHERE user_id = $1
          ORDER BY asset ASC
        `,
        [req.user.id]
      );

      const balances = {};

      for (const row of result.rows) {
        balances[row.asset] = Number(row.balance || 0);
      }

      return res.json({
        success: true,
        balances,
        requestId: req.requestId
      });

    } catch (error) {
      console.error(
        "[BLOXIO WALLET]",
        req.requestId,
        error.message
      );

      return res.status(500).json({
        success: false,
        error: "wallet_load_failed",
        requestId: req.requestId
      });
    }
  }
);

/* =========================================================
   WALLET ROUTES
========================================================= */

// Main finance routes:
// /api/finance/balance
// /api/finance/transfer
// /api/finance/deposit/:asset
// /api/finance/withdraw
// /api/finance/history

router.use(
  "/finance",
  walletRoutes
);

// Wallet aliases:
// /api/wallet/balance
// /api/wallet/transfer
// /api/wallet/deposit/:asset
// /api/wallet/withdraw
// /api/wallet/history

router.use(
  "/wallet",
  walletRoutes
);

/* =========================================================
   CASINO COMPATIBILITY
   Existing frontend calls: GET /api/casino
========================================================= */

router.get("/casino", (req, res) => {
  return res.json({
    success: true,
    games: [
      "dice",
      "coinflip",
      "limbo",
      "crash",
      "roulette",
      "blackjack",
      "mines",
      "plinko",
      "slots",
      "hi-lo",
      "wheel",
      "keno"
    ],
    requestId: req.requestId
  });
});

/* =========================================================
   CASINO ROUTES
========================================================= */

router.use(
  "/casino",
  casinoRoutes
);

/* =========================================================
   MARKET COMPATIBILITY
   Existing frontend calls: GET /api/market
========================================================= */

router.get("/market", (req, res) => {
  const query = new URLSearchParams(req.query).toString();

  const target =
    `${req.baseUrl}/market/snapshot` +
    (query ? `?${query}` : "");

  return res.redirect(307, target);
});

/* =========================================================
   MARKET ROUTES
========================================================= */

router.use(
  "/market",
  marketRoutes
);

/* =========================================================
   MINING ROUTES
   Module relies on req.user
========================================================= */

router.use(
  "/mining",
  authMiddleware,
  miningRoutes
);

/* =========================================================
   AIRDROP ROUTES
   Module relies on req.user
========================================================= */

router.use(
  "/airdrop",
  authMiddleware,
  airdropRoutes
);

/* =========================================================
   PAYMENTS ROUTES
   Individual payment routes contain their own auth.
   Webhook remains public for provider callbacks.
========================================================= */

router.use(
  "/payments",
  paymentsRoutes
);

/* =========================================================
   VERSIONED API — /api/v1/...
   server.js already mounts this router at /api
========================================================= */

const v1 = express.Router();

/* AUTH */

v1.use(
  "/auth",
  authLimiter,
  authRoutes
);

/* WALLET */

v1.get(
  "/wallet",
  authMiddleware,
  async (req, res) => {
    try {
      const result = await db.query(
        `
          SELECT asset, balance
          FROM wallet_balances
          WHERE user_id = $1
          ORDER BY asset ASC
        `,
        [req.user.id]
      );

      const balances = {};

      for (const row of result.rows) {
        balances[row.asset] = Number(row.balance || 0);
      }

      return res.json({
        success: true,
        balances
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "wallet_load_failed"
      });
    }
  }
);

v1.use("/finance", walletRoutes);
v1.use("/wallet", walletRoutes);

/* CASINO */

v1.get("/casino", (req, res) => {
  return res.json({
    success: true,
    games: [
      "dice",
      "coinflip",
      "limbo",
      "crash",
      "roulette",
      "blackjack",
      "mines",
      "plinko",
      "slots",
      "hi-lo",
      "wheel",
      "keno"
    ]
  });
});

v1.use("/casino", casinoRoutes);

/* MARKET */

v1.get("/market", (req, res) => {
  const query = new URLSearchParams(req.query).toString();

  const target =
    `${req.baseUrl}/market/snapshot` +
    (query ? `?${query}` : "");

  return res.redirect(307, target);
});

v1.use("/market", marketRoutes);

/* MINING */

v1.use(
  "/mining",
  authMiddleware,
  miningRoutes
);

/* AIRDROP */

v1.use(
  "/airdrop",
  authMiddleware,
  airdropRoutes
);

/* PAYMENTS */

v1.use("/payments", paymentsRoutes);

/* MOUNT VERSIONED ROUTER */

router.use("/v1", v1);

/* =========================================================
   NOT FOUND
========================================================= */

router.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: "endpoint_not_found",
    path: req.originalUrl,
    method: req.method,
    requestId: req.requestId
  });
});

/* =========================================================
   GLOBAL ERROR HANDLER
========================================================= */

router.use((err, req, res, next) => {
  console.error("[BLOXIO API ERROR]", {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    message: err.message
  });

  if (res.headersSent) {
    return next(err);
  }

  const status =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status < 600
      ? err.status
      : 500;

  return res.status(status).json({
    success: false,
    error:
      status === 500
        ? "internal_server_error"
        : err.message || "request_failed",
    requestId: req.requestId
  });
});

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;
