// src/routes/price.js
import express from "express";
import fetch from "node-fetch";
const router = express.Router();

router.get("/bx-ton", async (_,res)=>{
  const r = await fetch("https://api.ston.fi/v1/pool/BX-TON");
  res.json(await r.json());
});

router.get("/bx-usdt", async (_,res)=>{
  const r = await fetch("https://api.ston.fi/v1/pool/BX-USDT");
  res.json(await r.json());
});

export default router;
