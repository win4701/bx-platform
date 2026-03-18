"use strict";

const wsHub = require("../ws/wsHub");

const players = [
  { name:"alex", level:"normal" },
  { name:"proTrader", level:"pro" },
  { name:"whale", level:"high" }
];

function rand(min,max){
  return Math.random()*(max-min)+min;
}

function pick(){
  return players[Math.floor(Math.random()*players.length)];
}

/* ========================================= */

function simulate(){

  const p = pick();

  let bet = rand(1,50);
  let win = Math.random();

  if(p.level === "high"){
    bet = rand(50,200);
  }

  /* behavior */

  if(win > 0.7){

    wsHub.broadcast("casino",{
      type:"cashout",
      user:p.name,
      payout:bet * rand(1.5,3)
    });

  }else{

    wsHub.broadcast("casino",{
      type:"player_join",
      user:p.name,
      bet
    });

  }

}

/* ========================================= */

function startSmartBots(){

  setInterval(simulate, 1200);

}

module.exports = {
  startSmartBots
};
