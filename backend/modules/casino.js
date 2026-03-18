"use strict";

const express = require("express");
const router = express.Router();

const engine = require("../engines/casinoEngine");

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
PLAY GAME (CLEAN)
========================================= */

router.post("/play", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

    const { game, bet } = req.body;

    const result = await engine.play({
      userId,
      game,
      bet
    });

    res.json({
      success:true,
      ...result
    });

  }catch(e){

    console.error("casino play error:", e);

    res.status(500).json({
      error:e.message || "casino_failed"
    });

  }

});

/* =========================================
ROTATE SEED
========================================= */

router.post("/seed/rotate", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

    const result = await engine.rotateSeed(userId);

    res.json(result);

  }catch(e){

    res.status(500).json({
      error:"seed_rotate_failed"
    });

  }

});

/* =========================================
HISTORY
========================================= */

router.get("/history", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

    const db = require("../database");

    const r = await db.query(`
      SELECT game,bet,payout,result,created_at
      FROM casino_bets
      WHERE user_id=$1
      ORDER BY id DESC
      LIMIT 50
    `,[userId]);

    res.json(r.rows);

  }catch(e){

    res.status(500).json({
      error:"history_failed"
    });

  }

});

/* =========================================
GAMES LIST
========================================= */

router.get("/games",(req,res)=>{

  res.json([
    "coinflip",
    "dice",
    "limbo",
    "crash"
  ]);

});

/* =========================================
EXPORT
========================================= */

module.exports = router;
