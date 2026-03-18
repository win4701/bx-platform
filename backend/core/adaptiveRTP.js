"use strict";

const { getVIP, getBenefits } = require("./vipSystem");
const whale = require("./whaleTracker");

/* ========================================= */

function getAdaptiveRTP(user){

  const vip = getVIP(user.total_wager || 0);
  const benefits = getBenefits(vip.level);

  let rtp = benefits.rtp;

  /* Whale control */

  if(whale.isWhale(user.id)){
    rtp -= 0.02; // تقليل الربح
  }

  /* Risk behavior */

  const risk = whale.getRiskLevel(user.id);

  if(risk === "high"){
    rtp -= 0.01;
  }

  if(risk === "low"){
    rtp += 0.01;
  }

  return Math.max(0.85, Math.min(0.98, rtp));
}

module.exports = {
  getAdaptiveRTP
};
