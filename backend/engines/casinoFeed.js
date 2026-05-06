"use strict";

/* =========================================================
   BXS CASINO FEED — ENTERPRISE REALTIME EVENT BUS
========================================================= */

const crypto =
  require("crypto");

const redis =
  require("../core/redis");

const ws =
  require("../ws/wsHub");

/* =========================================================
   CONFIG
========================================================= */

const MAX_HISTORY = 200;

const FEED_TTL = 86400;

/* =========================================================
   EVENT ID
========================================================= */

function eventId(){

  return crypto
    .randomBytes(12)
    .toString("hex");

}

/* =========================================================
   PUSH EVENT
========================================================= */

async function pushEvent(

  channel,
  data

){

  const event = {

    id:eventId(),

    ...data,

    createdAt:Date.now()

  };

  /* =====================================
     REDIS STREAM
  ===================================== */

  await redis.lPush(

    `feed:${channel}`,

    JSON.stringify(event)

  );

  await redis.lTrim(

    `feed:${channel}`,

    0,

    MAX_HISTORY

  );

  await redis.expire(

    `feed:${channel}`,

    FEED_TTL

  );

  /* =====================================
     REALTIME
  ===================================== */

  await ws.publish(

    `feed:${channel}`,

    event

  );

  return event;

}

/* =========================================================
   BET EVENT
========================================================= */

async function broadcastBet({

  user,
  game,
  bet,
  currency="BX"

}){

  return pushEvent(

    "bets",

    {

      type:"bet",

      user,

      game,

      bet:Number(bet),

      currency

    }

  );

}

/* =========================================================
   WIN EVENT
========================================================= */

async function broadcastWin({

  user,
  game,
  payout,
  multiplier=null,
  currency="BX"

}){

  const event =
    await pushEvent(

      "wins",

      {

        type:"win",

        user,

        game,

        payout:Number(payout),

        multiplier,

        currency

      }

    );

  /* =====================================
     BIG WIN
  ===================================== */

  if(payout >= 100){

    await pushEvent(

      "bigwins",

      {

        type:"big_win",

        user,

        game,

        payout,

        multiplier,

        currency

      }

    );

  }

  return event;

}

/* =========================================================
   WHALE EVENT
========================================================= */

async function broadcastWhale({

  user,
  game,
  wager

}){

  return pushEvent(

    "whales",

    {

      type:"whale",

      user,

      game,

      wager

    }

  );

}

/* =========================================================
   JACKPOT EVENT
========================================================= */

async function broadcastJackpot({

  user,
  game,
  payout

}){

  return pushEvent(

    "jackpots",

    {

      type:"jackpot",

      user,

      game,

      payout

    }

  );

}

/* =========================================================
   LEADERBOARD EVENT
========================================================= */

async function leaderboardUpdate(data){

  return pushEvent(

    "leaderboard",

    {

      type:"leaderboard",

      data

    }

  );

}

/* =========================================================
   GET HISTORY
========================================================= */

async function getHistory(

  channel="bets",

  limit=50

){

  const data =
    await redis.lRange(

      `feed:${channel}`,

      0,

      limit - 1

    );

  return data.map(x=>
    JSON.parse(x)
  );

}

/* =========================================================
   CLEANUP
========================================================= */

async function cleanup(){

  // Redis TTL handles cleanup

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  broadcastBet,

  broadcastWin,

  broadcastWhale,

  broadcastJackpot,

  leaderboardUpdate,

  getHistory

};
