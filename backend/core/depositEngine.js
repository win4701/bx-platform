"use strict";

/* =========================================================
   BLOXIO DEPOSIT ENGINE — ULTRA PRO
========================================================= */

const ledger = require("./ledger");
const riskEngine = require("./riskEngine");

class DepositEngine {

  constructor(db){
    this.db = db;
  }

  /* =========================================================
     CREATE DEPOSIT
  ========================================================= */

  async create({ userId, payment }){

    if(!userId || !payment?.payment_id){
      throw new Error("invalid_deposit_data");
    }

    await this.db.query(`
      INSERT INTO payments
      (user_id,type,provider,amount,asset,status,external_id,meta)
      VALUES ($1,'deposit','nowpayments',$2,$3,'pending',$4,$5)
      ON CONFLICT (external_id) DO NOTHING
    `,[
      userId,
      Number(payment.price_amount),
      payment.pay_currency,
      payment.payment_id,
      JSON.stringify({
        address: payment.pay_address
      })
    ]);

  }

  /* =========================================================
     VALIDATION (ADVANCED)
  ========================================================= */

  validateWebhook(payment, record){

    if(!payment || !record){
      throw new Error("invalid_data");
    }

    if(payment.payment_status !== "finished"){
      throw new Error("not_finished");
    }

    if(payment.pay_currency !== record.asset){
      throw new Error("currency_mismatch");
    }

    /* ===== tolerance (important) ===== */
    const diff = Math.abs(
      Number(payment.price_amount) - Number(record.amount)
    );

    if(diff > 0.5){
      throw new Error("amount_mismatch");
    }

    if(Number(payment.pay_amount) <= 0){
      throw new Error("invalid_crypto_amount");
    }

  }

  /* =========================================================
     REPLAY PROTECTION
  ========================================================= */

  async checkReplay(paymentId){

    const r = await this.db.query(`
      SELECT COUNT(*) FROM payments
      WHERE external_id=$1 AND status='completed'
    `,[paymentId]);

    if(Number(r.rows[0].count) > 0){
      throw new Error("replay_attack");
    }

  }

  /* =========================================================
     CONFIRM DEPOSIT (ULTRA SECURE)
  ========================================================= */

  async confirm({ paymentId, payload, ip }){

    const client = await this.db.connect();

    try{

      await client.query("BEGIN");

      /* ===== LOCK ===== */
      const r = await client.query(`
        SELECT * FROM payments
        WHERE external_id=$1
        FOR UPDATE
      `,[paymentId]);

      if(!r.rows.length){
        throw new Error("deposit_not_found");
      }

      const p = r.rows[0];

      /* ===== IDEMPOTENT ===== */
      if(p.status === "completed"){
        return { already:true };
      }

      /* ===== REPLAY CHECK ===== */
      await this.checkReplay(paymentId);

      /* ===== VALIDATE ===== */
      this.validateWebhook(payload, p);

      /* ===== USER ===== */
      const u = await client.query(`
        SELECT id, banned, frozen
        FROM users
        WHERE id=$1
        FOR UPDATE
      `,[p.user_id]);

      if(!u.rows.length){
        throw new Error("user_not_found");
      }

      if(u.rows[0].banned || u.rows[0].frozen){
        throw new Error("account_restricted");
      }

      /* ===== RISK CHECK ===== */
      await riskEngine.fullCheck({
        userId: p.user_id,
        amount: Number(payload.pay_amount),
        type: "deposit"
      });

      /* ===== CREDIT ===== */
      await ledger.credit({
        userId: p.user_id,
        asset: p.asset,
        amount: Number(payload.pay_amount),
        reason: "deposit",
        tx: client
      });

      /* ===== UPDATE ===== */
      await client.query(`
        UPDATE payments
        SET status='completed',
            confirmed_at=NOW(),
            meta = meta || $2
        WHERE id=$1
      `,[
        p.id,
        JSON.stringify({
          tx_hash: payload.tx_hash || null,
          ip,
          provider: "nowpayments"
        })
      ]);

      /* ===== AUDIT ===== */
      await client.query(`
        INSERT INTO audit_logs(user_id,action,meta)
        VALUES($1,$2,$3)
      `,[
        p.user_id,
        "deposit_confirmed",
        JSON.stringify({
          amount: payload.pay_amount,
          asset: p.asset,
          paymentId
        })
      ]);

      await client.query("COMMIT");

      /* ===== WS ===== */
      global.WS?.send(p.user_id,{
        type:"deposit_confirmed",
        amount: payload.pay_amount
      });

      return { success:true };

    }catch(e){

      await client.query("ROLLBACK");

      /* ===== FRAUD LOG ===== */
      try{
        await this.db.query(`
          INSERT INTO fraud_logs(user_id,reason)
          VALUES($1,$2)
        `,[null, e.message]);
      }catch{}

      throw e;

    }finally{
      client.release();
    }

  }

  /* =========================================================
     STATUS
  ========================================================= */

  async getStatus(paymentId){

    const r = await this.db.query(`
      SELECT status, amount, asset, created_at
      FROM payments
      WHERE external_id=$1
    `,[paymentId]);

    if(!r.rows.length){
      throw new Error("not_found");
    }

    return r.rows[0];

  }

}

module.exports = DepositEngine;
