"use strict";

const casinoWS = require("../ws/casinoWS");

/* =========================================
STATE
========================================= */

const recentBets = [];
const MAX_BETS = 50;

/* =========================================
HELPER
========================================= */

function pushBet(data){

  recentBets.unshift(data);

  if(recentBets.length > MAX_BETS){
    recentBets.pop();
  }

}

/* =========================================
BROADCAST BET
========================================= */

function broadcastBet(user, game, bet){

  const data = {
    type: "bet",
    user,
    game,
    bet: Number(bet),
    time: Date.now()
  };

  pushBet(data);

  casinoWS.broadcast(data);

}

/* =========================================
BROADCAST WIN
========================================= */

function broadcastWin(user, game, payout, multiplier = null){

  const data = {
    type: "win",
    user,
    game,
    payout: Number(payout),
    multiplier,
    time: Date.now()
  };

  pushBet(data);

  casinoWS.broadcast(data);

  /* BIG WIN */

  if(payout >= 50){

    casinoWS.broadcast({
      type: "big_win",
      user,
      game,
      payout,
      time: Date.now()
    });

    console.log("💰 BIG WIN:", user, payout);

  }

}

/* =========================================
GET RECENT
========================================= */

function getRecentBets(){
  return recentBets;
}

/* =========================================
EXPORT
========================================= */

module.exports = {
  broadcastBet,
  broadcastWin,
  getRecentBets
};
