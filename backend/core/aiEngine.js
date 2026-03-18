"use strict";

/* =========================================
STATE (PLAYER BRAINS)
========================================= */

const brains = new Map();

/* =========================================
GET / INIT BRAIN
========================================= */

function getBrain(userId){

  if(!brains.has(userId)){
    brains.set(userId,{
      bets: [],
      wins: 0,
      losses: 0,
      totalBet: 0,
      lastResults: [],
      sessionStart: Date.now()
    });
  }

  return brains.get(userId);
}

/* =========================================
RECORD GAME
========================================= */

function recordGame(userId, bet, win){

  const b = getBrain(userId);

  b.bets.push(bet);
  b.totalBet += bet;

  if(win){
    b.wins++;
    b.lastResults.push(1);
  }else{
    b.losses++;
    b.lastResults.push(0);
  }

  if(b.lastResults.length > 20){
    b.lastResults.shift();
  }

}

/* =========================================
PREDICTION ENGINE
========================================= */

function analyze(userId){

  const b = getBrain(userId);

  const total = b.wins + b.losses;

  if(total < 5){
    return {
      type:"new",
      confidence:0
    };
  }

  const winRate = b.wins / total;
  const avgBet = b.totalBet / total;

  const last = b.lastResults.slice(-5);

  let streak = "mixed";

  if(last.length === 5){
    if(last.every(x=>x===0)) streak = "losing";
    else if(last.every(x=>x===1)) streak = "winning";
  }

  return {
    type:"regular",
    winRate,
    avgBet,
    streak,
    confidence: Math.min(1, total / 50)
  };

}

/* =========================================
DECISION ENGINE
========================================= */

function decide(userId, baseRTP = 0.96){

  const p = analyze(userId);

  let rtp = baseRTP;

  /* new player boost */

  if(p.type === "new"){
    rtp += 0.03;
  }

  /* losing streak */

  if(p.streak === "losing"){
    rtp += 0.02;
  }

  /* winning streak */

  if(p.streak === "winning"){
    rtp -= 0.02;
  }

  /* high bettor */

  if(p.avgBet && p.avgBet > 500){
    rtp -= 0.01;
  }

  /* clamp */

  rtp = Math.max(0.85, Math.min(0.98, rtp));

  return {
    rtp,
    profile: p
  };

}

/* =========================================
SMART RESULT CONTROL
========================================= */

function shouldWin(userId, rtp){

  return Math.random() < rtp;
}

/* =========================================
EXPORT
========================================= */

module.exports = {
  getBrain,
  recordGame,
  analyze,
  decide,
  shouldWin
};
