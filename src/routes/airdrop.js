import express from "express";
import { pool } from "../db/pg.js";
const router = express.Router();

const REWARDS = {
  website: 5,
  tg_channel: 3,
  tg_group: 3,
  facebook: 2,
  instagram: 2
};

router.get("/status", async (req,res)=>{
  const uid = req.user.id;
  const r = await pool.query(
    "SELECT * FROM airdrop_tasks WHERE user_id=$1",
    [uid]
  );
  if(!r.rowCount){
    await pool.query(
      "INSERT INTO airdrop_tasks(user_id) VALUES($1)",
      [uid]
    );
    return res.json({ tasks: {}, claimed:false });
  }
  res.json(r.rows[0]);
});

router.post("/verify", async (req,res)=>{
  const { task } = req.body;
  const uid = req.user.id;
  if(!REWARDS[task]) return res.sendStatus(400);

  await pool.query(
    `UPDATE airdrop_tasks SET ${task}=TRUE, updated_at=NOW()
     WHERE user_id=$1`, [uid]
  );
  res.json({ ok:true });
});

router.post("/claim", async (req,res)=>{
  const uid = req.user.id;
  const r = await pool.query(
    "SELECT * FROM airdrop_tasks WHERE user_id=$1 AND claimed=FALSE",
    [uid]
  );
  if(!r.rowCount) return res.sendStatus(400);

  let total = 0;
  for(const k in REWARDS) if(r.rows[0][k]) total += REWARDS[k];
  if(total === 0) return res.status(400).json({ error:"NO_TASKS" });

  await pool.query("UPDATE users SET bx=bx+$1 WHERE id=$2",[total,uid]);
  await pool.query(
    "UPDATE airdrop_tasks SET claimed=TRUE WHERE user_id=$1",[uid]
  );
  res.json({ bx: total });
});

export default router;
