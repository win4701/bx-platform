"use strict";

const whales = new Map();

/* ========================================= */

function track(userId, bet){

  if(!whales.has(userId)){
    whales.set(userId,{
      total:0,
      lastBets:[]
    });
  }

  const w = whales.get(userId);

  w.total += bet;
  w.lastBets.push(bet);

  if(w.lastBets.length > 20){
    w.lastBets.shift();
  }

}

/* ========================================= */

function isWhale(userId){

  const w = whales.get(userId);

  if(!w) return false;

  return w.total > 50000;
}

/* ========================================= */

function getRiskLevel(userId){

  const w = whales.get(userId);

  if(!w) return "low";

  const avg = w.lastBets.reduce((a,b)=>a+b,0) / w.lastBets.length;

  if(avg > 1000) return "high";
  if(avg > 200) return "medium";

  return "low";
}

module.exports = {
  track,
  isWhale,
  getRiskLevel
};
