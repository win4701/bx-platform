"use strict";

/* =========================================================
   BLOXIO LEDGER ENGINE — ULTRA SECURE
========================================================= */

const db = require("./database");
const config = require("./config");

/* =========================================================
   HELPERS
========================================================= */

async function ensureBalance(client, userId, asset){

  await client.query(`
    INSERT INTO wallet_balances (user_id, asset, balance, locked)
    VALUES ($1,$2,0,0)
    ON CONFLICT (user_id,asset) DO NOTHING
  `,[userId,asset]);

}

function validateAmount(amount){
  if(!amount || amount <= 0){
    throw new Error("invalid_amount");
  }
}

/* =========================================================
   CREDIT (SAFE)
========================================================= */

async function credit({userId, asset, amount, reason="system", tx}){

  validateAmount(amount);

  const client = tx || db;

  await ensureBalance(client, userId, asset);

  await client.query(`
    UPDATE wallet_balances
    SET balance = balance + $1
    WHERE user_id=$2 AND asset=$3
  `,[amount,userId,asset]);

  await client.query(`
    INSERT INTO wallet_transactions
    (user_id,asset,amount,type,reason)
    VALUES($1,$2,$3,'credit',$4)
  `,[userId,asset,amount,reason]);

  global.WS?.send(userId,{
    type:"wallet_update"
  });

}

/* =========================================================
   DEBIT (SAFE)
========================================================= */

async function debit({userId, asset, amount, reason="system", tx}){

  validateAmount(amount);

  const client = tx || db;

  await ensureBalance(client, userId, asset);

  const r = await client.query(`
    SELECT balance FROM wallet_balances
    WHERE user_id=$1 AND asset=$2
    FOR UPDATE
  `,[userId,asset]);

  if(Number(r.rows[0].balance) < amount){
    throw new Error("insufficient_balance");
  }

  await client.query(`
    UPDATE wallet_balances
    SET balance = balance - $1
    WHERE user_id=$2 AND asset=$3
  `,[amount,userId,asset]);

  await client.query(`
    INSERT INTO wallet_transactions
    (user_id,asset,amount,type,reason)
    VALUES($1,$2,$3,'debit',$4)
  `,[userId,asset,amount,reason]);

}

/* =========================================================
   FREEZE
========================================================= */

async function freeze({userId, asset, amount, reason="order"}){

  validateAmount(amount);

  const client = await db.pool.connect();

  try{

    await client.query("BEGIN");

    await ensureBalance(client,userId,asset);

    const r = await client.query(`
      SELECT balance FROM wallet_balances
      WHERE user_id=$1 AND asset=$2
      FOR UPDATE
    `,[userId,asset]);

    if(Number(r.rows[0].balance) < amount){
      throw new Error("insufficient_balance");
    }

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance - $1,
          locked  = locked + $1
      WHERE user_id=$2 AND asset=$3
    `,[amount,userId,asset]);

    await client.query(`
      INSERT INTO wallet_transactions
      VALUES(DEFAULT,$1,$2,$3,'freeze',$4,NOW())
    `,[userId,asset,amount,reason]);

    await client.query("COMMIT");

  }catch(e){
    await client.query("ROLLBACK");
    throw e;
  }finally{
    client.release();
  }

}

/* =========================================================
   UNFREEZE
========================================================= */

async function unfreeze({userId, asset, amount, reason="release"}){

  validateAmount(amount);

  await db.query(`
    UPDATE wallet_balances
    SET balance = balance + $1,
        locked  = locked - $1
    WHERE user_id=$2 AND asset=$3
  `,[amount,userId,asset]);

}

/* =========================================================
   TRADE (🔥 FINAL ENGINE)
========================================================= */

async function trade({buyerId, sellerId, price, amount}){

  validateAmount(amount);

  const client = await db.pool.connect();

  try{

    await client.query("BEGIN");

    const value = price * amount;

    const takerFee = value * config.trading.fee.taker;

    /* ===== BUYER ===== */

    await ensureBalance(client,buyerId,"USDT");
    await ensureBalance(client,buyerId,"BX");

    await client.query(`
      UPDATE wallet_balances
      SET locked = locked - $1
      WHERE user_id=$2 AND asset='USDT'
    `,[value,buyerId]);

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance + $1
      WHERE user_id=$2 AND asset='BX'
    `,[amount,buyerId]);

    /* ===== SELLER ===== */

    await ensureBalance(client,sellerId,"BX");
    await ensureBalance(client,sellerId,"USDT");

    await client.query(`
      UPDATE wallet_balances
      SET locked = locked - $1
      WHERE user_id=$2 AND asset='BX'
    `,[amount,sellerId]);

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance + $1
      WHERE user_id=$2 AND asset='USDT'
    `,[value - takerFee,sellerId]);

    /* ===== FEES ===== */

    await client.query(`
      INSERT INTO fees(asset,amount,type)
      VALUES('USDT',$1,'trade')
    `,[takerFee]);

    /* ===== LOG ===== */

    await client.query(`
      INSERT INTO wallet_transactions
      VALUES(DEFAULT,$1,'USDT',$2,'trade_buy','market',NOW()),
             (DEFAULT,$1,'BX',$3,'trade_buy','market',NOW())
    `,[buyerId,value,amount]);

    await client.query(`
      INSERT INTO wallet_transactions
      VALUES(DEFAULT,$1,'BX',$2,'trade_sell','market',NOW()),
             (DEFAULT,$1,'USDT',$3,'trade_sell','market',NOW())
    `,[sellerId,amount,value]);

    await client.query("COMMIT");

    /* ===== WS ===== */
    global.WS?.send(buyerId,{type:"wallet_update"});
    global.WS?.send(sellerId,{type:"wallet_update"});

  }catch(e){

    await client.query("ROLLBACK");
    throw e;

  }finally{
    client.release();
  }

}

/* =========================================================
   TRANSFER
========================================================= */

async function transfer({fromUser, toUser, asset, amount}){

  validateAmount(amount);

  const client = await db.pool.connect();

  try{

    await client.query("BEGIN");

    await ensureBalance(client,fromUser,asset);
    await ensureBalance(client,toUser,asset);

    const r = await client.query(`
      SELECT balance FROM wallet_balances
      WHERE user_id=$1 AND asset=$2
      FOR UPDATE
    `,[fromUser,asset]);

    if(Number(r.rows[0].balance) < amount){
      throw new Error("insufficient_balance");
    }

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance - $1
      WHERE user_id=$2 AND asset=$3
    `,[amount,fromUser,asset]);

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance + $1
      WHERE user_id=$2 AND asset=$3
    `,[amount,toUser,asset]);

    await client.query("COMMIT");

    global.WS?.send(fromUser,{type:"wallet_update"});
    global.WS?.send(toUser,{type:"wallet_update"});

  }catch(e){
    await client.query("ROLLBACK");
    throw e;
  }finally{
    client.release();
  }

}

module.exports = {
  credit,
  debit,
  freeze,
  unfreeze,
  trade,
  transfer
};
