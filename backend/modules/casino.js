"use strict";

const express = require("express");
const router = express.Router();

const { addJob } = require("../queues/systemQueue");

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
VALIDATION
========================================= */

function validateGame(game, data){

  switch(game){

    case "dice":
      if(!data.target) throw new Error("invalid_target");
      break;

    case "coinflip":
      if(!["heads","tails"].includes(data.side)){
        throw new Error("invalid_side");
      }
      break;

    case "limbo":
      if(!data.multiplier) throw new Error("invalid_multiplier");
      break;

    case "crash":
      if(!data.cashout) throw new Error("invalid_cashout");
      break;

    case "roulette":
    case "blackjack":
    case "mines":
    case "plinko":
    case "slots":
    case "hi-lo":
    case "wheel":
      break;

    default:
      throw new Error("game_not_supported");

  }

}

/* =========================================
PLAY GAME (QUEUE)
========================================= */

router.post("/play", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

    const { game, bet, data } = req.body;

    if(!game || !bet){
      return res.status(400).json({
        error:"missing_params"
      });
    }

    if(bet <= 0){
      return res.status(400).json({
        error:"invalid_bet"
      });
    }

    validateGame(game, data || {});

    /* ================= QUEUE ================= */

    await addJob("casino_play", {
      userId,
      game,
      bet,
      data
    });

    res.json({
      success:true,
      queued:true
    });

  }catch(e){

    console.error("casino error:", e.message);

    res.status(500).json({
      error:e.message || "casino_failed"
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
      SELECT game,bet,profit,result,created_at
      FROM casino_sessions
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
GAMES LIST (12 GAMES)
========================================= */

router.get("/games",(req,res)=>{

  res.json([
    "dice",
    "coinflip",
    "limbo",
    "crash",
    "roulette",
    "blackjack",
    "mines",
    "plinko",
    "slots",
    "hi-lo",
    "wheel",
    "keno"
  ]);

});

/* =========================================
EXPORT
========================================= */

module.exports = router;
