"use strict";

/* =========================================================
   BXS CASINO API — ENTERPRISE GATEWAY
========================================================= */

const express =
  require("express");

const router =
  express.Router();

const Joi =
  require("joi");

const crypto =
  require("crypto");

const redis =
  require("../core/redis");

const casino =
  require("../engines/casinoEngine");

const crash =
  require("../engines/crashEngine");

const fraud =
  require("../security/fraudEngine");

const auth =
  require("../middleware/auth");

const ws =
  require("../ws/wsHub");

const db =
  require("../database");

const {

  addJob

} = require(
  "../queues/systemQueue"
);

/* =========================================================
   CONFIG
========================================================= */

const BET_LIMIT = 100_000;

/* =========================================================
   SCHEMAS
========================================================= */

const playSchema =
  Joi.object({

    game:
      Joi.string()
      .required(),

    bet:
      Joi.number()
      .positive()
      .max(BET_LIMIT)
      .required(),

    data:
      Joi.object()
      .default({})

  });

/* =========================================================
   IDEMPOTENCY
========================================================= */

async function idempotency(

  req,
  res,
  next

){

  const key =
    req.headers[
      "x-idempotency-key"
    ];

  if(!key){

    return next();

  }

  const exists =
    await redis.getCache(
      `idem:${key}`
    );

  if(exists){

    return res.status(409)
      .json({

        error:
          "duplicate_request"

      });

  }

  await redis.setCache(

    `idem:${key}`,

    true,

    60

  );

  next();

}

/* =========================================================
   RATE LIMIT
========================================================= */

async function rateLimit(

  req,
  res,
  next

){

  const userId =
    req.user.id;

  const key =
    `casino:rl:${userId}`;

  const count =
    await redis.incr(key);

  if(count === 1){

    await redis.expire(
      key,
      1
    );

  }

  if(count > 5){

    return res.status(429)
      .json({

        error:
          "rate_limited"

      });

  }

  next();

}

/* =========================================================
   PLAY
========================================================= */

router.post(

  "/play",

  auth,

  idempotency,

  rateLimit,

  async(req,res)=>{

    try{

      /* ===================================
         VALIDATION
      =================================== */

      const {

        error,

        value

      } =
        playSchema.validate(
          req.body
        );

      if(error){

        return res
          .status(400)
          .json({

            error:
              error.details[0]
                .message

          });

      }

      const {

        game,
        bet,
        data

      } = value;

      /* ===================================
         FRAUD CHECK
      =================================== */

      const risk =
        await fraud.check({

          userId:
            req.user.id,

          amount:bet,

          ip:req.ip,

          deviceId:
            req.headers[
              "x-device-id"
            ]

        });

      if(risk.blocked){

        return res
          .status(403)
          .json({

            error:
              "risk_blocked"

          });

      }

      /* ===================================
         QUEUE
      =================================== */

      let mode =
        "queue";

      let result =
        null;

      try{

        await addJob(

          "casino_play",

          {

            requestId:
              crypto
                .randomUUID(),

            userId:
              req.user.id,

            game,
            bet,
            data

          }

        );

      }catch(e){

        mode =
          "direct";

        result =
          await casino
            .processGame({

              userId:
                req.user.id,

              game,
              bet,
              data

            });

      }

      /* ===================================
         WS USER EVENT
      =================================== */

      await ws.sendToUser(

        req.user.id,

        {

          type:
            "casino_request",

          game,

          mode

        }

      );

      return res.json({

        success:true,

        mode,

        result

      });

    }catch(e){

      console.error(

        "Casino API:",

        e.message

      );

      return res
        .status(400)
        .json({

          error:
            e.message

        });

    }

  }

);

/* =========================================================
   CRASH JOIN
========================================================= */

router.post(

  "/crash/join",

  auth,

  rateLimit,

  async(req,res)=>{

    try{

      const {

        bet,

        autoCashout

      } = req.body;

      if(
        !bet ||
        bet <= 0
      ){

        return res
          .status(400)
          .json({

            error:
              "invalid_bet"

          });

      }

      await crash.join({

        userId:
          req.user.id,

        bet,

        autoCashout

      });

      return res.json({

        success:true

      });

    }catch(e){

      return res
        .status(400)
        .json({

          error:
            e.message

        });

    }

  }

);

/* =========================================================
   CRASH CASHOUT
========================================================= */

router.post(

  "/crash/cashout",

  auth,

  async(req,res)=>{

    try{

      await crash.cashout(
        req.user.id
      );

      return res.json({

        success:true

      });

    }catch(e){

      return res
        .status(400)
        .json({

          error:
            e.message

        });

    }

  }

);

/* =========================================================
   HISTORY
========================================================= */

router.get(

  "/history",

  auth,

  async(req,res)=>{

    try{

      const limit =
        Math.min(

          Number(
            req.query.limit
          ) || 50,

          200

        );

      const r =
        await db.query(`
          SELECT
            game,
            bet,
            payout,
            multiplier,
            result,
            nonce,
            created_at
          FROM casino_sessions
          WHERE user_id=$1
          ORDER BY id DESC
          LIMIT $2
      `,[

        req.user.id,

        limit

      ]);

      return res.json({

        sessions:
          r.rows

      });

    }catch(e){

      return res
        .status(500)
        .json({

          error:
            "history_failed"

        });

    }

  }

);

/* =========================================================
   VERIFY
========================================================= */

router.post(

  "/verify",

  async(req,res)=>{

    try{

      const {

        serverSeed,
        clientSeed,
        nonce

      } = req.body;

      const result =
        casino.verify({

          serverSeed,
          clientSeed,
          nonce

        });

      return res.json({

        success:true,

        result

      });

    }catch(e){

      return res
        .status(400)
        .json({

          error:
            e.message

        });

    }

  }

);

/* =========================================================
   GAMES
========================================================= */

router.get(

  "/games",

  (req,res)=>{

    return res.json({

      games:[

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

  }

);

/* =========================================================
   HEALTH
========================================================= */

router.get(

  "/health",

  async(req,res)=>{

    return res.json({

      status:"ok",

      ws:
        ws.getStats(),

      time:
        Date.now()

    });

  }

);

/* =========================================================
   EXPORT
========================================================= */

module.exports =
  router;
