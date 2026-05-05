"use strict";

/* =========================================================
   BLOXIO BALANCE ENGINE — ULTRA CORE
========================================================= */

const ledger = require("./ledger");

class BalanceEngine{

  constructor(walletRepo, db){
    this.wallet = walletRepo;
    this.db = db;
  }

  /* =========================================================
     VALIDATION
  ========================================================= */

  validate(amount){
    if(!amount || amount <= 0){
      throw new Error("invalid_amount");
    }
  }

  /* =========================================================
     LOCK (SAFE)
  ========================================================= */

  async lock({ userId, asset, amount, tx }){

    this.validate(amount);

    const client = tx || this.db;

    /* 🔒 FOR UPDATE */
    const r = await client.query(`
      SELECT balance, locked
      FROM wallet_balances
      WHERE user_id=$1 AND asset=$2
      FOR UPDATE
    `,[userId,asset]);

    const balance = Number(r.rows[0]?.balance || 0);

    if(balance < amount){
      throw new Error("insufficient_balance");
    }

    await this.wallet.lock(userId, asset, amount, client);

  }

  /* =========================================================
     UNLOCK
  ========================================================= */

  async unlock({ userId, asset, amount, tx }){

    this.validate(amount);

    const client = tx || this.db;

    await this.wallet.unlock(userId, asset, amount, client);

  }

  /* =========================================================
     TRANSFER INTERNAL (FAST PATH)
  ========================================================= */

  async transfer({
    from,
    to,
    asset,
    amount,
    tx
  }){

    this.validate(amount);

    const client = tx || await this.db.connect();

    try{

      if(!tx) await client.query("BEGIN");

      /* 🔒 LOCK BOTH */
      const r = await client.query(`
        SELECT user_id, balance
        FROM wallet_balances
        WHERE user_id = ANY($1) AND asset=$2
        FOR UPDATE
      `,[[from,to],asset]);

      const sender = r.rows.find(r=>r.user_id === from);

      if(!sender || Number(sender.balance) < amount){
        throw new Error("insufficient_balance");
      }

      /* 💰 DEBIT */
      await ledger.debit({
        userId: from,
        asset,
        amount,
        reason: "internal_transfer",
        tx: client
      });

      /* 💰 CREDIT */
      await ledger.credit({
        userId: to,
        asset,
        amount,
        reason: "internal_transfer",
        tx: client
      });

      if(!tx) await client.query("COMMIT");

      /* ⚡ WS */
      global.WS?.send(from,{type:"wallet_update"});
      global.WS?.send(to,{type:"wallet_update"});

    }catch(e){

      if(!tx) await client.query("ROLLBACK");
      throw e;

    }finally{
      if(!tx) client.release();
    }

  }

  /* =========================================================
     SAFE EXECUTION WRAPPER
  ========================================================= */

  async safe(fn){

    const client = await this.db.connect();

    try{

      await client.query("BEGIN");

      const result = await fn(client);

      await client.query("COMMIT");

      return result;

    }catch(e){

      await client.query("ROLLBACK");
      throw e;

    }finally{
      client.release();
    }

  }

}

module.exports = BalanceEngine;
