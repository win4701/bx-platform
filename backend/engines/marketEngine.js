"use strict";

/* =========================================================
   BXS MARKET ENGINE — ENTERPRISE EXCHANGE CORE
========================================================= */

const db =
  require("../database");

const redis =
  require("../core/redis");

const ledger =
  require("../core/ledger");

const ws =
  require("../ws/wsHub");

const candle =
  require("../trading/candleEngine");

/* =========================================================
   CONFIG
========================================================= */

const DEFAULT_PAIR =
  "BX_USDT";

const MAKER_FEE = 0.001;

const TAKER_FEE = 0.002;

/* =========================================================
   UTILS
========================================================= */

function num(v){

  const n = Number(v);

  return Number.isFinite(n)
    ? n
    : null;

}

/* =========================================================
   PRICE
========================================================= */

async function getPrice(

  pair = DEFAULT_PAIR

){

  const cached =
    await redis.getCache(
      `price:${pair}`
    );

  if(cached){
    return cached;
  }

  const r =
    await db.query(`
      SELECT price
      FROM trades
      WHERE pair=$1
      ORDER BY id DESC
      LIMIT 1
    `,[pair]);

  const price =
    r.rows.length
      ? Number(r.rows[0].price)
      : 45;

  await redis.setCache(

    `price:${pair}`,

    price,

    5

  );

  return price;

}

/* =========================================================
   PLACE ORDER
========================================================= */

async function placeOrder({

  userId,
  side,
  price,
  amount,
  pair

}){

  pair =
    pair ||
    DEFAULT_PAIR;

  if(
    !["buy","sell"]
    .includes(side)
  ){
    throw new Error(
      "invalid_side"
    );
  }

  price = num(price);
  amount = num(amount);

  if(!price || price <= 0){
    throw new Error(
      "invalid_price"
    );
  }

  if(!amount || amount <= 0){
    throw new Error(
      "invalid_amount"
    );
  }

  /* =====================================
     FREEZE
  ===================================== */

  if(side === "buy"){

    await ledger.freeze({

      userId,

      asset:"USDT",

      amount:
        price * amount

    });

  }else{

    await ledger.freeze({

      userId,

      asset:"BX",

      amount

    });

  }

  /* =====================================
     TRANSACTION
  ===================================== */

  const client =
    await db.connect();

  try{

    await client.query(
      "BEGIN"
    );

    const r =
      await client.query(`
        INSERT INTO orders
        (
          pair,
          side,
          price,
          amount,
          remaining,
          user_id,
          status,
          created_at
        )
        VALUES(
          $1,$2,$3,$4,$4,
          $5,'open',NOW()
        )
        RETURNING *
      `,[

        pair,
        side,
        price,
        amount,
        userId

      ]);

    const order =
      r.rows[0];

    /* ===================================
       MATCH
    =================================== */

    await match(order);

    await client.query(
      "COMMIT"
    );

    return order;

  }catch(e){

    await client.query(
      "ROLLBACK"
    );

    throw e;

  }finally{

    client.release();

  }

}

/* =========================================================
   MATCH ENGINE
========================================================= */

async function match(order){

  const opposite =
    order.side === "buy"
      ? "sell"
      : "buy";

  const operator =
    order.side === "buy"
      ? "<="
      : ">=";

  const r =
    await db.query(`
      SELECT *
      FROM orders
      WHERE pair=$1
      AND side=$2
      AND price ${operator} $3
      AND remaining > 0
      AND status='open'
      ORDER BY price
      LIMIT 50
    `,[

      order.pair,

      opposite,

      order.price

    ]);

  let remaining =
    Number(order.remaining);

  for(const maker of r.rows){

    if(remaining <= 0){
      break;
    }

    const makerRemain =
      Number(
        maker.remaining
      );

    const fill =
      Math.min(
        remaining,
        makerRemain
      );

    const price =
      Number(maker.price);

    /* ===================================
       FEES
    =================================== */

    const makerFee =
      fill *
      MAKER_FEE;

    const takerFee =
      fill *
      TAKER_FEE;

    /* ===================================
       SETTLEMENT
    =================================== */

    await settle({

      taker:order,

      maker,

      fill,

      price,

      makerFee,

      takerFee

    });

    remaining -= fill;

    await db.query(`
      UPDATE orders
      SET
        remaining =
          remaining - $1,

        status =
          CASE
            WHEN remaining - $1 <= 0
            THEN 'filled'
            ELSE 'partial'
          END
      WHERE id=$2
    `,[

      fill,

      maker.id

    ]);

  }

  await db.query(`
    UPDATE orders
    SET
      remaining=$1,

      status=
        CASE
          WHEN $1 <= 0
          THEN 'filled'
          ELSE 'partial'
        END
    WHERE id=$2
  `,[

    remaining,

    order.id

  ]);

}

