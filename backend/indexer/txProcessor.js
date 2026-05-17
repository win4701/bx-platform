"use strict";

/* =========================================================
   TX PROCESSOR — PARSE + APPLY
========================================================= */

const ledger = require("./core/ledger");

/* =========================================================
   ADDRESS MAPPING
========================================================= */

async function mapAddress(db, address){

  const r = await db.query(`
    SELECT user_id
    FROM user_wallets
    WHERE ton_address=$1
  `,[address]);

  return r.rows[0]?.user_id || null;

}

/* =========================================================
   PROCESS TX
========================================================= */

async function process(db, data){

  const { from, to, amount } = data;

  const userTo = await mapAddress(db, to);

  if(userTo){

    await ledger.credit({
      userId: userTo,
      asset: "BX",
      amount,
      reason: "onchain_deposit"
    });

  }

}

module.exports = {
  process
};
