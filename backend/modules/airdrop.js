"use strict";

const express = require("express");
const router = express.Router();

const db = require("../database");
const economy = require("../core/bxEconomy");

/* =========================================
CONFIG
========================================= */

const AIRDROP_REWARD = 0.33;
const REFERRAL_REWARD = 0.25;

/* =========================================
GET REF LINK
========================================= */

router.get("/ref", async (req,res)=>{

  try{

    const userId = req.user?.id;

    if(!userId){
      return res.status(401).json({error:"unauthorized"});
    }

    const link = `https://www.bloxio.online/?ref=${userId}`;

    res.json({
      success:true,
      refCode:userId,
      link
    });

  }catch(e){

    res.status(500).json({error:"ref_error"});

  }

});

/* =========================================
STATUS
========================================= */

router.get("/status", async (req,res)=>{

  try{

    const userId = req.user?.id;

    if(!userId){
      return res.status(401).json({error:"unauthorized"});
    }

    const claim = await db.query(
      `SELECT claimed FROM airdrop_claims WHERE user_id=$1`,
      [userId]
    );

    const refs = await db.query(
      `SELECT COUNT(*) FROM referrals WHERE referrer_id=$1`,
      [userId]
    );

    res.json({
      claimed: !!claim.rows.length,
      reward: AIRDROP_REWARD,
      referrals: Number(refs.rows[0].count),
      referralReward: REFERRAL_REWARD
    });

  }catch(e){

    res.status(500).json({error:"airdrop_error"});

  }

});

/* =========================================
CLAIM AIRDROP
========================================= */

router.post("/claim", async (req,res)=>{

  try{

    const userId = req.user?.id;

    if(!userId){
      return res.status(401).json({error:"unauthorized"});
    }

    const check = await db.query(
      `SELECT id FROM airdrop_claims WHERE user_id=$1`,
      [userId]
    );

    if(check.rows.length){
      return res.status(400).json({error:"already_claimed"});
    }

    /* reward */
    await economy.rewardBX(userId, AIRDROP_REWARD, "airdrop");

    await db.query(
      `INSERT INTO airdrop_claims (user_id,claimed,claimed_at)
       VALUES($1,true,NOW())`,
      [userId]
    );

    res.json({
      success:true,
      reward:AIRDROP_REWARD
    });

  }catch(e){

    res.status(500).json({error:"claim_error"});

  }

});

/* =========================================
REGISTER REFERRAL (🔥 مهم)
========================================= */

router.post("/ref", async (req,res)=>{

  try{

    const userId = req.user?.id;
    const { refCode } = req.body;

    if(!userId){
      return res.status(401).json({error:"unauthorized"});
    }

    if(!refCode || refCode == userId){
      return res.status(400).json({error:"invalid_ref"});
    }

    /* check already referred */
    const exists = await db.query(
      `SELECT id FROM referrals WHERE user_id=$1`,
      [userId]
    );

    if(exists.rows.length){
      return res.json({success:true});
    }

    /* save referral */
    await db.query(
      `INSERT INTO referrals (user_id,referrer_id)
       VALUES($1,$2)`,
      [userId, refCode]
    );

    /* reward referrer */
    await economy.rewardBX(refCode, REFERRAL_REWARD, "referral");

    res.json({
      success:true
    });

  }catch(e){

    console.error(e);
    res.status(500).json({error:"ref_error"});

  }

});

module.exports = router;
