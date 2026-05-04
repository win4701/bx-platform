"use strict";

class WalletEngine{

  constructor(db){
    this.db = db;
  }

  /* =========================================================
     TRANSFER (SECURE)
  ========================================================= */

  async transfer({ from, to, amount, ip }){

    if(amount <= 0){
      throw new Error("invalid_amount");
    }

    const client = await this.db.connect();

    try{

      await client.query("BEGIN");

      // 🔒 LOCK sender row
      const sender = await client.query(`
        SELECT bx_balance, frozen FROM users
        WHERE id=$1
        FOR UPDATE
      `,[from]);

      if(!sender.rows.length){
        throw new Error("sender_not_found");
      }

      const balance = Number(sender.rows[0].bx_balance);

      if(sender.rows[0].frozen){
        throw new Error("account_frozen");
      }

      if(balance < amount){
        throw new Error("insufficient_balance");
      }

      // 🔒 LOCK receiver
      const receiver = await client.query(`
        SELECT id FROM users
        WHERE id=$1
        FOR UPDATE
      `,[to]);

      if(!receiver.rows.length){
        throw new Error("receiver_not_found");
      }

      // 💰 debit
      await client.query(`
        UPDATE users SET bx_balance = bx_balance - $1
        WHERE id=$2
      `,[amount, from]);

      // 💰 credit
      await client.query(`
        UPDATE users SET bx_balance = bx_balance + $1
        WHERE id=$2
      `,[amount, to]);

      // 📜 log transaction
      await client.query(`
        INSERT INTO transactions
        (from_id,to_id,amount,type,ip)
        VALUES ($1,$2,$3,'transfer',$4)
      `,[from,to,amount,ip]);

      await client.query("COMMIT");

      return { success:true };

    }catch(e){

      await client.query("ROLLBACK");
      throw e;

    }finally{
      client.release();
    }

  }

}

module.exports = WalletEngine;
