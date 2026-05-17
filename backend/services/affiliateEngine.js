"use strict";

/* =========================================================
   BXS AFFILIATE ENGINE — ENTERPRISE SYSTEM
========================================================= */

const db = require("../database");
const redis = require("./core/redis");
const ledger = require("./core/ledger");
const fraud = require("./core/fraudEngine");

const MAX_LEVEL = 5;
const MIN_AMOUNT = 0.01;

const DAILY_CAP = 5000;
const TX_CAP = 100;

/* =========================================================
   MAIN PROCESS
========================================================= */

async function processAffiliate(userId, amount, type){

  if(!userId || amount < MIN_AMOUNT){
    return;
  }

  const lockKey = `aff_lock:${userId}`;

  const locked = await redis.lock(lockKey, 5);

  if(!locked){
    return;
  }

  const client = await db.connect();

  try{

    await client.query("BEGIN");

    let current = userId;
    let level = 1;

    const visited = new Set();

    while(level <= MAX_LEVEL){

      const parent = await getParent(client, current);

      if(!parent) break;

      /* =========================================
         LOOP PROTECTION
      ========================================= */

      if(visited.has(parent)){
        console.log("affiliate loop blocked");
        break;
      }

      visited.add(parent);

      /* =========================================
         SELF REFERRAL BLOCK
      ========================================= */

      if(parent === userId){
        break;
      }

      /* =========================================
         FRAUD CHECK
      ========================================= */

      const risk = await fraud.scoreUser(parent);

      if(risk > 80){

        console.log("affiliate blocked fraud");

        current = parent;
        level++;

        continue;
      }

      /* =========================================
         PERCENT
      ========================================= */

      const percent = getLevelPercent(level);

      if(percent <= 0){

        current = parent;
        level++;

        continue;

      }

      /* =========================================
         VIP BOOST
      ========================================= */

      const boost = await getVIPBoost(client,parent);

      let reward = amount * percent * boost;

      /* =========================================
         CAPS
      ========================================= */

      if(reward < 0.00001){

        current = parent;
        level++;

        continue;

      }

      reward = Math.min(reward, TX_CAP);

      const today = await getTodayRewards(client,parent);

      if(today >= DAILY_CAP){

        current = parent;
        level++;

        continue;

      }

      /* =========================================
         LEDGER
      ========================================= */

      await ledger.credit({

        userId: parent,

        asset: "BX",

        amount: reward,

        type: "affiliate_reward",

        meta: {
          from:userId,
          level,
          source:type
        }

      });

      /* =========================================
         TRACKING
      ========================================= */

      await client.query(`
        INSERT INTO affiliate_commissions
        (
          from_user,
          to_user,
          level,
          amount,
          type,
          created_at
        )
        VALUES($1,$2,$3,$4,$5,NOW())
      `,[
        userId,
        parent,
        level,
        reward,
        type
      ]);

      /* =========================================
         STATS
      ========================================= */

      await updateStats(client,parent,reward);

      /* =========================================
         REALTIME
      ========================================= */

      realtime(parent,{
        type:"affiliate_reward",
        amount:reward,
        level
      });

      current = parent;

      level++;

    }

    await client.query("COMMIT");

  }catch(e){

    await client.query("ROLLBACK");

    console.error("affiliate error",e);

  }finally{

    client.release();

    await redis.unlock(lockKey);

  }

}

/* =========================================================
   GET PARENT
========================================================= */

async function getParent(client,userId){

  const r = await client.query(`
    SELECT referred_by
    FROM users
    WHERE id=$1
  `,[userId]);

  return r.rows[0]?.referred_by || null;

}

/* =========================================================
   LEVEL %
========================================================= */

function getLevelPercent(level){

  switch(level){

    case 1: return 0.05;
    case 2: return 0.03;
    case 3: return 0.02;
    case 4: return 0.01;
    case 5: return 0.005;

    default: return 0;

  }

}

/* =========================================================
   VIP BOOST
========================================================= */

const vipCache = new Map();

async function getVIPBoost(client,userId){

  if(vipCache.has(userId)){
    return vipCache.get(userId);
  }

  const r = await client.query(`
    SELECT vip_level,total_volume
    FROM users
    WHERE id=$1
  `,[userId]);

  const volume = r.rows[0]?.total_volume || 0;

  let boost = 1;

  if(volume >= 1000000){
    boost = 2;
  }else if(volume >= 100000){
    boost = 1.5;
  }else if(volume >= 10000){
    boost = 1.2;
  }

  vipCache.set(userId,boost);

  return boost;

}

/* =========================================================
   TODAY REWARDS
========================================================= */

async function getTodayRewards(client,userId){

  const r = await client.query(`
    SELECT COALESCE(SUM(amount),0) total
    FROM affiliate_commissions
    WHERE to_user=$1
    AND created_at >= NOW() - INTERVAL '1 day'
  `,[userId]);

  return Number(r.rows[0].total || 0);

}

/* =========================================================
   STATS
========================================================= */

async function updateStats(client,userId,reward){

  await client.query(`
    UPDATE users
    SET
      affiliate_earnings =
      COALESCE(affiliate_earnings,0)+$1
    WHERE id=$2
  `,[reward,userId]);

}

/* =========================================================
   REALTIME
========================================================= */

function realtime(userId,payload){

  try{

    const ws = global.WS_HUB;

    if(!ws) return;

    ws.sendToUser(userId,payload);

  }catch(e){}

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  processAffiliate
};
