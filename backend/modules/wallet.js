"use strict";

/* =========================================================
   BXS WALLET API — ENTERPRISE FINANCIAL GATEWAY
========================================================= */

const express =
  require("express");

const Joi =
  require("joi");

const crypto =
  require("crypto");

const router =
  express.Router();

const db =
  require("../database");

const redis =
  require("../core/redis");

const ledger =
  require("../core/ledger");

const auth =
  require("../middleware/auth");

const fraud =
  require("../security/fraudEngine");

const ws =
  require("../ws/wsHub");

/* =========================================================
   CONFIG
========================================================= */

const COINS = [

  "BX",
  "USDT",
  "TON",
  "BTC",
  "ETH",
  "BNB",
  "SOL",
  "ZEC",
  "TRX",
  "USDC",
  "LTC"

];

const MAX_TRANSFER =
  1_000_000;

const MAX_WITHDRAW =
  500_000;

/* =========================================================
   SCHEMAS
========================================================= */

const transferSchema =
  Joi.object({

    to_user:
      Joi.number()
      .required(),

    amount:
      Joi.number()
      .positive()
      .max(MAX_TRANSFER)
      .required(),

    asset:
      Joi.string()
      .valid(...COINS)
      .required()

  });

const withdrawSchema =
  Joi.object({

    asset:
      Joi.string()
      .valid(...COINS)
      .required(),

    amount:
      Joi.number()
      .positive()
      .max(MAX_WITHDRAW)
      .required(),

    address:
      Joi.string()
      .min(10)
      .required()

  });

/* =========================================================
   HELPERS
========================================================= */

function ok(res,data={}){

  return res.json({

    success:true,

    ...data

  });

}

function fail(

  res,
  error="error",
  code=400

){

  return res.status(code)
    .json({

      success:false,

      error

    });

}

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
      `wallet:idem:${key}`
    );

  if(exists){

    return fail(

      res,

      "duplicate_request",

      409

    );

  }

  await redis.setCache(

    `wallet:idem:${key}`,

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

  const key =
    `wallet:rl:${req.user.id}`;

  const count =
    await redis.incr(key);

  if(count === 1){

    await redis.expire(
      key,
      1
    );

  }

  if(count > 10){

    return fail(

      res,

      "rate_limited",

      429

    );

  }

  next();

}

/* =========================================================
   BALANCES
========================================================= */

router.get(

  "/balance",

  auth,

  async(req,res)=>{

    try{

      const r =
        await db.query(`
          SELECT
            asset,
            balance,
            locked
          FROM wallet_balances
          WHERE user_id=$1
      `,[

        req.user.id

      ]);

      const balances =
        {};

      for(const row of r.rows){

        balances[
          row.asset
        ] = {

          available:
            Number(
              row.balance
            ),

          locked:
            Number(
              row.locked || 0
            ),

          total:
            Number(
              row.balance
            ) +
            Number(
              row.locked || 0
            )

        };

      }

      return ok(res,{

        balances

      });

    }catch(e){

      return fail(

        res,

        "balance_failed",

        500

      );

    }

  }

);

/* =========================================================
   TRANSFER
========================================================= */

router.post(

  "/transfer",

  auth,

  idempotency,

  rateLimit,

  async(req,res)=>{

    try{

      const {

        error,

        value

      } =
        transferSchema
          .validate(
            req.body
          );

      if(error){

        return fail(

          res,

          error.details[0]
            .message

        );

      }

      /* ===================================
         FRAUD
      =================================== */

      const risk =
        await fraud.check({

          userId:
            req.user.id,

          amount:
            value.amount,

          ip:req.ip,

          deviceId:
            req.headers[
              "x-device-id"
            ]

        });

      if(risk.blocked){

        return fail(

          res,

          "risk_blocked",

          403

        );

      }

      /* ===================================
         TX
      =================================== */

      await db.transaction(

        async(tx)=>{

          await ledger.transfer({

            fromUser:
              req.user.id,

            toUser:
              value.to_user,

            asset:
              value.asset,

            amount:
              value.amount,

            tx

          });

        }

      );

      /* ===================================
         WS
      =================================== */

      await ws.sendToUser(

        req.user.id,

        {

          type:
            "wallet_transfer",

          asset:
            value.asset,

          amount:
            value.amount

        }

      );

      return ok(res,{

        transferred:true

      });

    }catch(e){

      return fail(
        res,
        e.message
      );

    }

  }

);

