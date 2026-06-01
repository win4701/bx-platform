/* =========================================================
   FILE: server/websocket/market.js
========================================================= */

module.exports=function(io){

setInterval(()=>{

io.emit(
"market:update",
{
pair:"BX/BTC",
price:Number(
(
0.00068+
Math.random()*0.00002
).toFixed(8)
),
change:Number(
(
Math.random()*4-2
).toFixed(2)
),
volume:Math.floor(
Math.random()*1000000
)
}
);

},1000);

};
