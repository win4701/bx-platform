// src/routes/games.js
import express from "express";
import { pool } from "../db/pg.js";
import { fraudDecision } from "../safety/fraudScore.js";
const r = express.Router();

r.post("/bet", async (req,res)=>{
  const { game, bet, clientSeed } = req.body;
  const uid = req.user.id;

  // limits
  const s = await pool.query("SELECT * FROM game_settings WHERE game=$1",[game]);
  if(!s.rowCount) return res.sendStatus(400);
  const { min_bet, max_bet, house_edge } = s.rows[0];
  if(bet < min_bet || bet > max_bet) return res.status(400).json({ error:"BET_LIMIT" });

  // خصم الرهان
  await pool.query("UPDATE users SET bx=bx-$1 WHERE id=$2",[bet, uid]);

  // منطق مبسط (Server-side)
  let multiplier = 1;
  let result = "lose";
  if (game === "crash") {
    const crashAt = Math.max(1.01, Math.random()*10*(1-house_edge));
    multiplier = Math.min(crashAt, Number(clientSeed)||1.5);
    result = multiplier >= 1.2 ? "win" : "lose";
  }
  if (game === "chicken") {
    multiplier = Math.random() < 0.6 ? 1.5 : 0;
    result = multiplier ? "win" : "lose";
  }

  const payout = result === "win" ? bet * multiplier : 0;
  if (payout > 0) {
    await pool.query("UPDATE users SET bx=bx+$1 WHERE id=$2",[payout, uid]);
  }

  await pool.query(
    `INSERT INTO game_bets(user_id,game,bet_bx,multiplier,result,payout_bx)
     VALUES($1,$2,$3,$4,$5,$6)`,
    [uid, game, bet, multiplier, result, payout]
  );

  res.json({ result, multiplier, payout });
});

export default r;
