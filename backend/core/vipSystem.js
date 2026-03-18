"use strict";

const VIP_LEVELS = [
  { level:0, name:"Bronze", min:0 },
  { level:1, name:"Silver", min:1000 },
  { level:2, name:"Gold", min:5000 },
  { level:3, name:"Platinum", min:20000 },
  { level:4, name:"Whale", min:100000 }
];

/* ========================================= */

function getVIP(totalWager){

  for(let i = VIP_LEVELS.length - 1; i >= 0; i--){
    if(totalWager >= VIP_LEVELS[i].min){
      return VIP_LEVELS[i];
    }
  }

  return VIP_LEVELS[0];
}

/* ========================================= */

function getBenefits(level){

  switch(level){

    case 0: return { rtp:0.92, bonus:0 };
    case 1: return { rtp:0.94, bonus:0.01 };
    case 2: return { rtp:0.95, bonus:0.02 };
    case 3: return { rtp:0.96, bonus:0.03 };
    case 4: return { rtp:0.97, bonus:0.05 };

    default: return { rtp:0.92 };
  }

}

module.exports = {
  getVIP,
  getBenefits
};
