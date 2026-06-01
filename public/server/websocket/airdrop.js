/* =========================================================
   FILE: server/websocket/airdrop
========================================================= */

module.exports=function(io){

setInterval(()=>{

io.emit(
"airdrop:update",
{
reward:Number(
(
Math.random()*50
).toFixed(2)
),
tasks:
Math.floor(
Math.random()*20
),
time:Date.now()
}
);

},10000);

}; 
