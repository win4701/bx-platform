"use strict";

const express = require("express");
const router = express.Router();

const db = require("../database");
const economy = require("../core/bxEconomy");

/* =========================================
CONFIG (PRO)
========================================= */

const BASE_REWARD = 0.10;
const MAX_REWARD = 1.5;
const REFERRAL_REWARD = 0.25;

/* =========================================
UTILS
========================================= */

async function hasDeposit(userId){
  const r = await db.query(
    `SELECT 1 FROM deposits WHERE user_id=$1 LIMIT 1`,
    [userId]
  );
  return !!r.rows.length;
}

async function isMultiAccount(ip){
  const r = await db.query(
    `SELECT COUNT(*) FROM users WHERE last_ip=$1`,
    [ip]
  );
  return Number(r.rows[0].count) > 5;
}

/* =========================================
GET REF LINK
========================================= */

router.get("/ref", async (req,res)=>{

  const userId = req.user?.id;

  if(!userId){
    return res.status(401).json({error:"unauthorized"});
  }

  const link = `${process.env.APP_URL}?ref=${userId}`;

  res.json({
    success:true,
    refCode:userId,
    link
  });

});

/* =========================================
STATUS (🔥 upgraded)
========================================= */

router.get("/status", async (req,res)=>{

  try{

    const userId = req.user?.id;
    if(!userId){
      return res.status(401).json({error:"unauthorized"});
    }

    const [claim, refs, tasks] = await Promise.all([

      db.query(`SELECT 1 FROM airdrop_claims WHERE user_id=$1`, [userId]),

      db.query(`SELECT COUNT(*) FROM referrals WHERE referrer_id=$1`, [userId]),

      db.query(`
        SELECT task_id, done
        FROM airdrop_tasks
        WHERE user_id=$1
      `,[userId])

    ]);

    // 🔥 build tasks
    const taskList = [
      { id:"visit", reward:0.2 },
      { id:"join", reward:0.3 },
      { id:"trade", reward:0.5 }
    ].map(t => ({
      id: t.id,
      reward: t.reward,
      done: tasks.rows.find(x => x.task_id === t.id)?.done || false
    }));

    const reward = taskList
      .filter(t => t.done)
      .reduce((sum,t)=>sum+t.reward,0);

    res.json({
      success:true,
      claimed: !!claim.rows.length,
      reward,
      referrals: Number(refs.rows[0].count),
      referralReward: REFERRAL_REWARD,
      refCode: userId,
      tasks: taskList
    });

  }catch(e){
    res.status(500).json({error:"status_error"});
  }

});

/* =========================================
TASK COMPLETE
========================================= */

router.post("/task", async (req,res)=>{

  try{

    const userId = req.user?.id;
    const { task_id } = req.body;

    if(!userId){
      return res.status(401).json({error:"unauthorized"});
    }

    if(!task_id){
      return res.status(400).json({error:"invalid_task"});
    }

    const exists = await db.query(
      `SELECT 1 FROM airdrop_tasks WHERE user_id=$1 AND task_id=$2`,
      [userId, task_id]
    );

    if(exists.rows.length){
      return res.json({success:true});
    }

    await db.query(
      `INSERT INTO airdrop_tasks (user_id, task_id, done)
       VALUES ($1,$2,true)`,
      [userId, task_id]
    );

    res.json({success:true});

  }catch(e){
    res.status(500).json({error:"task_error"});
  }

});

/* =========================================
CLAIM (🔥 secure + anti-cheat)
========================================= */

router.post("/claim", async (req,res)=>{

  try{

    const userId = req.user?.id;
    const ip = req.ip;

    if(!userId){
      return res.status(401).json({error:"unauthorized"});
    }

    // 🚫 already claimed
    const claimed = await db.query(
      `SELECT 1 FROM airdrop_claims WHERE user_id=$1`,
      [userId]
    );

    if(claimed.rows.length){
      return res.status(400).json({error:"already_claimed"});
    }

    // 🔐 anti multi account
    if(await isMultiAccount(ip)){
      return res.status(403).json({error:"multi_account_detected"});
    }

    // 🔒 require deposit
    const deposit = await hasDeposit(userId);
    if(!deposit){
      return res.status(403).json({error:"deposit_required"});
    }

    // 🔥 calculate reward
    const tasks = await db.query(
      `SELECT COUNT(*) FROM airdrop_tasks WHERE user_id=$1`,
      [userId]
    );

    let reward = BASE_REWARD + (tasks.rows[0].count * 0.2);
    reward = Math.min(reward, MAX_REWARD);

    if(reward <= 0){
      return res.status(400).json({error:"no_reward"});
    }

    // 💰 reward
    await economy.rewardBX(userId, reward, "airdrop");

    await db.query(
      `INSERT INTO airdrop_claims (user_id,claimed,claimed_at,ip)
       VALUES($1,true,NOW(),$2)`,
      [userId, ip]
    );

    res.json({
      success:true,
      reward
    });

  }catch(e){
    console.error(e);
    res.status(500).json({error:"claim_error"});
  }

});

/* =========================================
REFERRAL (🔥 upgraded secure)
========================================= */

router.post("/ref", async (req,res)=>{

  try{

    const userId = req.user?.id;
    const { refCode } = req.body;

    if(!userId){
      return res.status(401).json({error:"unauthorized"});
    }

    if(!refCode || refCode == userId){
      return res.status(400).json({error:"invalid_ref"});
    }

    // 🚫 already used referral
    const exists = await db.query(
      `SELECT 1 FROM referrals WHERE user_id=$1`,
      [userId]
    );

    if(exists.rows.length){
      return res.json({success:true});
    }

    // 🔒 only after deposit
    if(!(await hasDeposit(userId))){
      return res.status(403).json({error:"deposit_required"});
    }

    await db.query(
      `INSERT INTO referrals (user_id,referrer_id,created_at)
       VALUES($1,$2,NOW())`,
      [userId, refCode]
    );

    // 💰 reward referrer
    await economy.rewardBX(refCode, REFERRAL_REWARD, "referral");

    res.json({success:true});

  }catch(e){
    console.error(e);
    res.status(500).json({error:"ref_error"});
  }

});

module.exports = router;
