"use strict";

class PnLEngine{

  calculate(trades){

    let pnl = 0;

    trades.forEach(t=>{
      pnl += (t.sell_price - t.buy_price) * t.amount;
    });

    return pnl;

  }

}

module.exports = new PnLEngine();
