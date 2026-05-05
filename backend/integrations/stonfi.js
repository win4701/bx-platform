"use strict";

/* =========================================================
   BLOXIO STON.FI INTEGRATION
========================================================= */

const axios = require("axios");

/* =========================================================
   CONFIG
========================================================= */

const BX_CONTRACT = "EQCRYlkaR6GlssLRrQlBH3HOPJSMk_vzfAAyyuhnriX-7a_a";

const STON_API = "https://api.ston.fi";

/* =========================================================
   GET TOKEN INFO
========================================================= */

async function getTokenInfo(){

  try{

    const res = await axios.get(`${STON_API}/v1/assets`);

    const bx = res.data.assets.find(a =>
      a.contract_address === BX_CONTRACT
    );

    return bx || null;

  }catch(e){
    console.error("STON API error:", e.message);
    return null;
  }

}

/* =========================================================
   GET POOLS
========================================================= */

async function getPools(){

  try{

    const res = await axios.get(`${STON_API}/v1/pools`);

    return res.data.pools.filter(p =>
      p.token0 === BX_CONTRACT || p.token1 === BX_CONTRACT
    );

  }catch(e){
    return [];
  }

}

/* =========================================================
   GET TRADES (🔥 مهم)
========================================================= */

async function getTrades(){

  try{

    const res = await axios.get(`${STON_API}/v1/swaps`);

    return res.data.swaps.filter(s =>
      s.token_in === BX_CONTRACT ||
      s.token_out === BX_CONTRACT
    );

  }catch(e){
    return [];
  }

}

/* =========================================================
   PROCESS TRADES → WALLET SYSTEM
========================================================= */

async function syncTrades(ledger){

  const trades = await getTrades();

  for(const t of trades){

    try{

      const userWallet = t.user_address;
      const amount = Number(t.amount_out || t.amount_in);

      /* 🔥 سجل العملية */
      await ledger.credit({
        userId: mapTONtoUser(userWallet),
        asset: "BX",
        amount,
        reason: "stonfi_trade"
      });

    }catch(e){
      console.error("Trade sync error:", e.message);
    }

  }

}

/* =========================================================
   ADDRESS MAPPING
========================================================= */

function mapTONtoUser(address){

  // لازم تربط TON address بالمستخدم
  // DB table: user_wallets

  return 0; // TODO
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  BX_CONTRACT,
  getTokenInfo,
  getPools,
  getTrades,
  syncTrades
};
