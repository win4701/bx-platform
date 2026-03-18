"use strict";

const express = require("express");
const router = express.Router();

const { addJob } = require("../queues/systemQueue");
const engine = require("../engines/casinoEngine");
const crash = require("../engines/crashEngine");

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
      if(!data.target || data.target < 1 || data.target > 99){
        throw new Error("invalid_target");
      }
      break;

    case "coinflip":
      if(!["heads","tails"].includes(data.side)){
        throw new Error("invalid_side");
      }
      break;

    case "limbo":
      if(!data.multiplier || data.multiplier < 1.01){
        throw new Error("invalid_multiplier");
      }
      break;

    case "crash":
      if(!data.cashout || data.cashout < 1.01){
        throw new Error("invalid_cashout");
      }
      break;

    case "roulette":
    case "blackjack":
    case "mines":
    case "plinko":
    case "slots":
    case "hi-lo":
    case "wheel":
    case "keno":
      break;

    default:
      throw new Error("game_not_supported");
  }

}

/* =========================================
RATE LIMIT (simple)
========================================= */

const userCooldown = new Map();

function checkCooldown(userId){

  const now = Date.now();
  const last = userCooldown.get(userId) || 0;

  if(now - last < 500){
    throw new Error("too_fast");
  }

  userCooldown.set(userId, now);
}

/* =========================================
PLAY GAME
========================================= */

router.post("/play", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

    const { game, bet, data } = req.body;

    if(!game || !bet){
      return res.status(400).json({ error:"missing_params" });
    }

    if(bet <= 0 || bet > 10000){
      return res.status(400).json({ error:"invalid_bet" });
    }

    checkCooldown(userId);
    validateGame(game, data || {});

    /* ================= TRY QUEUE ================= */

    try{

      await addJob("casino_play", {
        userId,
        game,
        bet,
        data
      });

      return res.json({
        success:true,
        mode:"queue"
      });

    }catch(e){

      console.warn("queue failed → fallback direct");

      /* fallback مباشر */

      const result = await engine.processGame({
        userId,
        game,
        bet,
        data
      });

      return res.json({
        success:true,
        mode:"direct",
        result
      });

    }

  }catch(e){

    console.error("casino error:", e.message);

    res.status(400).json({
      error:e.message || "casino_failed"
    });

  }

});

/* =========================================
CRASH JOIN
========================================= */

router.post("/crash/join", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

    const { bet } = req.body;

    if(!bet || bet <= 0){
      return res.status(400).json({ error:"invalid_bet" });
    }

    await crash.join(userId, bet);

    res.json({ success:true });

  }catch(e){
    res.status(400).json({ error:e.message });
  }

});

/* =========================================
CRASH CASHOUT
========================================= */

router.post("/crash/cashout", async (req,res)=>{

  try{

    const userId = requireAuth(req,res);
    if(!userId) return;

    await crash.cashout(userId);

    res.json({ success:true });

  }catch(e){
    res.status(400).json({ error:e.message });
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
    res.status(500).json({ error:"history_failed" });
  }

});

/* =========================================
GAMES
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
HEALTH CHECK
========================================= */

router.get("/health",(req,res)=>{
  res.json({
    status:"ok",
    time:Date.now()
  });
});

/* =========================================
EXPORT
========================================= */

module.exports = router;
