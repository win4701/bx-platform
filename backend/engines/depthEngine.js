function calculateDepth(bids,asks){

let bidVolume=0
let askVolume=0

for(const b of bids){
bidVolume+=Number(b.amount)
}

for(const a of asks){
askVolume+=Number(a.amount)
}

return{

bidVolume,
askVolume

}

}

module.exports={calculateDepth}
