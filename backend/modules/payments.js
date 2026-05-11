"use strict";

/* =========================================================
   BXS PAYMENTS API
========================================================= */

const express =
  require("express");

const Joi =
  require("joi");

const axios =
  require("axios");

const crypto =
  require("crypto");

const router =
  express.Router();

const db =
  require("../database");

const auth =
  require("../middleware/auth");

/* =========================================================
   OPTIONAL MODULES
========================================================= */

let redis = null;
let ledger = null;
let fraud = null;
let ws = null;

try{

  redis =
    require("../core/redis");

}catch{

  console.log(
    "⚠️ Redis disabled"
  );

}

try{

  ledger =
    require("../core/ledger");

}catch{

  console.log(
    "⚠️ Ledger disabled"
  );

}

try{

  fraud =
    require("../security/fraudEngine");

}catch{

  console.log(
    "⚠️ Fraud disabled"
  );

}

try{

  ws =
    require("../ws/wsHub");

}catch{

  console.log(
    "⚠️ WS disabled"
  );

}

/* =========================================================
   CONFIG
========================================================= */

const NOWPAY_API =
  "https://api.nowpayments.io/v1";

const NOWPAY_KEY =
  process.env.NOWPAY_API_KEY;

const NOWPAY_IPN =
  process.env.NOWPAY_IPN_SECRET;

const NOWPAY_ENABLED =

  !!NOWPAY_KEY &&
  !!NOWPAY_IPN;

const SUPPORTED = [

  "USDT",
  "USDC",
  "BTC",
  "ETH",
  "BNB",
  "LTC",
  "SOL",
  "ZEC",
  "AVAX",
  "TON"

];

const MAX_DEPOSIT =
  1000000;

const MAX_WITHDRAW =
  500000;

/* =========================================================
   SCHEMAS
========================================================= */

const createSchema =
  Joi.object({

    amount:
      Joi.number()
      .positive()
      .max(MAX_DEPOSIT)
      .required(),

    asset:
      Joi.string()
      .valid(...SUPPORTED)
      .default("USDT")

  });

