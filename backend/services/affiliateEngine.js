"use strict";

const db = require("../database");

const MAX_LEVEL = 3;
const MIN_AMOUNT = 0.01;

/* =========================================
MAIN ENGINE
========================================= */

async function processAffiliate(userId, amount, type){

  if(!userId || amount < MIN_AMOUNT) return;

  const client = await db.connect();

  try{

    await client.query("BEGIN");

    let current = userId;
    let level = 1;

    while(level <= MAX_LEVEL){

      const res = await client.query(
        `SELECT referred_by FROM users WHERE id=$1`,
        [current]
      );

      const parent = res.rows[0]?.referred_by;
      if(!parent) break;

      const percent = getLevelPercent(level);

      if(percent <= 0){
        current = parent;
        level++;
        continue;
      }

      const vipBoost = await getVIPBoost(client, parent);

      let reward = amount * percent * vipBoost;

      // 🔐 anti micro abuse
      if(reward < 0.00001){
        current = parent;
        level++;
        continue;
      }

      // 🔒 max cap per tx
      reward = Math.min(reward, 100);

      /* ================= LEDGER (SAFE) ================= */

      await client.query(
        `INSERT INTO ledger(user_id,asset,amount,type,meta,created_at)
         VALUES($1,'BX',$2,'affiliate',$3,NOW())`,
        [
          parent,
          reward,
          JSON.stringify({
            from:userId,
            level,
            source:type
          })
        ]
      );

      /* ================= BALANCE ================= */

      await client.query(
        `UPDATE users
         SET bx_balance = bx_balance + $1
         WHERE id=$2`,
        [reward, parent]
      );

      /* ================= TRACK ================= */

      await client.query(
        `INSERT INTO affiliate_commissions
         (from_user,to_user,level,amount,type,created_at)
         VALUES($1,$2,$3,$4,$5,NOW())`,
        [userId, parent, level, reward, type]
      );

      /* ================= REALTIME (OPTIONAL) ================= */

      sendRealtime(parent, {
        type: "affiliate_reward",
        amount: reward,
        level
      });

      current = parent;
      level++;

    }

    await client.query("COMMIT");

  }catch(e){

    await client.query("ROLLBACK");
    console.error("affiliate_error", e);

  }finally{
    client.release();
  }

}

/* =========================================
LEVEL %
========================================= */

function getLevelPercent(level){

  switch(level){
    case 1: return 0.05;
    case 2: return 0.02;
    case 3: return 0.01;
    default: return 0;
  }

}

/* =========================================
VIP BOOST (OPTIMIZED)
========================================= */

const vipCache = new Map();

async function getVIPBoost(client, userId){

  if(vipCache.has(userId)){
    return vipCache.get(userId);
  }

  const r = await client.query(
    `SELECT total_volume FROM users WHERE id=$1`,
    [userId]
  );

  const volume = r.rows[0]?.total_volume || 0;

  const vip = await client.query(
    `SELECT boost FROM vip_levels
     WHERE min_volume <= $1
     ORDER BY min_volume DESC
     LIMIT 1`,
    [volume]
  );

  const boost = vip.rows[0]?.boost || 1;

  vipCache.set(userId, boost);

  return boost;

}

/* =========================================
REALTIME (WS HOOK)
========================================= */

function sendRealtime(userId, payload){

  try{

    const ws = global.WS_HUB;

    if(!ws) return;

    ws.send(userId, payload);

  }catch(e){}

}

module.exports = { processAffiliate };
