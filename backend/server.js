"use strict";

require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");

const routes = require("./routes");
const db = require("./database");
const wsHub = require("./ws/wsHub");

/* ======================================================
ENV
====================================================== */

const REQUIRED = [

  "DATABASE_URL",
  "JWT_SECRET"

];

for(const key of REQUIRED){

  if(!process.env[key]){

    console.error(
      `❌ Missing ENV: ${key}`
    );

    process.exit(1);

  }

}

/* ======================================================
CONFIG
====================================================== */

const PORT =
  process.env.PORT || 3000;

const app =
  express();

const server =
  http.createServer(app);

/* ======================================================
TRUST PROXY
====================================================== */

app.set(
  "trust proxy",
  1
);

/* ======================================================
SECURITY
====================================================== */

app.use(

  helmet({

    contentSecurityPolicy:false

  })

);

app.use(cors({

  origin:true,

  credentials:true

}));

/* ======================================================
BODY
====================================================== */

app.use(express.json({

  limit:"1mb"

}));

/* ======================================================
ROOT
====================================================== */

app.get("/",(req,res)=>{

  res.json({

    name:"BLOXIO Backend",

    status:"online",

    uptime:process.uptime(),

    time:Date.now()

  });

});

/* ======================================================
HEALTH
====================================================== */

app.get("/health", async(req,res)=>{

  try{

    const health =
      await db.health();

    res.json({

      status:"ok",

      db:health,

      uptime:process.uptime()

    });

  }catch(e){

    res.status(500).json({

      status:"error"

    });

  }

});

/* ======================================================
ROUTES
====================================================== */

app.use("/", routes);

/* ======================================================
WEBSOCKET
====================================================== */

wsHub.startWS(server);

/* ======================================================
ERROR HANDLER
====================================================== */

app.use((

  err,
  req,
  res,
  next

)=>{

  console.error(

    "❌ API:",

    err.message

  );

  res.status(

    err.status || 500

  ).json({

    success:false,

    error:
      err.message ||
      "internal_error"

  });

});

/* ======================================================
START
====================================================== */

async function start(){

  try{

    console.log(
      "🔌 Connecting DB..."
    );

    await db.query(
      "SELECT 1"
    );

    console.log(
      "✅ DB Connected"
    );

    server.listen(

      PORT,

      ()=>{

        console.log(
          `🚀 Server running ${PORT}`
        );

      }

    );

  }catch(e){

    console.error(

      "❌ Startup:",

      e.message

    );

    process.exit(1);

  }

}

/* ======================================================
CRASH SAFETY
====================================================== */

process.on(

  "unhandledRejection",

  err=>{

    console.error(
      "💥 Rejection:",
      err
    );

  }

);

process.on(

  "uncaughtException",

  err=>{

    console.error(
      "💥 Uncaught:",
      err
    );

  }

);

/* ======================================================
SHUTDOWN
====================================================== */

async function shutdown(){

  console.log(
    "🔻 Shutdown..."
  );

  try{

    server.close();

    await db.pool.end();

    process.exit(0);

  }catch(e){

    process.exit(1);

  }

}

process.on(
  "SIGINT",
  shutdown
);

process.on(
  "SIGTERM",
  shutdown
);

/* ======================================================
BOOT
====================================================== */

start();
