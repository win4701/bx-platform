"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const routes = require("./routes");
const db = require("./database");

const wsHub = require("./ws/wsHub");
const { startSystemBots } = require("./systemBots");

/* =========================================
ENV VALIDATION
========================================= */

const REQUIRED = ["DATABASE_URL", "JWT_SECRET"];

REQUIRED.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing ENV: ${key}`);
    process.exit(1);
  }
});

/* =========================================
CONFIG
========================================= */

const PORT = process.env.PORT || 3000;
const RUN_BOTS = process.env.BOTS === "true";

const ALLOWED_ORIGINS = [
  "https://www.bloxio.online",
  "https://bloxio.online",
  "http://localhost:3000"
];

/* =========================================
APP
========================================= */

const app = express();

/* ===== TRUST PROXY (Render / Fly) ===== */
app.set("trust proxy", 1);

/* ===== SECURITY ===== */

app.use(helmet());

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return cb(null, true);
    }
    return cb(null, false);
  },
  credentials: true
}));

app.use(express.json({ limit: "1mb" }));

/* =========================================
RATE LIMIT
========================================= */

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300
});

app.use(globalLimiter);

/* =========================================
ROOT
========================================= */

app.get("/", (req, res) => {
  res.json({
    name: "Bloxio Backend",
    mode: RUN_BOTS ? "BOT" : "API",
    status: "running",
    time: Date.now()
  });
});

/* =========================================
HEALTH (Render uses this)
========================================= */

app.get("/health", async (req, res) => {

  try{
    const dbHealth = await db.health();

    res.json({
      status: "ok",
      db: dbHealth,
      uptime: process.uptime()
    });

  }catch(e){
    res.status(500).json({ status:"error" });
  }

});

/* =========================================
ROUTES (🔥 FIXED)
========================================= */

if (!RUN_BOTS) {

  /* ⚠️ بدون /api */
  app.use("/", routes);

}

/* =========================================
ERROR HANDLER
========================================= */

app.use((err, req, res, next) => {

  console.error("🔥 API ERROR:", err.message);

  res.status(500).json({
    error: err.message || "internal_error"
  });

});

/* =========================================
START SERVER
========================================= */

async function start(){

  try{

    console.log("🔌 Connecting DB...");

    await db.query("SELECT 1");

    console.log("✅ DB Connected");

    const server = http.createServer(app);

    /* ================= WS ================= */

    if(!RUN_BOTS){
      wsHub.startWS(server);
      console.log("📡 WS Ready");
    }

    /* ================= HTTP ================= */

    server.listen(PORT, ()=>{

      console.log(`🚀 Server running on ${PORT}`);
      console.log(`Mode: ${RUN_BOTS ? "BOT" : "API"}`);

    });

    /* ================= BOTS ================= */

    if(RUN_BOTS){

      setTimeout(()=>{

        console.log("🤖 Starting bots...");
        startSystemBots();

      }, 2000);

    }

    /* =========================================
    HEARTBEAT
    ========================================= */

    setInterval(()=>{
      console.log("💓 Alive:", new Date().toISOString());
    }, 30000);

    /* =========================================
    CRASH SAFETY
    ========================================= */

    process.on("uncaughtException", (err)=>{
      console.error("💥 Uncaught:", err.message);
    });

    process.on("unhandledRejection", (err)=>{
      console.error("💥 Rejection:", err);
    });

    /* =========================================
    GRACEFUL SHUTDOWN
    ========================================= */

    const shutdown = ()=>{

      console.log("🔻 Shutting down...");

      server.close(()=>{
        process.exit(0);
      });

    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  }catch(e){

    console.error(" Startup failed:", e.message);
    process.exit(1);

  }

}

start();
