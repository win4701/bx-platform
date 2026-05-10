"use strict";

/* =========================================================
   BXS API GATEWAY — ENTERPRISE EDGE ROUTER
========================================================= */

const express =
  require("express");

const crypto =
  require("crypto");

const compression =
  require("compression");

const helmet =
  require("helmet");

const cors =
  require("cors");

const morgan =
  require("morgan");

const rateLimit =
  require("express-rate-limit");

const db =
  require("./database");

/* =========================================================
   ROUTER
========================================================= */

const router =
  express.Router();

/* =========================================================
   MODULES
========================================================= */

const auth =
  require("./modules/auth");

const wallet =
  require("./modules/wallet");

const casino =
  require("./modules/casino");

const market =
  require("./modules/market");

const mining =
  require("./modules/mining");

const airdrop =
  require("./modules/airdrop");

const payments =
  require("./modules/payments");

/* =========================================================
   TRUST PROXY (RENDER)
========================================================= */

router.set?.(
  "trust proxy",
  1
);

/* =========================================================
   SECURITY
========================================================= */

router.use(

  helmet({

    crossOriginEmbedderPolicy:false,

    contentSecurityPolicy:false

  })

);

router.use(cors({

  origin:true,

  credentials:true

}));

router.use(compression());

/* =========================================================
   REQUEST ID
========================================================= */

router.use((req,res,next)=>{

  req.requestId =
    crypto.randomUUID();

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

  "id",

  req=>req.requestId

);

router.use(

  morgan(

    ':id :method :url :status :response-time ms'

  )

);

/* =========================================================
   GLOBAL RATE LIMIT
========================================================= */

router.use(

  rateLimit({

    windowMs:
      60 * 1000,

    max:500,

    standardHeaders:true,

    legacyHeaders:false

  })

);

/* =========================================================
   ROOT
========================================================= */

router.get(

  "/",

  (req,res)=>{

    res.json({

      name:
        "BXS API",

      status:
        "online",

      version:
        "enterprise",

      requestId:
        req.requestId,

      time:
        Date.now()

    });

  }

);

/* =========================================================
   HEALTH
========================================================= */

router.get(

  "/health",

  async(req,res)=>{

    try{

      const dbHealth =
        await db.health();

      return res.json({

        status:"ok",

        uptime:
          process.uptime(),

        memory:
          process.memoryUsage(),

        db:
          dbHealth,

        requestId:
          req.requestId

      });

    }catch(e){

      return res.status(500)
        .json({

          status:"error",

          error:e.message

        });

    }

  }

);

/* =========================================================
   ROUTES
========================================================= */

router.use(
  "/auth",
  auth
);

router.use(
  "/finance",
  wallet
);

router.use(
  "/casino",
  casino
);

router.use(
  "/market",
  market
);

router.use(
  "/mining",
  mining
);

router.use(
  "/airdrop",
  airdrop
);

router.use(
  "/payments",
  payments
);

/* =========================================================
   VERSIONED API
========================================================= */

const api =
  express.Router();

api.use("/auth",auth);
api.use("/finance",wallet);
api.use("/casino",casino);
api.use("/market",market);
api.use("/mining",mining);
api.use("/airdrop",airdrop);
api.use("/payments",payments);

router.use(
  "/api/v1",
  api
);

/* =========================================================
   NOT FOUND
========================================================= */

router.use((req,res)=>{

  res.status(404)
    .json({

      success:false,

      error:
        "endpoint_not_found",

      path:
        req.originalUrl,

      requestId:
        req.requestId

    });

});

/* =========================================================
   ERROR HANDLER
========================================================= */

router.use((

  err,
  req,
  res,
  next

)=>{

  console.error(

    "❌ API:",

    err.message,

    req.requestId

  );

  res.status(

    err.status || 500

  ).json({

    success:false,

    error:
      err.message ||
      "internal_error",

    requestId:
      req.requestId

  });

});

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
