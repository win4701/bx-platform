"use strict";

/* =========================================================
   BXS CASINO ENGINE — ENTERPRISE GAMING CORE
========================================================= */

const crypto =
  require("crypto");

const db =
  require("../database");

const redis =
  require("./core/redis");

const ledger =
  require("./core/ledger");

const risk =
  require("../core/riskEngine");

const ws =
  require("../ws/wsHub");

const ai =
  require("./core/aiEngine");

const whale =
  require("./core/whaleTracker");

const vip =
  require("./core/vipSystem");

/* =========================================================
   CONFIG
========================================================= */

const HOUSE_EDGE = 0.01;

const MAX_PAYOUT =
  1_000_000;

/* =========================================================
   RNG
========================================================= */

function hmac(

  serverSeed,
  clientSeed,
  nonce

){

  return crypto
    .createHmac(
      "sha256",
      serverSeed
    )
    .update(
      `${clientSeed}:${nonce}`
    )
    .digest("hex");

}

function rng({

  serverSeed,
  clientSeed,
  nonce

}){

  const hash =
    hmac(
      serverSeed,
      clientSeed,
      nonce
    );

  const num =
    parseInt(
      hash.substring(0,13),
      16
    );

  return (
    num /
    0x1fffffffffffff
  );

}

/* =========================================================
   GAME ENGINE
========================================================= */

function play({

  game,
  r,
  data

}){

  switch(game){

    case "coinflip":{

      const side =
        r > 0.5
          ? "heads"
          : "tails";

      return {

        result:side,

        win:
          side === data.side,

        multiplier:
          2 * (
            1 -
            HOUSE_EDGE
          )

      };

    }

    case "dice":{

      const roll =
        Number(
          (r * 100)
          .toFixed(2)
        );

      const target =
        data.target || 50;

      const win =
        roll > target;

      return {

        result:roll,

        win,

        multiplier:
          (
            100 /
            (
              100 - target
            )
          ) *
          (
            1 -
            HOUSE_EDGE
          )

      };

    }

    case "crash":{

      const crash =
        Number(
          (
            1 /
            (1-r)
          ).toFixed(2)
        );

      return {

        result:crash,

        win:
          crash >=
          data.cashout,

        multiplier:
          data.cashout *
          (
            1 -
            HOUSE_EDGE
          )

      };

    }

    default:

      throw new Error(
        "unsupported_game"
      );

  }

}

/* =========================================================
   USER STATE
========================================================= */

async function getState(userId){

  let state =
    await redis.getCache(
      `casino:seed:${userId}`
    );

  if(state){
    return state;
  }

  const r =
    await db.query(`
      SELECT
        server_seed,
        client_seed,
        nonce
      FROM casino_seeds
      WHERE user_id=$1
    `,[userId]);

  if(!r.rows.length){

    state = {

      serverSeed:
        crypto
          .randomBytes(32)
          .toString("hex"),

      clientSeed:
        crypto
          .randomBytes(16)
          .toString("hex"),

      nonce:0

    };

    await db.query(`
      INSERT INTO casino_seeds
      (
        user_id,
        server_seed,
        client_seed,
        nonce
      )
      VALUES($1,$2,$3,0)
    `,[

      userId,

      state.serverSeed,

      state.clientSeed

    ]);

  }else{

    state = {

      serverSeed:
        r.rows[0].server_seed,

      clientSeed:
        r.rows[0].client_seed,

      nonce:
        Number(
          r.rows[0].nonce
        )

    };

  }

  await redis.setCache(

    `casino:seed:${userId}`,

    state,

    3600

  );

  return state;

}

/* =========================================================
   PROCESS GAME
========================================================= */

