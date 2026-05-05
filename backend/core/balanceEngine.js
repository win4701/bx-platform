"use strict";

class BalanceEngine{

  constructor(walletRepo){
    this.wallet = walletRepo;
  }

  async lock(userId, asset, amount, tx){

    const b = await this.wallet.getBalance(userId, asset);

    if(b.balance < amount){
      throw new Error("insufficient_balance");
    }

    await this.wallet.lock(userId, asset, amount, tx);

  }

}

module.exports = BalanceEngine;
