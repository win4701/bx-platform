"use strict";

const db = require("../database");

/* =========================================
UTILS
========================================= */

async function ensureBalance(client, userId, asset){

  await client.query(`
    INSERT INTO wallet_balances (user_id, asset, balance, locked)
    VALUES ($1,$2,0,0)
    ON CONFLICT (user_id,asset) DO NOTHING
  `,[userId,asset]);

}

/* =========================================
GET BALANCE
========================================= */

async function getBalance(userId, asset){

  const r = await db.query(`
    SELECT balance, locked
    FROM wallet_balances
    WHERE user_id=$1 AND asset=$2
  `,[userId,asset]);

  if(!r.rows.length) return { balance:0, locked:0 };

  return r.rows[0];

}

/* =========================================
FREEZE (🔥 مهم)
========================================= */

async function freeze({userId, asset, amount}){

  const client = await db.pool.connect();

  try{

    await client.query("BEGIN");

    await ensureBalance(client, userId, asset);

    const r = await client.query(`
      SELECT balance FROM wallet_balances
      WHERE user_id=$1 AND asset=$2
      FOR UPDATE
    `,[userId,asset]);

    const balance = Number(r.rows[0].balance);

    if(balance < amount){
      throw new Error("insufficient_balance");
    }

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance - $1,
          locked = locked + $1
      WHERE user_id=$2 AND asset=$3
    `,[amount,userId,asset]);

    await client.query(`
      INSERT INTO wallet_transactions
      (user_id,asset,amount,type,reason)
      VALUES($1,$2,$3,'freeze','order')
    `,[userId,asset,amount]);

    await client.query("COMMIT");

  }catch(e){
    await client.query("ROLLBACK");
    throw e;
  }finally{
    client.release();
  }

}

/* =========================================
UNFREEZE
========================================= */

async function unfreeze({userId, asset, amount}){

  await db.query(`
    UPDATE wallet_balances
    SET balance = balance + $1,
        locked = locked - $1
    WHERE user_id=$2 AND asset=$3
  `,[amount,userId,asset]);

}

/* =========================================
CREDIT
========================================= */

async function credit({userId, asset, amount, reason}){

  await db.query(`
    UPDATE wallet_balances
    SET balance = balance + $1
    WHERE user_id=$2 AND asset=$3
  `,[amount,userId,asset]);

}

/* =========================================
DEBIT
========================================= */

async function debit({userId, asset, amount}){

  const r = await db.query(`
    SELECT balance FROM wallet_balances
    WHERE user_id=$1 AND asset=$2
  `,[userId,asset]);

  if(Number(r.rows[0].balance) < amount){
    throw new Error("insufficient_balance");
  }

  await db.query(`
    UPDATE wallet_balances
    SET balance = balance - $1
    WHERE user_id=$2 AND asset=$3
  `,[amount,userId,asset]);

}

/* =========================================
TRADE (🔥 CORE)
========================================= */

async function trade({buyerId, sellerId, price, amount}){

  const client = await db.pool.connect();

  try{

    await client.query("BEGIN");

    const value = price * amount;

    /* ===== BUYER ===== */

    await ensureBalance(client, buyerId, "USDT");
    await ensureBalance(client, buyerId, "BX");

    await client.query(`
      UPDATE wallet_balances
      SET locked = locked - $1
      WHERE user_id=$2 AND asset='USDT'
    `,[value, buyerId]);

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance + $1
      WHERE user_id=$2 AND asset='BX'
    `,[amount, buyerId]);

    /* ===== SELLER ===== */

    await ensureBalance(client, sellerId, "BX");
    await ensureBalance(client, sellerId, "USDT");

    await client.query(`
      UPDATE wallet_balances
      SET locked = locked - $1
      WHERE user_id=$2 AND asset='BX'
    `,[amount, sellerId]);

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance + $1
      WHERE user_id=$2 AND asset='USDT'
    `,[value, sellerId]);

    /* ===== TRANSACTIONS ===== */

    await client.query(`
      INSERT INTO wallet_transactions
      (user_id,asset,amount,type,reason)
      VALUES
      ($1,'USDT',$2,'trade_buy','market'),
      ($1,'BX',$3,'trade_buy','market')
    `,[buyerId, value, amount]);

    await client.query(`
      INSERT INTO wallet_transactions
      (user_id,asset,amount,type,reason)
      VALUES
      ($1,'BX',$2,'trade_sell','market'),
      ($1,'USDT',$3,'trade_sell','market')
    `,[sellerId, amount, value]);

    await client.query("COMMIT");

  }catch(e){

    await client.query("ROLLBACK");
    throw e;

  }finally{
    client.release();
  }

}

/* =========================================
TRANSFER
========================================= */

async function transfer({fromUser, toUser, asset, amount}){

  const client = await db.pool.connect();

  try{

    await client.query("BEGIN");

    await ensureBalance(client, fromUser, asset);
    await ensureBalance(client, toUser, asset);

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

  }catch(e){
    await client.query("ROLLBACK");
    throw e;
  }finally{
    client.release();
  }

}

module.exports = {
  getBalance,
  credit,
  debit,
  transfer,
  trade,
  freeze,
  unfreeze
};