async function processGame({

  userId,
  game,
  bet,
  data

}){

  /* =====================================
     VALIDATION
  ===================================== */

  if(!bet || bet <= 0){
    throw new Error(
      "invalid_bet"
    );
  }

  /* =====================================
     RISK
  ===================================== */

  await risk.check({

    userId,
    amount:bet

  });

  /* =====================================
     USER STATE
  ===================================== */

  const state =
    await getState(userId);

  /* =====================================
     RNG
  ===================================== */

  const r =
    rng({

      serverSeed:
        state.serverSeed,

      clientSeed:
        state.clientSeed,

      nonce:
        state.nonce

    });

  /* =====================================
     GAME RESULT
  ===================================== */

  const result =
    play({

      game,
      r,
      data

    });

  /* =====================================
     VIP BOOST
  ===================================== */

  const vipInfo =
    await vip.getVIP(
      userId
    );

  const benefits =
    vip.getBenefits(
      vipInfo.level
    );

  /* =====================================
     PAYOUT
  ===================================== */

  let payout =
    result.win
      ? (
          bet *
          result.multiplier *
          benefits.stakingBoost
        )
      : 0;

  payout =
    Math.min(
      payout,
      MAX_PAYOUT
    );

  /* =====================================
     TREASURY
  ===================================== */

  const treasury =
    await whale
      .treasuryImpact(
        userId
      );

  if(
    treasury === "danger"
  ){

    payout *= 0.8;

  }

  /* =====================================
     TRANSACTION
  ===================================== */

  const client =
    await db.connect();

  try{

    await client.query(
      "BEGIN"
    );

    /* ===============================
       DEBIT
    =============================== */

    await ledger.debit({

      userId,

      asset:"BX",

      amount:bet,

      reason:"casino_bet"

    });

    /* ===============================
       CREDIT
    =============================== */

    if(payout > 0){

      await ledger.credit({

        userId,

        asset:"BX",

        amount:payout,

        reason:"casino_win"

      });

    }

    /* ===============================
       SAVE
    =============================== */

    await client.query(`
      INSERT INTO casino_sessions
      (
        user_id,
        game,
        bet,
        payout,
        multiplier,
        result,
        nonce,
        created_at
      )
      VALUES(
        $1,$2,$3,$4,
        $5,$6,$7,NOW()
      )
    `,[

      userId,

      game,

      bet,

      payout,

      result.multiplier,

      JSON.stringify(
        result.result
      ),

      state.nonce

    ]);

    /* ===============================
       NONCE
    =============================== */

    await client.query(`
      UPDATE casino_seeds
      SET nonce=nonce+1
      WHERE user_id=$1
    `,[userId]);

    await client.query(
      "COMMIT"
    );

  }catch(e){

    await client.query(
      "ROLLBACK"
    );

    throw e;

  }finally{

    client.release();

  }

  /* =====================================
     AI MEMORY
  ===================================== */

  await ai.recordGame({

    userId,
    game,
    bet,
    payout

  });

  /* =====================================
     WHALE TRACK
  ===================================== */

  await whale.track({

    userId,
    game,
    bet,
    payout

  });

  /* =====================================
     VIP XP
  ===================================== */

  await vip.addXP(
    userId,
    bet
  );

  /* =====================================
     REALTIME
  ===================================== */

  await ws.publish(

    "casino",

    {

      type:"game",

      user:userId,

      game,

      bet,

      payout

    }

  );

  /* =====================================
     BIG WIN
  ===================================== */

  if(
    payout >=
    bet * 10
  ){

    await ws.publish(

      "casino",

      {

        type:"big_win",

        user:userId,

        game,

        payout

      }

    );

  }

  /* =====================================
     VERIFY
  ===================================== */

  return {

    game,

    result:
      result.result,

    payout,

    multiplier:
      result.multiplier,

    nonce:
      state.nonce,

    serverSeedHash:
      crypto
        .createHash(
          "sha256"
        )
        .update(
          state.serverSeed
        )
        .digest("hex"),

    clientSeed:
      state.clientSeed

  };

}

/* =========================================================
   ROTATE SEED
========================================================= */

async function rotateSeed(userId){

  const seed =
    crypto
      .randomBytes(32)
      .toString("hex");

  await db.query(`
    UPDATE casino_seeds
    SET
      server_seed=$1,
      nonce=0
    WHERE user_id=$2
  `,[seed,userId]);

  await redis.delCache(
    `casino:seed:${userId}`
  );

  return {

    success:true

  };

}

/* =========================================================
   VERIFY GAME
========================================================= */

function verify({

  serverSeed,
  clientSeed,
  nonce

}){

  return rng({

    serverSeed,
    clientSeed,
    nonce

  });

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  processGame,

  rotateSeed,

  verify

};
