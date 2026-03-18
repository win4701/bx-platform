"use strict";

const db = require("../database");
const economy = require("../core/bxEconomy");

/* =========================================
CONFIG
========================================= */

const REWARD_RATE = 0.0005; // per hash/sec
const MAX_REWARD_PER_MIN = 5;
const INTERVAL = 60 * 1000;

/* =========================================
PROCESS
========================================= */

async function processMining(){

  const now = Date.now();

  const sessions = await db.query(`
    SELECT *
    FROM mining_sessions
    WHERE status='active'
  `);

  for(const s of sessions.rows){

    try{

      const last = new Date(s.last_reward || s.created_at).getTime();
      const diff = (now - last) / 1000; // seconds

      if(diff <= 0) continue;

      /* ================= REWARD ================= */

      let reward = Number(s.hash_rate) * REWARD_RATE * diff;

      /* cap protection */
      if(reward > MAX_REWARD_PER_MIN){
        reward = MAX_REWARD_PER_MIN;
      }

      if(reward <= 0) continue;

      /* ================= ECONOMY ================= */

      await economy.rewardBX(
        s.user_id,
        reward,
        "mining_reward"
      );

      /* ================= UPDATE ================= */

      await db.query(`
        UPDATE mining_sessions
        SET last_reward = NOW(),
            total_earned = COALESCE(total_earned,0) + $1
        WHERE id=$2
      `,[reward, s.id]);

    }catch(e){
      console.error("Mining session error:", e.message);
    }

  }

}

/* =========================================
START
========================================= */

function startMiningScheduler(){

  console.log("⛏ Mining Engine LIVE");

  setInterval(async ()=>{

    try{
      await processMining();
    }catch(e){
      console.error("Mining error", e);
    }

  }, INTERVAL);

}

/* =========================================
START SESSION
========================================= */

async function startMining(userId, hashRate){

  if(hashRate <= 0) throw new Error("invalid_hashrate");

  await db.query(`
    INSERT INTO mining_sessions
    (user_id, hash_rate, status, created_at, last_reward)
    VALUES($1,$2,'active',NOW(),NOW())
  `,[userId, hashRate]);

  return { success:true };
}

/* =========================================
STOP SESSION
========================================= */

async function stopMining(userId){

  await db.query(`
    UPDATE mining_sessions
    SET status='stopped'
    WHERE user_id=$1 AND status='active'
  `,[userId]);

  return { success:true };
}

/* =========================================
GET STATUS
========================================= */

async function getMiningStatus(userId){

  const r = await db.query(`
    SELECT *
    FROM mining_sessions
    WHERE user_id=$1
    ORDER BY id DESC
    LIMIT 1
  `,[userId]);

  return r.rows[0] || null;
}

/* =========================================
EXPORT
========================================= */

module.exports = {
  startMiningScheduler,
  startMining,
  stopMining,
  getMiningStatus
};
