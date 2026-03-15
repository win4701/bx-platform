const limits = {

maxBet:500,
maxWin:5000,
maxExposure:100000

}

let exposure = 0

function checkBet(bet){

if(bet > limits.maxBet){
throw new Error("BET_LIMIT_EXCEEDED")
}

}

function checkWin(win){

if(win > limits.maxWin){
throw new Error("WIN_LIMIT_EXCEEDED")
}

}

function updateExposure(amount){

exposure += amount

if(exposure > limits.maxExposure){

throw new Error("HOUSE_RISK_LIMIT")

}

}

module.exports = {

checkBet,
checkWin,
updateExposure

}