const withdrawSchema =
  Joi.object({

    amount:
      Joi.number()
      .positive()
      .max(MAX_WITHDRAW)
      .required(),

    asset:
      Joi.string()
      .valid(...SUPPORTED)
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

  return res
    .status(code)
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

  if(!redis){

    return next();

  }

  try{

    const key =
      req.headers[
        "x-idempotency-key"
      ];

    if(!key){

      return next();

    }

    const exists =
      await redis.getCache(

        `payments:idem:${key}`

      );

    if(exists){

      return fail(

        res,

        "duplicate_request",

        409

      );

    }

    await redis.setCache(

      `payments:idem:${key}`,

      true,

      60

    );

    next();

  }catch{

    next();

  }

}

/* =========================================================
   RATE LIMIT
========================================================= */

async function rateLimit(
  req,
  res,
  next
){

  if(!redis){

    return next();

  }

  try{

    const key =
      `payments:rl:${req.user.id}`;

    const count =
      await redis.incr(key);

    if(count === 1){

      await redis.expire(
        key,
        1
      );

    }

    if(count > 5){

      return fail(

        res,

        "rate_limited",

        429

      );

    }

    next();

  }catch{

    next();

  }

}

/* =========================================================
   CREATE PAYMENT
========================================================= */

router.post(

  "/create",

  auth,

  idempotency,

  rateLimit,

  async(req,res)=>{

    try{

      if(!NOWPAY_ENABLED){

        return fail(

          res,

          "payments_disabled",

          503

        );

      }

      const {
        error,
        value
      } =
        createSchema.validate(
          req.body
        );

      if(error){

        return fail(

          res,

          error.details[0]
            .message

        );

      }

      const orderId =
        crypto.randomUUID();

      const r =
        await axios.post(

          `${NOWPAY_API}/payment`,

          {

            price_amount:
              value.amount,

            price_currency:
              "usd",

            pay_currency:
              value.asset,

            order_id:
              orderId

          },

          {

            headers:{

              "x-api-key":
                NOWPAY_KEY

            }

          }

        );

      const p =
        r.data;

      await db.query(`
        INSERT INTO payments
        (
          user_id,
          type,
          provider,
          amount,
          asset,
          status,
          external_id,
          meta,
          created_at
        )
        VALUES(
          $1,
          'deposit',
          'nowpayments',
          $2,
          $3,
          'pending',
          $4,
          $5,
          NOW()
        )
      `,[

        req.user.id,

        value.amount,

        value.asset,

        p.payment_id,

        JSON.stringify({
          orderId
        })

      ]);

      if(ws?.sendToUser){

        await ws.sendToUser(

          req.user.id,

          {

            type:
              "deposit_created",

            asset:
              value.asset,

            amount:
              value.amount

          }

        );

      }

      return ok(res,{

        payment_id:
          p.payment_id,

        address:
          p.pay_address,

        amount:
          p.pay_amount,

        currency:
          p.pay_currency

      });

    }catch(e){

      console.error(
        "Payment:",
        e.message
      );

      return fail(

        res,

        "payment_failed",

        500

      );

    }

  }

);

/* =========================================================
   WEBHOOK
========================================================= */

router.post(

  "/webhook",

  async(req,res)=>{

    try{

      if(!NOWPAY_ENABLED){

        return res
          .status(503)
          .send(
            "disabled"
          );

      }

      const sig =
        req.headers[
          "x-nowpayments-sig"
        ];

      const raw =
        JSON.stringify(
          req.body
        );

      const hmac =
        crypto
          .createHmac(
            "sha512",
            NOWPAY_IPN
          )
          .update(raw)
          .digest("hex");

      const valid =
        crypto.timingSafeEqual(

          Buffer.from(hmac),

          Buffer.from(sig)

        );

      if(!valid){

        return res
          .status(401)
          .send(
            "invalid_signature"
          );

      }

      const payment =
        req.body;

      let replay = null;

      if(redis){

        replay =
          await redis.getCache(

            `webhook:${payment.payment_id}`

          );

      }

      if(replay){

        return res.send(
          "duplicate"
        );

      }

      if(redis){

        await redis.setCache(

          `webhook:${payment.payment_id}`,

          true,

          3600

        );

      }

      if(
        payment.payment_status !==
        "finished"
      ){

        return res.send(
          "pending"
        );

      }

      const r =
        await db.query(`
          SELECT *
          FROM payments
          WHERE external_id=$1
      `,[

        payment.payment_id

      ]);

      if(!r.rows.length){

        return res.send(
          "not_found"
        );

      }

      const p =
        r.rows[0];

      if(
        p.status ===
        "completed"
      ){

        return res.send(
          "already_done"
        );

      }

      await db.transaction(

        async(tx)=>{

          if(ledger?.credit){

            await ledger.credit({

              userId:
                p.user_id,

              asset:
                p.asset,

              amount:
                Number(
                  payment
                    .pay_amount
                ),

              reason:
                "deposit",

              tx

            });

          }

          await tx.query(`
            UPDATE payments
            SET status='completed'
            WHERE id=$1
          `,[p.id]);

        }

      );

      if(ws?.sendToUser){

        await ws.sendToUser(

          p.user_id,

          {

            type:
              "deposit_completed",

            asset:
              p.asset,

            amount:
              Number(
                payment
                  .pay_amount
              )

          }

        );

      }

      return res.send(
        "ok"
      );

    }catch(e){

      console.error(
        "Webhook:",
        e.message
      );

      return res
        .status(500)
        .send("error");

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
        withdrawSchema.validate(
          req.body
        );

      if(error){

        return fail(

          res,

          error.details[0]
            .message

        );

      }

      let risk = {

        blocked:false

      };

      if(fraud?.check){

        risk =
          await fraud.check({

            userId:
              req.user.id,

            amount:
              value.amount,

            wallet:
              value.address,

            ip:req.ip,

            deviceId:
              req.headers[
                "x-device-id"
              ]

          });

      }

      if(risk.blocked){

        return fail(

          res,

          "withdraw_blocked",

          403

        );

      }

      await db.transaction(

        async(tx)=>{

          const w =
            await tx.query(`
              SELECT balance
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

          if(ledger?.debit){

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

          }

          await tx.query(`
            INSERT INTO withdrawals
            (
              user_id,
              asset,
              amount,
              address,
              status,
              created_at
            )
            VALUES(
              $1,
              $2,
              $3,
              $4,
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

      if(ws?.sendToUser){

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

      }

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
          ) || 50,

          200

        );

      const r =
        await db.query(`
          SELECT
            id,
            provider,
            amount,
            asset,
            status,
            created_at
          FROM payments
          WHERE user_id=$1
          ORDER BY id DESC
          LIMIT $2
      `,[

        req.user.id,

        limit

      ]);

      return ok(res,{

        payments:
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

      success:true,

      provider:
        "nowpayments",

      enabled:
        NOWPAY_ENABLED,

      redis:
        !!redis,

      timestamp:
        Date.now()

    });

  }

);

module.exports =
  router;
