function now(){

return new Date()

}

function toNumber(v){

return Number(v)||0

}

function sleep(ms){

return new Promise(r=>setTimeout(r,ms))

}

module.exports = {

now,
toNumber,
sleep

}
