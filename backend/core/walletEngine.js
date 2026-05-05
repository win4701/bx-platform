"use strict";

/* =========================================================
   BLOXIO WALLET ENGINE — ULTRA SECURE
========================================================= */

const ledger = require("./ledger");
const riskEngine = require("./riskEngine");

class WalletEngine{

  constructor(db){
    this.db = db;
  }

  /* =========================================================
     TRANSFER (PRO LEVEL)
  ========================================================= */

  async transfer({ from, to, asset="BX", amount, ip }){

    if(!from || !to){
      throw new Error("invalid_users");
    }

    if(from === to){
      throw new Error("self_transfer_not_allowed");
    }

    if(!amount || amount <= 0){
      throw new Error("invalid_amount");
    }

    /* ===== RISK CHECK ===== */
    await riskEngine.fullCheck({
      userId: from,
      amount,
      type: "transfer"
    });

    const client = await this.db.connect();

    try{

      await client.query("BEGIN");

      /* ===== LOCK USERS ===== */
      const users = await client.query(`
        SELECT id, banned, frozen
        FROM users
        WHERE id = ANY($1)
        FOR UPDATE
      `,[[from,to]]);

      if(users.rows.length !== 2){
        throw new Error("user_not_found");
      }

      const sender = users.rows.find(u=>u.id === from);

      if(sender.banned || sender.frozen){
        throw new Error("account_restricted");
      }

      /* ===== DEBIT (LEDGER) ===== */
      await ledger.debit({
        userId: from,
        asset,
        amount,
        reason: "transfer",
        tx: client
      });

      /* ===== CREDIT (LEDGER) ===== */
      await ledger.credit({
        userId: to,
        asset,
        amount,
        reason: "transfer",
        tx: client
      });

      /* ===== LOG ===== */
      await client.query(`
        INSERT INTO transactions
        (from_id,to_id,asset,amount,type,ip)
        VALUES ($1,$2,$3,$4,'transfer',$5)
      `,[from,to,asset,amount,ip]);

      /* ===== AUDIT ===== */
      await client.query(`
        INSERT INTO audit_logs(user_id,action,meta)
        VALUES($1,'transfer', $2)
      `,[
        from,
        JSON.stringify({
          to,
          asset,
          amount
        })
      ]);

      await client.query("COMMIT");

      /* ===== WS ===== */
      global.WS?.send(from,{
        type:"wallet_update"
      });

      global.WS?.send(to,{
        type:"wallet_update"
      });

      return { success:true };

    }catch(e){

      await client.query("ROLLBACK");

      /* ===== FRAUD LOG ===== */
      try{
        await this.db.query(`
          INSERT INTO fraud_logs(user_id,reason)
          VALUES($1,$2)
        `,[from,e.message]);
      }catch{}

      throw e;

    }finally{
      client.release();
    }

  }

}

module.exports = WalletEngine;
