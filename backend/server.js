"use strict"

require("dotenv").config()

const express = require("express")
const cors = require("cors")
const http = require("http")

const routes = require("./routes")
const db = require("./database")

const startWS = require("./ws/wsHub")
const { startSystemBots } = require("./systemBots")

/* =========================================
ENV
========================================= */

const PORT = process.env.PORT || 3000
const RUN_BOTS = process.env.BOTS === "true"
const IS_PROD = process.env.NODE_ENV === "production"

/* =========================================
APP
========================================= */

const app = express()

app.use(cors())
app.use(express.json({ limit: "2mb" }))

/* =========================================
ROOT
========================================= */

app.get("/", (req, res) => {
  res.json({
    name: "Bloxio Backend",
    mode: RUN_BOTS ? "BOT" : "API",
    status: "running",
    time: Date.now()
  })
})

/* =========================================
HEALTH CHECK (CRITICAL FOR RENDER)
========================================= */

app.get("/health", async (req, res) => {
  try {
    const dbHealth = await db.health()

    res.json({
      status: "ok",
      db: dbHealth,
      uptime: process.uptime()
    })

  } catch (e) {
    res.status(500).json({
      status: "error",
      error: e.message
    })
  }
})

/* =========================================
API ROUTES (ONLY ON RENDER)
========================================= */

if (!RUN_BOTS) {
  app.use("/api", routes)
}

/* =========================================
ERROR HANDLER
========================================= */

app.use((err, req, res, next) => {
  console.error("❌ API ERROR:", err.message)

  res.status(500).json({
    error: "internal_server_error"
  })
})

/* =========================================
SERVER START
========================================= */

async function start() {
  try {
    console.log("🔌 Connecting to database...")

    await db.query("SELECT NOW()")

    console.log("✅ Database connected")

    const server = http.createServer(app)

    /* WebSocket (API only) */
    if (!RUN_BOTS) {
      startWS(server)
      console.log("📡 WebSocket started")
    }

    /* Start HTTP server */
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`Mode: ${RUN_BOTS ? "BOT" : "API"}`)
    })

    /* START BOTS (Fly only) */
    if (RUN_BOTS) {
      console.log("🤖 Starting system bots...")

      setTimeout(() => {
        try {
          startSystemBots()
          console.log("✅ Bots started")
        } catch (e) {
          console.error("❌ Bot startup failed:", e.message)
        }
      }, 3000)
    }

    /* =========================================
    KEEP ALIVE (VERY IMPORTANT FOR FLY)
    ========================================= */

    setInterval(() => {
      console.log("💓 Server alive:", new Date().toISOString())
    }, 30000)

    /* =========================================
    GRACEFUL SHUTDOWN
    ========================================= */

    const shutdown = () => {
      console.log("🔻 Shutting down...")

      server.close(() => {
        process.exit(0)
      })
    }

    process.on("SIGINT", shutdown)
    process.on("SIGTERM", shutdown)

  } catch (e) {
    console.error("❌ Startup error:", e.message)
    process.exit(1)
  }
}

start()
