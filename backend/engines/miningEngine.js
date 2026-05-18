"use strict";

const db = require("../database");
const economy = require("../core/bxEconomy");

/* =========================================
CONFIG
========================================= */

const INTERVAL = 30000; // 30s
const MAX_PER_TICK = 3;
const MIN_HASH = 1;

/* =========================================
PROCESS
========================================= */

async function processMining(){

  const sessions = await db.query(`
    SELECT *
    FROM mining_sessions
    WHERE status='active'
  `);

  for(const s of sessions.rows){

    try{

      const last = new Date(s.last_reward).getTime();
      const now = Date.now();
      const diff = (now - last) / 1000;

      if(diff <= 0) continue;

      /* ===== REWARD ===== */

      let reward = (s.hash_rate * 0.0002) * diff;

      reward = Math.min(reward, MAX_PER_TICK);

      if(reward <= 0) continue;

      /* ===== WALLET (SAFE) ===== */

      await economy.rewardBX(
        s.user_id,
        reward,
        "mining"
      );

      /* ===== UPDATE ===== */

      await db.query(`
        UPDATE mining_sessions
        SET last_reward=NOW(),
            total_earned = total_earned + $1
        WHERE id=$2
      `,[reward, s.id]);

      /* ===== WS ===== */

      sendWS(s.user_id,{
        type:"mining_reward",
        amount:reward
      });

    }catch(e){
      console.error("mining error:", e);
    }

  }

}

/* =========================================
START SESSION (SECURE)
========================================= */

async function startMining(userId, plan){

  if(!plan) throw new Error("invalid_plan");

  /* prevent multiple sessions */
  const active = await db.query(`
    SELECT id FROM mining_sessions
    WHERE user_id=$1 AND status='active'
  `,[userId]);

  if(active.rows.length){
    throw new Error("already_mining");
  }

  const hashRate = getPlanHash(plan);

  await db.query(`
    INSERT INTO mining_sessions
    (user_id,hash_rate,plan,status,created_at,last_reward)
    VALUES($1,$2,$3,'active',NOW(),NOW())
  `,[userId, hashRate, plan]);

}

/* =========================================
PLAN HASH (IMPORTANT)
========================================= */

function getPlanHash(plan){

  const map = {
    starter: 10,
    basic: 30,
    pro: 80,
    elite: 200,
    ultra: 500,
    legend: 1000
  };

  return map[plan] || MIN_HASH;

}

/* =========================================
STOP
========================================= */

async function stopMining(userId){

  await db.query(`
    UPDATE mining_sessions
    SET status='stopped'
    WHERE user_id=$1 AND status='active'
  `,[userId]);

}

/* =========================================
STATUS (REAL)
========================================= */

async function getMiningStatus(userId){

  const r = await db.query(`
    SELECT *,
    EXTRACT(EPOCH FROM (NOW() - last_reward)) as elapsed
    FROM mining_sessions
    WHERE user_id=$1
    ORDER BY id DESC
    LIMIT 1
  `,[userId]);

  return r.rows[0] || null;
}

/* =========================================
WS
========================================= */

function sendWS(userId,data){

  const ws = global.WS_HUB;
  if(!ws) return;

  ws.send(userId,data);

}

/* =========================================
START LOOP
========================================= */

function startMiningScheduler(){

  console.log("⛏ MINING ENGINE PRO RUNNING");

  setInterval(processMining, INTERVAL);

}

module.exports = {
  startMiningScheduler,
  startMining,
  stopMining,
  getMiningStatus
};
