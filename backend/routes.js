
"use strict";

/* =========================================================
   BLOXIO API GATEWAY V7
   CENTRAL ROUTER
   SECURITY
   RATE LIMITING
   REQUEST TRACKING
   VERSIONED ROUTES
========================================================= */

const express = require("express");
const crypto = require("crypto");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const db = require("./database");

/* =========================================================
   ROUTER
========================================================= */

const router = express.Router();

/* =========================================================
   LOAD MODULES
   Each module must export an Express Router or middleware.
========================================================= */

const auth = require("./modules/auth");
const wallet = require("./modules/wallet");
const casino = require("./modules/casino");
const market = require("./modules/market");
const mining = require("./modules/mining");
const airdrop = require("./modules/airdrop");
const payments = require("./modules/payments");

/* =========================================================
   VALIDATE MODULES
========================================================= */

const modules = {
  auth,
  wallet,
  casino,
  market,
  mining,
  airdrop,
  payments
};

for (const [name, moduleRouter] of Object.entries(modules)) {

  if (typeof moduleRouter !== "function") {

    throw new TypeError(
      `BLOXIO ROUTER ERROR: modules/${name} must export Express middleware`
    );

  }

}

/* =========================================================
   REQUEST ID
========================================================= */

router.use((req, res, next) => {

  const incomingId = req.get("x-request-id");

  const validIncomingId =
    typeof incomingId === "string" &&
    /^[a-zA-Z0-9_-]{8,100}$/.test(incomingId);

  req.requestId = validIncomingId
    ? incomingId
    : crypto.randomUUID();

  res.setHeader(
    "x-request-id",
    req.requestId
  );

  next();

});

/* =========================================================
   LOGGER
========================================================= */

morgan.token(
  "request-id",
  req => req.requestId || "-"
);

router.use(
  morgan(
    ':request-id :method :url :status :response-time ms'
  )
);

/* =========================================================
   GLOBAL RATE LIMIT
========================================================= */

const globalLimiter = rateLimit({

  windowMs: 60 * 1000,

  max: 500,

  standardHeaders: true,

  legacyHeaders: false,

  message: {
    success: false,
    error: "too_many_requests"
  },

  handler(req, res) {

    res.status(429).json({

      success: false,

      error: "too_many_requests",

      requestId: req.requestId

    });

  }

});

/* =========================================================
   AUTH RATE LIMIT
========================================================= */

const authLimiter = rateLimit({

  windowMs: 15 * 60 * 1000,

  max: 30,

  standardHeaders: true,

  legacyHeaders: false,

  skipSuccessfulRequests: true,

  message: {
    success: false,
    error: "auth_rate_limit"
  },

  handler(req, res) {

    res.status(429).json({

      success: false,

      error: "auth_rate_limit",

      message: "Too many authentication attempts",

      requestId: req.requestId

    });

  }

});

/* =========================================================
   APPLY GLOBAL LIMIT
========================================================= */

router.use(globalLimiter);

/* =========================================================
   ROOT
   GET /api
========================================================= */

router.get("/", (req, res) => {

  res.json({

    success: true,

    name: "BLOXIO API",

    status: "online",

    version: "7.0.0",

    requestId: req.requestId,

    timestamp: Date.now()

  });

});

/* =========================================================
   HEALTH
   GET /api/health
========================================================= */

router.get("/health", async (req, res) => {

  try {

    const databaseOnline = await db.health();

    const healthy = databaseOnline === true;

    return res.status(
      healthy ? 200 : 503
    ).json({

      success: healthy,

      status: healthy
        ? "ok"
        : "degraded",

      services: {

        database: healthy
          ? "online"
          : "offline"

      },

      uptime: process.uptime(),

      timestamp: Date.now(),

      requestId: req.requestId

    });

  } catch (error) {

    console.error(
      "BLOXIO HEALTH ERROR:",
      error.message,
      req.requestId
    );

    return res.status(503).json({

      success: false,

      status: "unavailable",

      error: "health_check_failed",

      requestId: req.requestId

    });

  }

});

/* =========================================================
   AUTH ROUTES
   POST /api/auth/login
   POST /api/auth/register
========================================================= */

router.use(
  "/auth",
  authLimiter,
  auth
);

/* =========================================================
   WALLET / FINANCE ROUTES
   /api/finance/*
========================================================= */

router.use(
  "/finance",
  wallet
);

/* =========================================================
   CASINO ROUTES
   /api/casino/*
========================================================= */

router.use(
  "/casino",
  casino
);

/* =========================================================
   MARKET ROUTES
   /api/market/*
========================================================= */

router.use(
  "/market",
  market
);

/* =========================================================
   MINING ROUTES
   /api/mining/*
========================================================= */

router.use(
  "/mining",
  mining
);

/* =========================================================
   AIRDROP ROUTES
   /api/airdrop/*
========================================================= */

router.use(
  "/airdrop",
  airdrop
);

/* =========================================================
   PAYMENT ROUTES
   /api/payments/*
========================================================= */

router.use(
  "/payments",
  payments
);

/* =========================================================
   VERSIONED API
   /api/v1/*
========================================================= */

const v1 = express.Router();

v1.use("/auth", authLimiter, auth);
v1.use("/finance", wallet);
v1.use("/casino", casino);
v1.use("/market", market);
v1.use("/mining", mining);
v1.use("/airdrop", airdrop);
v1.use("/payments", payments);

router.use(
  "/v1",
  v1
);

/* =========================================================
   NOT FOUND
========================================================= */

router.use((req, res) => {

  return res.status(404).json({

    success: false,

    error: "endpoint_not_found",

    path: req.originalUrl,

    requestId: req.requestId

  });

});

/* =========================================================
   ERROR HANDLER
========================================================= */

router.use((err, req, res, next) => {

  if (res.headersSent) {

    return next(err);

  }

  const status =
    Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status <= 599
      ? err.status
      : 500;

  console.error(

    "BLOXIO API ERROR:",

    {
      message: err.message,
      status,
      requestId: req.requestId
    }

  );

  const production =
    process.env.NODE_ENV === "production";

  return res.status(status).json({

    success: false,

    error: status === 500 && production
      ? "internal_server_error"
      : (err.code || err.message || "request_failed"),

    ...(production
      ? {}
      : { details: err.message }
    ),

    requestId: req.requestId

  });

});

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;
