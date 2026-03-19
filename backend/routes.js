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
RATE LIMIT (GLOBAL)
====================================== */

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300
});

router.use(limiter);

/* ======================================
LOGGER
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
    version: "LIVE",
    time: Date.now()
  });
});

/* ======================================
HEALTH
====================================== */

router.get("/health", async (req, res) => {

  try {

    const dbHealth = await db.health();

    res.json({
      status: "ok",
      uptime: process.uptime(),
      db: dbHealth
    });

  } catch (e) {

    res.status(500).json({
      status: "error"
    });

  }

});

/* ======================================
🔥 DIRECT ROUTES (CRITICAL FIX)
====================================== */

/* ⚠️ نفس المسارات اللي frontend يستخدمها */

router.use("/auth", auth);

/* 🔥 FIX مهم */
router.use("/finance", wallet);   // بدل /wallet

router.use("/casino", casino);
router.use("/market", market);
router.use("/mining", mining);
router.use("/airdrop", airdrop);
router.use("/payments", payments);

/* ======================================
OPTIONAL VERSION (لا يكسر شيء)
====================================== */

const api = express.Router();

api.use("/auth", auth);
api.use("/finance", wallet);
api.use("/casino", casino);
api.use("/market", market);
api.use("/mining", mining);
api.use("/airdrop", airdrop);
api.use("/payments", payments);

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
ERROR HANDLER
====================================== */

router.use((err, req, res, next) => {

  console.error(" API ERROR:", err.message);

  res.status(err.status || 500).json({
    error: err.message || "internal_error"
  });

});

module.exports = router;
