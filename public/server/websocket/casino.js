/* =========================================================
   FILE: server/websocket/casino.js
========================================================= */

const games=[
"Crash",
"Dice",
"Limbo",
"Plinko",
"Mines",
"Coinflip"
];

module.exports=function(io){

setInterval(()=>{

io.emit(
"casino:bet",
{
user:
`player${Math.floor(Math.random()*9999)}`,
game:
games[
Math.floor(
Math.random()*games.length
)
],
bet:Number(
(
Math.random()*500
).toFixed(2)
),
profit:Number(
(
Math.random()*2000
).toFixed(2)
),
time:Date.now()
}
);

},2500);

};
