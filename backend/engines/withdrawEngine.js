"use strict";

class WithdrawEngine{

  constructor(db){
    this.db = db;
  }

  /* =====================================================
     REQUEST WITHDRAW (USER)
  ===================================================== */

  async request({ userId, asset, amount, address, ip }){

    if(amount <= 0) throw new Error("invalid_amount");

    const client = await this.db.connect();

    try{

      await client.query("BEGIN");

      /* 🔒 LOCK USER */
      const u = await client.query(`
        SELECT id, banned, frozen
        FROM users
        WHERE id=$1
        FOR UPDATE
      `,[userId]);

      if(!u.rows.length) throw new Error("user_not_found");

      if(u.rows[0].banned || u.rows[0].frozen){
        throw new Error("account_blocked");
      }

      /* 🔒 LOCK BALANCE */
      const b = await client.query(`
        SELECT balance FROM wallet_balances
        WHERE user_id=$1 AND asset=$2
        FOR UPDATE
      `,[userId,asset]);

      const balance = Number(b.rows[0]?.balance || 0);

      if(balance < amount){
        throw new Error("insufficient_balance");
      }

      /* 💰 FREEZE (NOT REMOVE) */
      await client.query(`
        UPDATE wallet_balances
        SET balance = balance - $1,
            locked  = COALESCE(locked,0) + $1
        WHERE user_id=$2 AND asset=$3
      `,[amount,userId,asset]);

      /* 🧾 CREATE REQUEST */
      const w = await client.query(`
        INSERT INTO withdrawals
        (user_id,asset,amount,address,status,ip)
        VALUES($1,$2,$3,$4,'pending',$5)
        RETURNING id
      `,[userId,asset,amount,address,ip]);

      /* 📜 AUDIT */
      await client.query(`
        INSERT INTO audit_logs(user_id,action,meta)
        VALUES($1,$2,$3)
      `,[
        userId,
        "withdraw_request",
        JSON.stringify({amount,asset})
      ]);

      await client.query("COMMIT");

      return { withdrawId: w.rows[0].id };

    }catch(e){

      await client.query("ROLLBACK");
      throw e;

    }finally{
      client.release();
    }

  }

  /* =====================================================
     ADMIN APPROVE
  ===================================================== */

  async approve({ withdrawId, adminId }){

    const client = await this.db.connect();

    try{

      await client.query("BEGIN");

      const r = await client.query(`
        SELECT * FROM withdrawals
        WHERE id=$1
        FOR UPDATE
      `,[withdrawId]);

      if(!r.rows.length){
        throw new Error("withdraw_not_found");
      }

      const w = r.rows[0];

      if(w.status !== "pending"){
        throw new Error("already_processed");
      }

      /* 🔐 UPDATE STATUS */
      await client.query(`
        UPDATE withdrawals
        SET status='approved',
            approved_by=$2,
            approved_at=NOW()
        WHERE id=$1
      `,[withdrawId,adminId]);

      await client.query("COMMIT");

      return { success:true, withdraw:w };

    }catch(e){

      await client.query("ROLLBACK");
      throw e;

    }finally{
      client.release();
    }

  }

  /* =====================================================
     EXECUTE PAYOUT (SYSTEM ONLY)
  ===================================================== */

  async execute({ withdraw, payoutFn }){

    const client = await this.db.connect();

    try{

      await client.query("BEGIN");

      /* 🔒 LOCK AGAIN */
      const r = await client.query(`
        SELECT * FROM withdrawals
        WHERE id=$1
        FOR UPDATE
      `,[withdraw.id]);

      const w = r.rows[0];

      if(w.status !== "approved"){
        throw new Error("not_approved");
      }

      /* 💸 CALL PROVIDER */
      const payout = await payoutFn({
        address: w.address,
        amount: w.amount,
        currency: w.asset
      });

      /* 🔓 RELEASE LOCKED BALANCE */
      await client.query(`
        UPDATE wallet_balances
        SET locked = locked - $1
        WHERE user_id=$2 AND asset=$3
      `,[w.amount,w.user_id,w.asset]);

      /* ✅ COMPLETE */
      await client.query(`
        UPDATE withdrawals
        SET status='completed',
            tx_hash=$2,
            processed_at=NOW()
        WHERE id=$1
      `,[w.id,payout.payout_id]);

      await client.query("COMMIT");

      return { success:true };

    }catch(e){

      await client.query("ROLLBACK");

      /* 🔁 REFUND ON FAILURE */
      await this.refund(withdraw);

      throw e;

    }finally{
      client.release();
    }

  }

  /* =====================================================
     REFUND (FAIL SAFE)
  ===================================================== */

  async refund(withdraw){

    await this.db.query(`
      UPDATE wallet_balances
      SET balance = balance + $1,
          locked  = locked - $1
      WHERE user_id=$2 AND asset=$3
    `,[withdraw.amount,withdraw.user_id,withdraw.asset]);

    await this.db.query(`
      UPDATE withdrawals
      SET status='failed'
      WHERE id=$1
    `,[withdraw.id]);

  }

}

module.exports = WithdrawEngine;
