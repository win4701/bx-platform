"use strict";

const config = require("./config");

class FeeEngine{

  calculate(amount, type){

    const rate = type === "maker"
      ? config.trading.fee.maker
      : config.trading.fee.taker;

    return amount * rate;
  }

}

module.exports = new FeeEngine();
