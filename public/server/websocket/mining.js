/* =========================================================
   FILE: server/websocket/mining.js
========================================================= */

module.exports=function(io){

setInterval(()=>{

io.emit(
"mining:update",
{
miners:
Math.floor(
Math.random()*5000
),
hashrate:
Math.floor(
Math.random()*10000000
),
reward:
Number(
(
Math.random()*100
).toFixed(4)
)
}
);

},5000);

};
