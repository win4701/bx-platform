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

const requiredEnv = ["DATABASE_URL", "JWT_SECRET"];

requiredEnv.forEach((key) => {
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

/* =========================================
APP
========================================= */

const app = express();

app.use(helmet());

app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

app.use(express.json({ limit: "1mb" }));

/* =========================================
RATE LIMIT
========================================= */

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
}));

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
HEALTH
========================================= */

app.get("/health", async (req, res) => {

  const dbHealth = await db.health();

  res.json({
    status: "ok",
    db: dbHealth,
    uptime: process.uptime()
  });

});

/* =========================================
ROUTES
========================================= */

if (!RUN_BOTS) {
  app.use("/api", routes);
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

      console.log(`🚀 Server running: ${PORT}`);
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
    CRASH HANDLING (CRITICAL)
    ========================================= */

    process.on("uncaughtException", (err)=>{
      console.error("💥 Uncaught:", err.message);
    });

    process.on("unhandledRejection", (err)=>{
      console.error("💥 Rejection:", err);
    });

    /* =========================================
    SHUTDOWN
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

    console.error("❌ Startup failed:", e.message);
    process.exit(1);

  }

}

start();
