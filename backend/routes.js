"use strict";

const express = require("express");
const router = express.Router();

const rateLimit = require("express-rate-limit");
const db = require("./database");

/* ======================================
MODULES
====================================== */

const auth = require("./modules/auth");
const wallet = require("./modules/wallet");
const casino = require("./modules/casino");
const market = require("./modules/market");
const mining = require("./modules/mining");
const airdrop = require("./modules/airdrop");
const payments = require("./modules/payments");

/* ======================================
RATE LIMIT
====================================== */

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
});

router.use(limiter);

/* ======================================
LOGGER (ADVANCED)
====================================== */

router.use((req, res, next) => {

  const start = Date.now();

  res.on("finish", () => {

    const duration = Date.now() - start;

    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );

  });

  next();
});

/* ======================================
ROOT
====================================== */

router.get("/", (req, res) => {
  res.json({
    name: "Bloxio API",
    status: "online",
    version: "2.0",
    time: Date.now()
  });
});

/* ======================================
HEALTH (REAL)
====================================== */

router.get("/health", async (req, res) => {

  try {

    const dbHealth = await db.health();

    res.json({
      status: "ok",
      uptime: process.uptime(),
      memory: process.memoryUsage().rss,
      db: dbHealth
    });

  } catch (e) {

    res.status(500).json({
      status: "error",
      error: e.message
    });

  }

});

/* ======================================
API VERSION
====================================== */

const api = express.Router();

/* ======================================
MODULE ROUTES
====================================== */

api.use("/auth", auth);
api.use("/wallet", wallet);
api.use("/casino", casino);
api.use("/market", market);
api.use("/mining", mining);
api.use("/airdrop", airdrop);
api.use("/payments", payments);

/* ======================================
ATTACH VERSION
====================================== */

router.use("/api/v1", api);

/* ======================================
NOT FOUND
====================================== */

router.use((req, res) => {

  res.status(404).json({
    error: "endpoint_not_found",
    path: req.originalUrl
  });

});

/* ======================================
ERROR HANDLER (SMART)
====================================== */

router.use((err, req, res, next) => {

  console.error("🔥 API ERROR:", err.message);

  const status = err.status || 500;

  res.status(status).json({
    error: err.message || "internal_server_error"
  });

});

module.exports = router;