/* =========================================================
   SETTLEMENT
========================================================= */

async function settle({

  taker,
  maker,
  fill,
  price,

  makerFee,
  takerFee

}){

  const total =
    fill * price;

  /* =====================================
     BUYER/SELLER
  ===================================== */

  const buyer =
    taker.side === "buy"
      ? taker.user_id
      : maker.user_id;

  const seller =
    taker.side === "sell"
      ? taker.user_id
      : maker.user_id;

  /* =====================================
     TRANSFER BX
  ===================================== */

  await ledger.transfer({

    fromUser:seller,

    toUser:buyer,

    asset:"BX",

    amount:
      fill - takerFee

  });

  /* =====================================
     TRANSFER USDT
  ===================================== */

  await ledger.transfer({

    fromUser:buyer,

    toUser:seller,

    asset:"USDT",

    amount:
      total - makerFee

  });

  /* =====================================
     TRADE SAVE
  ===================================== */

  await db.query(`
    INSERT INTO trades
    (
      pair,
      price,
      amount,
      maker_id,
      taker_id,
      created_at
    )
    VALUES(
      $1,$2,$3,$4,$5,NOW()
    )
  `,[

    taker.pair,

    price,

    fill,

    maker.user_id,

    taker.user_id

  ]);

  /* =====================================
     MARKET PRICE
  ===================================== */

  await redis.setCache(

    `price:${taker.pair}`,

    price,

    5

  );

  /* =====================================
     CANDLES
  ===================================== */

  await candle.updateCandle({

    pair:taker.pair,

    price,

    amount:fill

  });

  /* =====================================
     REALTIME
  ===================================== */

  await ws.publish(

    `market:${taker.pair}`,

    {

      type:"trade",

      pair:taker.pair,

      price,

      amount:fill

    }

  );

}

/* =========================================================
   MARKET ORDER
========================================================= */

async function marketOrder({

  userId,
  side,
  amount,
  pair

}){

  pair =
    pair ||
    DEFAULT_PAIR;

  const price =
    await getPrice(pair);

  return placeOrder({

    userId,

    side,

    price,

    amount,

    pair

  });

}

/* =========================================================
   ORDERBOOK
========================================================= */

async function orderbook(

  pair = DEFAULT_PAIR

){

  const bids =
    await db.query(`
      SELECT
        price,
        SUM(remaining)
          as amount
      FROM orders
      WHERE pair=$1
      AND side='buy'
      AND remaining > 0
      GROUP BY price
      ORDER BY price DESC
      LIMIT 50
    `,[pair]);

  const asks =
    await db.query(`
      SELECT
        price,
        SUM(remaining)
          as amount
      FROM orders
      WHERE pair=$1
      AND side='sell'
      AND remaining > 0
      GROUP BY price
      ORDER BY price ASC
      LIMIT 50
    `,[pair]);

  return {

    pair,

    bids:bids.rows,

    asks:asks.rows

  };

}

/* =========================================================
   CANCEL
========================================================= */

async function cancelOrder({

  userId,
  orderId

}){

  const r =
    await db.query(`
      SELECT *
      FROM orders
      WHERE id=$1
      AND user_id=$2
      AND remaining > 0
    `,[

      orderId,
      userId

    ]);

  if(!r.rows.length){

    throw new Error(
      "order_not_found"
    );

  }

  const o = r.rows[0];

  /* =====================================
     UNFREEZE
  ===================================== */

  if(o.side === "buy"){

    await ledger.unfreeze({

      userId,

      asset:"USDT",

      amount:
        o.remaining *
        o.price

    });

  }else{

    await ledger.unfreeze({

      userId,

      asset:"BX",

      amount:o.remaining

    });

  }

  await db.query(`
    UPDATE orders
    SET
      remaining=0,
      status='cancelled'
    WHERE id=$1
  `,[orderId]);

  return {

    success:true

  };

}

/* =========================================================
   STATS
========================================================= */

async function stats(

  pair = DEFAULT_PAIR

){

  const r =
    await db.query(`
      SELECT
        COUNT(*) trades,
        SUM(amount) volume,
        MAX(price) high,
        MIN(price) low
      FROM trades
      WHERE pair=$1
      AND created_at >
        NOW() -
        INTERVAL '24 hours'
    `,[pair]);

  const price =
    await getPrice(pair);

  return {

    pair,

    price,

    volume:Number(
      r.rows[0].volume || 0
    ),

    high:Number(
      r.rows[0].high || price
    ),

    low:Number(
      r.rows[0].low || price
    ),

    trades:Number(
      r.rows[0].trades || 0
    )

  };

}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {

  placeOrder,

  marketOrder,

  orderbook,

  cancelOrder,

  getPrice,

  stats

};