/* =========================================================
   DEPOSIT ADDRESS
========================================================= */

router.get(

  "/deposit/:asset",

  auth,

  async(req,res)=>{

    try{

      const asset =
        String(
          req.params.asset
        ).toUpperCase();

      if(
        !COINS.includes(asset)
      ){

        return fail(

          res,

          "unsupported_asset"

        );

      }

      let r =
        await db.query(`
          SELECT
            deposit_address
          FROM wallets
          WHERE user_id=$1
          AND asset=$2
      `,[

        req.user.id,

        asset

      ]);

      /* ===================================
         CREATE ADDRESS
      =================================== */

      if(!r.rows.length){

        const address =
          crypto
            .randomBytes(24)
            .toString("hex");

        await db.query(`
          INSERT INTO wallets
          (
            user_id,
            asset,
            deposit_address
          )
          VALUES($1,$2,$3)
        `,[

          req.user.id,

          asset,

          address

        ]);

        return ok(res,{

          asset,

          address

        });

      }

      return ok(res,{

        asset,

        address:
          r.rows[0]
            .deposit_address

      });

    }catch(e){

      return fail(

        res,

        "deposit_failed",

        500

      );

    }

  }

);

/* =========================================================
   WITHDRAW
========================================================= */

router.post(

  "/withdraw",

  auth,

  idempotency,

  rateLimit,

  async(req,res)=>{

    try{

      const {

        error,

        value

      } =
        withdrawSchema
          .validate(
            req.body
          );

      if(error){

        return fail(

          res,

          error.details[0]
            .message

        );

      }

      /* ===================================
         FRAUD
      =================================== */

      const risk =
        await fraud.check({

          userId:
            req.user.id,

          amount:
            value.amount,

          ip:req.ip,

          wallet:
            value.address,

          deviceId:
            req.headers[
              "x-device-id"
            ]

        });

      if(risk.blocked){

        return fail(

          res,

          "withdraw_blocked",

          403

        );

      }

      /* ===================================
         TX
      =================================== */

      await db.transaction(

        async(tx)=>{

          const w =
            await tx.query(`
              SELECT
                balance
              FROM wallet_balances
              WHERE user_id=$1
              AND asset=$2
              FOR UPDATE
          `,[

            req.user.id,

            value.asset

          ]);

          if(
            !w.rows.length ||
            Number(
              w.rows[0]
                .balance
            ) <
            value.amount
          ){

            throw new Error(
              "insufficient_balance"
            );

          }

          /* ===============================
             DEBIT
          =============================== */

          await ledger.debit({

            userId:
              req.user.id,

            asset:
              value.asset,

            amount:
              value.amount,

            reason:
              "withdraw_request",

            tx

          });

          /* ===============================
             SAVE REQUEST
          =============================== */

          await tx.query(`
            INSERT INTO withdraw_requests
            (
              user_id,
              asset,
              amount,
              address,
              status,
              created_at
            )
            VALUES(
              $1,$2,$3,$4,
              'pending',
              NOW()
            )
          `,[

            req.user.id,

            value.asset,

            value.amount,

            value.address

          ]);

        }

      );

      await ws.sendToUser(

        req.user.id,

        {

          type:
            "withdraw_submitted",

          asset:
            value.asset,

          amount:
            value.amount

        }

      );

      return ok(res,{

        submitted:true

      });

    }catch(e){

      return fail(
        res,
        e.message
      );

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
          ) || 100,

          500

        );

      const r =
        await db.query(`
          SELECT
            asset,
            amount,
            type,
            reason,
            created_at
          FROM wallet_transactions
          WHERE user_id=$1
          ORDER BY id DESC
          LIMIT $2
      `,[

        req.user.id,

        limit

      ]);

      return ok(res,{

        history:
          r.rows

      });

    }catch(e){

      return fail(

        res,

        "history_failed",

        500

      );

    }

  }

);

/* =========================================================
   HEALTH
========================================================= */

router.get(

  "/health",

  async(req,res)=>{

    return ok(res,{

      status:"ok",

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
