"use strict";

const db = require("../database");

/* =========================================
CONFIG
========================================= */

const PRECISION = 1e8;

/* =========================================
UTILS
========================================= */

function toInt(amount){
  return Math.floor(Number(amount) * PRECISION);
}

function toFloat(amount){
  return Number(amount) / PRECISION;
}

/* =========================================
ENSURE BALANCE
========================================= */

async function ensureBalance(client, userId, asset){

  await client.query(`
    INSERT INTO wallet_balances (user_id,asset,balance)
    VALUES ($1,$2,0)
    ON CONFLICT (user_id,asset) DO NOTHING
  `,[userId,asset]);

}

/* =========================================
GET BALANCE
========================================= */

async function getBalance(userId, asset){

  const r = await db.query(`
    SELECT balance
    FROM wallet_balances
    WHERE user_id=$1 AND asset=$2
  `,[userId,asset]);

  if(!r.rows.length) return 0;

  return Number(r.rows[0].balance);

}

/* =========================================
CREDIT
========================================= */

async function credit({userId, asset, amount, reason}){

  if(amount <= 0) throw new Error("invalid_amount");

  const client = await db.pool.connect();

  try{

    await client.query("BEGIN");

    await ensureBalance(client, userId, asset);

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance + $1
      WHERE user_id=$2 AND asset=$3
    `,[amount, userId, asset]);

    await client.query(`
      INSERT INTO wallet_transactions
      (user_id,asset,amount,type,reason)
      VALUES($1,$2,$3,'credit',$4)
    `,[userId,asset,amount,reason]);

    await client.query("COMMIT");

  }catch(e){
    await client.query("ROLLBACK");
    throw e;
  }finally{
    client.release();
  }

}

/* =========================================
DEBIT
========================================= */

async function debit({userId, asset, amount, reason}){

  if(amount <= 0) throw new Error("invalid_amount");

  const client = await db.pool.connect();

  try{

    await client.query("BEGIN");

    await ensureBalance(client, userId, asset);

    const r = await client.query(`
      SELECT balance
      FROM wallet_balances
      WHERE user_id=$1 AND asset=$2
      FOR UPDATE
    `,[userId,asset]);

    const balance = Number(r.rows[0].balance);

    if(balance < amount){
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

    await client.query("COMMIT");

  }catch(e){
    await client.query("ROLLBACK");
    throw e;
  }finally{
    client.release();
  }

}

/* =========================================
TRANSFER (SAFE)
========================================= */

async function transfer({fromUser, toUser, asset, amount}){

  if(amount <= 0) throw new Error("invalid_amount");

  const client = await db.pool.connect();

  try{

    await client.query("BEGIN");

    await ensureBalance(client, fromUser, asset);
    await ensureBalance(client, toUser, asset);

    const r = await client.query(`
      SELECT balance
      FROM wallet_balances
      WHERE user_id=$1 AND asset=$2
      FOR UPDATE
    `,[fromUser,asset]);

    const balance = Number(r.rows[0].balance);

    if(balance < amount){
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

    await client.query(`
      INSERT INTO wallet_transactions
      (user_id,asset,amount,type,reason)
      VALUES($1,$2,$3,'transfer_out','transfer')
    `,[fromUser,asset,amount]);

    await client.query(`
      INSERT INTO wallet_transactions
      (user_id,asset,amount,type,reason)
      VALUES($1,$2,$3,'transfer_in','transfer')
    `,[toUser,asset,amount]);

    await client.query("COMMIT");

  }catch(e){
    await client.query("ROLLBACK");
    throw e;
  }finally{
    client.release();
  }

}

/* =========================================
TRADE (CRITICAL)
========================================= */

async function trade({userId, assetIn, assetOut, amountIn, amountOut}){

  const client = await db.pool.connect();

  try{

    await client.query("BEGIN");

    await ensureBalance(client, userId, assetIn);
    await ensureBalance(client, userId, assetOut);

    const r = await client.query(`
      SELECT balance
      FROM wallet_balances
      WHERE user_id=$1 AND asset=$2
      FOR UPDATE
    `,[userId,assetIn]);

    const balance = Number(r.rows[0].balance);

    if(balance < amountIn){
      throw new Error("insufficient_balance");
    }

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance - $1
      WHERE user_id=$2 AND asset=$3
    `,[amountIn,userId,assetIn]);

    await client.query(`
      UPDATE wallet_balances
      SET balance = balance + $1
      WHERE user_id=$2 AND asset=$3
    `,[amountOut,userId,assetOut]);

    await client.query(`
      INSERT INTO wallet_transactions
      (user_id,asset,amount,type,reason)
      VALUES($1,$2,$3,'trade_sell','market')
    `,[userId,assetIn,amountIn]);

    await client.query(`
      INSERT INTO wallet_transactions
      (user_id,asset,amount,type,reason)
      VALUES($1,$2,$3,'trade_buy','market')
    `,[userId,assetOut,amountOut]);

    await client.query("COMMIT");

  }catch(e){
    await client.query("ROLLBACK");
    throw e;
  }finally{
    client.release();
  }

}

/* =========================================
EXPORT
========================================= */

module.exports = {
  getBalance,
  credit,
  debit,
  transfer,
  trade
};
