// src/routes/adminGames.js
import express from "express";
import { pool } from "../db/pg.js";
const r = express.Router();

r.get("/settings", async (req,res)=>{
  if(!req.user?.isAdmin) return res.sendStatus(403);
  const s = await pool.query("SELECT * FROM game_settings");
  res.json(s.rows);
});

r.post("/settings", async (req,res)=>{
  if(!req.user?.isAdmin) return res.sendStatus(403);
  const { game, min_bet, max_bet, house_edge } = req.body;
  await pool.query(
    `INSERT INTO game_settings(game,min_bet,max_bet,house_edge)
     VALUES($1,$2,$3,$4)
     ON CONFLICT (game) DO UPDATE SET
       min_bet=$2, max_bet=$3, house_edge=$4`,
    [game,min_bet,max_bet,house_edge]
  );
  res.json({ ok:true });
});
export default r;
