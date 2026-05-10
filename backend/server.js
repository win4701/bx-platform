"use strict";

/* =========================================================
   BXS SERVER CORE
========================================================= */

require("dotenv").config();

/* =========================================================
   MODULES
========================================================= */

const express =
  require("express");

const http =
  require("http");

const cors =
  require("cors");

const helmet =
  require("helmet");

const compression =
  require("compression");

/* =========================================================
   INTERNALS
========================================================= */

const routes =
  require("./routes");

const db =
  require("./database");

const wsHub =
  require("./ws/wsHub");

/* =========================================================
   OPTIONAL REDIS
========================================================= */

let redis = null;

try{

  redis =
    require("./core/redis");

}catch{

  console.log(
    "⚠️ Redis disabled"
  );

}

/* =========================================================
   ENV VALIDATION
========================================================= */

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

/* =========================================================
   CONFIG
========================================================= */

const PORT =
  process.env.PORT || 3000;

const NODE_ENV =
  process.env.NODE_ENV ||
  "development";

/* =========================================================
   APP
========================================================= */

const app =
  express();

const server =
  http.createServer(app);

/* =========================================================
   TRUST PROXY
========================================================= */

app.set(
  "trust proxy",
  1
);

/* =========================================================
   SECURITY
========================================================= */

app.use(

  helmet({

    contentSecurityPolicy:false

  })

);

app.use(

  cors({

    origin:true,

    credentials:true

  })

);

/* =========================================================
   PERFORMANCE
========================================================= */

app.use(
  compression()
);

/* =========================================================
   BODY
========================================================= */

app.use(

  express.json({

    limit:"1mb"

  })

);

app.use(

  express.urlencoded({

    extended:true,

    limit:"1mb"

  })

);

/* =========================================================
   ROOT
========================================================= */

app.get("/",(req,res)=>{

  res.json({

    success:true,

    name:"BXS Backend",

    env:NODE_ENV,

    status:"online",

    uptime:process.uptime(),

    timestamp:Date.now()

  });

});

/* =========================================================
   HEALTH
========================================================= */

app.get(

  "/health",

  async(req,res)=>{

    try{

      const dbHealth =
        await db.health();

      let redisHealth =
        false;

      if(redis){

        try{

          redisHealth =
            await redis.ping();

        }catch{}

      }

      res.json({

        success:true,

        status:"ok",

        database:dbHealth,

        redis:
          redis
            ? "online"
            : "disabled",

        uptime:
          process.uptime(),

        memory:
          process.memoryUsage(),

        timestamp:
          Date.now()

      });

    }catch(err){

      res.status(500).json({

        success:false,

        status:"error",

        error:err.message

      });

    }

  }

);

/* =========================================================
   API
========================================================= */

app.use(
  "/api",
  routes
);

/* =========================================================
   404
========================================================= */

app.use((req,res)=>{

  res.status(404).json({

    success:false,

    error:"route_not_found"

  });

});

/* =========================================================
   ERROR HANDLER
========================================================= */

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
      NODE_ENV === "production"

        ? "internal_server_error"

        : err.message

  });

});

/* =========================================================
   WEBSOCKET
========================================================= */

try{

  wsHub.startWS(server);

  console.log(
    "📡 WebSocket ready"
  );

}catch(err){

  console.error(

    "❌ WS:",

    err.message

  );

}

/* =========================================================
   START
========================================================= */

async function start(){

  try{

    console.log(
      "🔌 Connecting DB..."
    );

    await db.query(
      "SELECT 1"
    );

    console.log(
      "✅ PostgreSQL connected"
    );

    server.listen(

      PORT,

      ()=>{

        console.log(

          `🚀 Server running on ${PORT}`

        );

      }

    );

  }catch(err){

    console.error(

      "❌ Startup:",

      err.message

    );

    console.log(
      "🔄 Retrying in 5s..."
    );

    setTimeout(
      start,
      5000
    );

  }

}

/* =========================================================
   CRASH SAFETY
========================================================= */

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

/* =========================================================
   SHUTDOWN
========================================================= */

async function shutdown(){

  console.log(
    "🔻 Shutdown..."
  );

  try{

    server.close();

    if(db.pool){

      await db.pool.end();

    }

    process.exit(0);

  }catch(err){

    console.error(

      "Shutdown:",

      err.message

    );

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

/* =========================================================
   BOOT
========================================================= */

start();
