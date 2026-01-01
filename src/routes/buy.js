// src/routes/buy.js
import express from "express";
import { OFFERS } from "../economy/offers.js";
import { pool } from "../db/pg.js";
const router = express.Router();

router.get("/offers",(req,res)=>{
  res.json(OFFERS);
});

router.post("/confirm", async (req,res)=>{
  const { currency, pay, txHash } = req.body;
  const uid = req.user.id;

  const offer = OFFERS[currency]?.find(o=>o.pay===pay);
  if(!offer) return res.sendStatus(400);

  // ⚠️ هنا يتم التحقق من Tx يدويًا أو عبر watcher
  await pool.query(
    "UPDATE users SET bx=bx+$1 WHERE id=$2",
    [offer.receive, uid]
  );

  res.json({ bx: offer.receive });
});

export default router;
