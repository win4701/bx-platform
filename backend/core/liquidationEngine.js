"use strict";

class LiquidationEngine{

  check(position){

    const loss = (position.entry - position.price) * position.size;

    if(loss > position.margin){
      return true;
    }

    return false;

  }

}

module.exports = new LiquidationEngine();
