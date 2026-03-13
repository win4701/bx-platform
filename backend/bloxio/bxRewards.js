const economy = require("../core/bxEconomy")

async function referralReward(userId){

await economy.rewardBX(userId,2,"referral")

}

module.exports={referralReward}
