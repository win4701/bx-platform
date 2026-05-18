"use strict";

/* =========================================================
   BLOXIO MINING ROUTE — ULTRA PRO
========================================================= */

const express = require("express");
const router = express.Router();

const engine = require("../engines/miningEngine");
const riskEngine = require("../core/riskEngine");

/* =========================================================
   CONFIG
========================================================= */

const MAX_HASHRATE = 1000;
const COOLDOWN = 5000;

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

function requireAuth(req,res,next){

  if(!req.user?.id){
    return res.status(401).json({error:"unauthorized"});
  }

  next();
}

/* =========================================================
   RATE LIMIT (SIMPLE)
========================================================= */

const lastAction = new Map();

function rateLimit(userId){

  const now = Date.now();

  const last = lastAction.get(userId) || 0;

  if(now - last < COOLDOWN){
    return false;
  }

  lastAction.set(userId, now);

  return true;
}

/* =========================================================
   START MINING
========================================================= */

router.post("/start", requireAuth, async (req,res)=>{

  try{

    const userId = req.user.id;

    if(!rateLimit(userId)){
      return res.status(429).json({
        error:"too_many_requests"
      });
    }

    let { hashRate } = req.body;

    hashRate = Number(hashRate);

    if(!hashRate || hashRate <= 0){
      return res.status(400).json({
        error:"invalid_hashrate"
      });
    }

    if(hashRate > MAX_HASHRATE){
      return res.status(400).json({
        error:"hashrate_too_high"
      });
    }

    /* 🔥 risk check */
    await riskEngine.checkMining(hashRate);

    const result = await engine.startMining(userId, hashRate);

    /* ⚡ realtime */
    global.WS?.send(userId,{
      type:"mining_started",
      hashRate
    });

    res.json({
      success:true,
      ...result
    });

  }catch(e){

    res.status(500).json({
      error:e.message || "mining_start_failed"
    });

  }

});

/* =========================================================
   STOP MINING
========================================================= */

router.post("/stop", requireAuth, async (req,res)=>{

  try{

    const userId = req.user.id;

    const result = await engine.stopMining(userId);

    global.WS?.send(userId,{
      type:"mining_stopped"
    });

    res.json(result);

  }catch(e){

    res.status(500).json({
      error:"mining_stop_failed"
    });

  }

});

/* =========================================================
   STATUS
========================================================= */

router.get("/status", requireAuth, async (req,res)=>{

  try{

    const userId = req.user.id;

    const status = await engine.getMiningStatus(userId);

    res.json({
      active: !!status && status.status === "active",
      session: status
    });

  }catch(e){

    res.status(500).json({
      error:"mining_status_failed"
    });

  }

});

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;
