"use strict";

const express = require("express");
const router = express.Router();

const engine = require("../engines/miningEngine");

/* =========================================
AUTH
========================================= */

function requireAuth(req,res){
  const userId = req.user?.id;

  if(!userId){
    res.status(401).json({ error:"unauthorized" });
    return null;
  }

  return userId;
}

/* =========================================
START MINING
========================================= */

router.post("/start", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

    let { hashRate } = req.body;

    hashRate = Number(hashRate);

    if(!hashRate || hashRate <= 0){
      return res.status(400).json({
        error:"invalid_hashrate"
      });
    }

    const result = await engine.startMining(userId, hashRate);

    res.json({
      success:true,
      ...result
    });

  }catch(e){

    console.error("mining start error:", e);

    res.status(500).json({
      error:e.message || "mining_start_failed"
    });

  }

});

/* =========================================
STOP MINING
========================================= */

router.post("/stop", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

    const result = await engine.stopMining(userId);

    res.json(result);

  }catch(e){

    res.status(500).json({
      error:"mining_stop_failed"
    });

  }

});

/* =========================================
STATUS
========================================= */

router.get("/status", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

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

/* =========================================
EXPORT
========================================= */

module.exports = router;
