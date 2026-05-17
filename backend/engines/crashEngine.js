"use strict";

/* =========================================================
   BXS CRASH ENGINE — ENTERPRISE MULTIPLAYER
========================================================= */

const crypto =
  require("crypto");

const db =
  require("./database");

const redis =
  require("./core/redis");

const ledger =
  require("./core/ledger");

const ws =
  require("./ws/wsHub");

/* =========================================================
   CONFIG
========================================================= */

const TICK_RATE = 100;

const START_DELAY = 5000;

const ROUND_GAP = 3000;

const MAX_PAYOUT =
  1_000_000;

/* =========================================================
   STATE
========================================================= */

let interval = null;

/* =========================================================
   PROVABLY FAIR
========================================================= */

function hash(seed){

  return crypto
    .createHash("sha256")
    .update(seed)
    .digest("hex");

}

function generateCrash(seed){

  const h =
    hash(seed);

  const int =
    parseInt(
      h.substring(0,13),
      16
    );

  const r =
    int /
    0x1fffffffffffff;

  const crash =
    Math.max(
      1,
      (
        1 /
        (1-r)
      )
    );

  return Number(
    crash.toFixed(2)
  );

}

/* =========================================================
   ROUND
========================================================= */

async function createRound(){

  const seed =
    crypto
      .randomBytes(32)
      .toString("hex");

  const crashPoint =
    generateCrash(seed);

  const round = {

    id:Date.now(),

    seed,

    seedHash:
      hash(seed),

    crashPoint,

    multiplier:1,

    active:true,

    startedAt:Date.now()

  };

  await redis.setCache(

    "crash:current",

    round,

    3600

  );

  await db.query(`
    INSERT INTO crash_rounds
    (
      id,
      seed_hash,
      crash_point,
      started_at,
      active
    )
    VALUES(
      $1,$2,$3,NOW(),true
    )
  `,[

    round.id,

    round.seedHash,

    crashPoint

  ]);

  return round;

}

/* =========================================================
   START ROUND
========================================================= */

async function startRound(){

  const round =
    await createRound();

  await redis.setCache(

    `crash:players:${round.id}`,

    {},

    3600

  );

  ws.broadcast(
    "casino",
    {
      type:"crash_start",
      round:round.id,
      seedHash:
        round.seedHash
    }
  );

  runRound(round);

}

/* =========================================================
   RUN LOOP
========================================================= */

function runRound(round){

  interval =
    setInterval(async()=>{

      const state =
        await redis.getCache(
          "crash:current"
        );

      if(
        !state ||
        !state.active
      ){

        clearInterval(interval);

        return;

      }

      state.multiplier =
        Number(
          (
            state.multiplier +
            0.02
          ).toFixed(2)
        );

      await redis.setCache(

        "crash:current",

        state,

        3600

      );

      ws.broadcast(
        "casino",
        {
          type:"crash_tick",
          round:state.id,
          multiplier:
            state.multiplier
        }
      );

      /* ===============================
         CRASH
      =============================== */

      if(
        state.multiplier >=
        state.crashPoint
      ){

        clearInterval(interval);

        await endRound(
          state
        );

      }

    },TICK_RATE);

}

/* =========================================================
   JOIN
========================================================= */

async function join({

  userId,
  bet,
  autoCashout=null

}){

  const round =
    await redis.getCache(
      "crash:current"
    );

  if(
    !round ||
    !round.active
  ){

    throw new Error(
      "round_not_active"
    );

  }

  let players =
    await redis.getCache(
      `crash:players:${round.id}`
    ) || {};

  /* =====================================
     DUPLICATE
  ===================================== */

  if(players[userId]){

    throw new Error(
      "already_joined"
    );

  }

  /* =====================================
     DEBIT
  ===================================== */

  await ledger.debit({

    userId,

    asset:"BX",

    amount:bet,

    reason:"crash_bet"

  });

  players[userId] = {

    bet,

    autoCashout,

    cashed:false,

    joinedAt:Date.now()

  };

  await redis.setCache(

    `crash:players:${round.id}`,

    players,

    3600

  );

  ws.broadcast(
    "casino",
    {
      type:"player_join",
      user:userId,
      bet
    }
  );

}

/* =========================================================
   CASHOUT
========================================================= */

async function cashout(userId){

  const round =
    await redis.getCache(
      "crash:current"
    );

  if(
    !round ||
    !round.active
  ){
    return;
  }

  const key =
    `crash:players:${round.id}`;

  const players =
    await redis.getCache(
      key
    ) || {};

  const p =
    players[userId];

  if(
    !p ||
    p.cashed
  ){
    return;
  }

  p.cashed = true;

  let payout =
    p.bet *
    round.multiplier;

  payout =
    Math.min(
      payout,
      MAX_PAYOUT
    );

  /* =====================================
     CREDIT
  ===================================== */

  await ledger.credit({

    userId,

    asset:"BX",

    amount:payout,

    reason:"crash_win"

  });

  await redis.setCache(

    key,

    players,

    3600

  );

  /* =====================================
     SAVE
  ===================================== */

  await db.query(`
    INSERT INTO crash_bets
    (
      round_id,
      user_id,
      bet,
      payout,
      multiplier,
      cashed_out
    )
    VALUES(
      $1,$2,$3,$4,$5,true
    )
  `,[

    round.id,

    userId,

    p.bet,

    payout,

    round.multiplier

  ]);

  ws.broadcast(
    "casino",
    {
      type:"cashout",
      user:userId,
      payout,
      multiplier:
        round.multiplier
    }
  );

}

/* =========================================================
   AUTO CASHOUT
========================================================= */

async function autoCashout(round){

  const players =
    await redis.getCache(
      `crash:players:${round.id}`
    ) || {};

  for(const userId in players){

    const p =
      players[userId];

    if(
      p.cashed ||
      !p.autoCashout
    ){
      continue;
    }

    if(
      round.multiplier >=
      p.autoCashout
    ){

      await cashout(
        Number(userId)
      );

    }

  }

}

/* =========================================================
   END ROUND
========================================================= */

async function endRound(round){

  round.active = false;

  await redis.setCache(

    "crash:current",

    round,

    3600

  );

  /* =====================================
     AUTO SAVE LOSSES
  ===================================== */

  const players =
    await redis.getCache(
      `crash:players:${round.id}`
    ) || {};

  for(const userId in players){

    const p =
      players[userId];

    if(p.cashed){
      continue;
    }

    await db.query(`
      INSERT INTO crash_bets
      (
        round_id,
        user_id,
        bet,
        payout,
        multiplier,
        cashed_out
      )
      VALUES(
        $1,$2,$3,0,$4,false
      )
    `,[

      round.id,

      userId,

      p.bet,

      round.crashPoint

    ]);

  }

  /* =====================================
     UPDATE ROUND
  ===================================== */

  await db.query(`
    UPDATE crash_rounds
    SET
      active=false,
      ended_at=NOW()
    WHERE id=$1
  `,[round.id]);

  ws.broadcast(
    "casino",
    {
      type:"crash_end",
      round:round.id,
      crash:
        round.crashPoint
    }
  );

  setTimeout(

    startRound,

    ROUND_GAP

  );

}

/* =========================================================
   VERIFY
========================================================= */

function verify(seed){

  return {

    seedHash:
      hash(seed),

    crashPoint:
      generateCrash(seed)

  };

}

/* =========================================================
   START ENGINE
========================================================= */

function start(){

  console.log(
    "💥 BXS Crash Engine LIVE"
  );

  setTimeout(
    startRound,
    START_DELAY
  );

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  start,

  join,

  cashout,

  verify

};
