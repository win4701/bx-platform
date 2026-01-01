import express from "express";
import { pool } from "../db/pg.js";
const r = express.Router();

r.get("/", async (req,res)=>{
  if(!req.user?.isAdmin) return res.sendStatus(403);

  const q = await pool.query(`
    SELECT provider, status, reason, ip, created_at
    FROM webhook_logs
    ORDER BY created_at DESC
    LIMIT 100
  `);
  res.json(q.rows);
});

export default r;
