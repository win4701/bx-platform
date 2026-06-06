/*=========================================================
BLOXIO CASINO V3.3 - REALTIME + GAMES RUNTIME
Requires:
V3.1 Core Foundation
V3.2 UI Renderer
=========================================================*/
"use strict";

/*=========================================================
SOCKET ENGINE
=========================================================*/
export const SocketEngine={

socket:null,
connected:false,

connect(){

if(typeof io==="undefined"){
console.warn("[SOCKET] Missing");
return;
}

this.socket=io({
transports:[
"websocket",
"polling"
]
});

this.bind();

},

bind(){

if(!this.socket)return;

this.socket.on(
"connect",
()=>{
this.connected=true;
STATE.runtime.socket=true;
BUS.emit("socket:connected");
}
);

this.socket.on(
"disconnect",
()=>{
this.connected=false;
STATE.runtime.socket=false;
BUS.emit("socket:disconnected");
}
);

this.socket.on(
"casino:online",
count=>{
STATE.casino.onlinePlayers=count;
BUS.emit("online:update",count);
}
);

this.socket.on(
"casino:feed",
payload=>{

STATE.feeds.live.unshift(
payload
);

STATE.feeds.live=
STATE.feeds.live.slice(
0,
100
);

BUS.emit(
"feed:update",
payload
);

}
);

this.socket.on(
"casino:winner",
payload=>{

STATE.feeds.winners.unshift(
payload
);

STATE.feeds.winners=
STATE.feeds.winners.slice(
0,
100
);

BUS.emit(
"winner:update",
payload
);

}
);

this.socket.on(
"casino:bigwin",
payload=>{

STATE.feeds.bigWins.unshift(
payload
);

STATE.feeds.bigWins=
STATE.feeds.bigWins.slice(
0,
50
);

BUS.emit(
"bigwin:update",
payload
);

}
);

this.socket.on(
"casino:leaderboard",
rows=>{

STATE.casino.leaderboard=
rows;

BUS.emit(
"leaderboard:update",
rows
);

}
);

this.socket.on(
"casino:jackpot",
payload=>{

Object.assign(
STATE.casino.jackpots,
payload
);

BUS.emit(
"jackpot:update",
payload
);

}
);

this.socket.on(
"casino:tournaments",
payload=>{

STATE.casino.tournaments=
payload;

BUS.emit(
"tournament:update",
payload
);

}
);

this.socket.on(
"casino:rain",
payload=>{

BUS.emit(
"rain:update",
payload
);

}
);

},

emit(event,data={}){

if(!this.connected)
return;

this.socket.emit(
event,
data
);

}

};

/*=========================================================
LIVE FEED RUNTIME
=========================================================*/
export const FeedRuntime={

start(){

setInterval(()=>{

if(
SocketEngine.connected
)return;

const games=
Registry.all();

if(!games.length)
return;

const game=

games[
randomInt(
0,
games.length-1
)
];

STATE.feeds.live.unshift({

user:
"Player"+
randomInt(
1000,
9999
),

game:
game.name,

amount:
randomInt(
10,
5000
),

currency:
randomInt(0,1)
?"BX"
:"XBC"

});

STATE.feeds.live=
STATE.feeds.live.slice(
0,
50
);

BUS.emit(
"feed:update"
);

},3000);

}

};

/*=========================================================
BIG WINS RUNTIME
=========================================================*/
export const BigWinsRuntime={

start(){

setInterval(()=>{

const games=
Registry.all();

if(!games.length)
return;

const game=

games[
randomInt(
0,
games.length-1
)
];

const payload={

user:
"Whale"+
randomInt(
100,
999
),

game:
game.name,

amount:
randomInt(
1000,
50000
),

multiplier:
random(
5,
150
).toFixed(2)

};

STATE.feeds.bigWins.unshift(
payload
);

STATE.feeds.bigWins=
STATE.feeds.bigWins.slice(
0,
20
);

BUS.emit(
"bigwin:update",
payload
);

},12000);

}

};

/*=========================================================
JACKPOT RUNTIME
=========================================================*/
export const JackpotRuntime={

start(){

STATE.casino.jackpots={

crash:2500,
mines:1500,
plinko:4000,
wheel:1000,
slots:6000

};

setInterval(()=>{

for(
const key in
STATE.casino.jackpots
){

STATE.casino.jackpots[key]+=

randomInt(
1,
25
);

}

BUS.emit(
"jackpot:update"
);

},5000);

}

};

/*=========================================================
TOURNAMENT RUNTIME
=========================================================*/
export const TournamentRuntime={

start(){

STATE.casino.tournaments=[

{
id:"daily-bx",
name:"Daily BX Cup",
prize:5000,
players:0,
endsAt:
Date.now()+86400000
},

{
id:"xbc-masters",
name:"XBC Masters",
prize:15000,
players:0,
endsAt:
Date.now()+172800000
},

{
id:"vip-championship",
name:"VIP Championship",
prize:50000,
players:0,
endsAt:
Date.now()+259200000
}

];

BUS.emit(
"tournament:update"
);

}

};

/*=========================================================
RAIN RUNTIME
=========================================================*/
export const RainRuntime={

current:null,

create(){

this.current={

amount:
randomInt(
100,
10000
),

currency:
randomInt(0,1)
?"BX"
:"XBC",

players:0,

expires:
Date.now()+300000

};

BUS.emit(
"rain:update",
this.current
);

},

join(){

if(!this.current)
return;

this.current.players++;

BUS.emit(
"rain:joined",
this.current
);

}

};

/*=========================================================
LEADERBOARD RUNTIME
=========================================================*/
export const LeaderboardRuntime={

generate(){

const rows=[];

for(
let i=1;
i<=100;
i++
){

rows.push({

rank:i,

username:
"Player"+
randomInt(
1000,
9999
),

profit:
randomInt(
1000,
1000000
),

wagered:
randomInt(
10000,
10000000
)

});

}

STATE.casino.leaderboard=
rows;

BUS.emit(
"leaderboard:update",
rows
);

},

start(){

this.generate();

setInterval(
()=>this.generate(),
60000
);

}

};

/*=========================================================
CRASH GAME
=========================================================*/
export const CrashGame={

multiplier:1,
running:false,

start(){

this.running=true;
this.multiplier=1;

const tick=()=>{

if(!this.running)
return;

this.multiplier+=0.01;

BUS.emit(
"crash:update",
this.multiplier
);

requestAnimationFrame(
tick
);

};

tick();

},

cashout(){

this.running=false;

return this.multiplier;

},

stop(){

this.running=false;

}

};

/*=========================================================
MINES GAME
=========================================================*/
export const MinesGame={

createBoard(
tiles=25,
mines=3
){

const board=
Array(tiles)
.fill(false);

let count=0;

while(
count<mines
){

const index=
randomInt(
0,
tiles-1
);

if(board[index])
continue;

board[index]=true;
count++;

}

return board;

}

};

/*=========================================================
PLINKO GAME
=========================================================*/
export const PlinkoGame={

drop(){

const payouts=[
0.2,
0.5,
1,
2,
5,
10,
25
];

return payouts[
randomInt(
0,
payouts.length-1
)
];

}

};

/*=========================================================
WHEEL GAME
=========================================================*/
export const WheelGame={

spin(){

const sectors=[
1,
2,
3,
5,
10,
25
];

return sectors[
randomInt(
0,
sectors.length-1
)
];

}

};

/*=========================================================
DICE GAME
=========================================================*/
export const DiceGame={

roll(){

return randomInt(
1,
100
);

}

};

/*=========================================================
COINFLIP GAME
=========================================================*/
export const CoinflipGame={

flip(){

return Math.random()>0.5
?"heads"
:"tails";

}

};

/*=========================================================
LIMBO GAME
=========================================================*/
export const LimboGame={

roll(){

return Number(
random(
1,
1000
).toFixed(2)
);

}

};

/*=========================================================
HILO GAME
=========================================================*/
export const HiloGame={

draw(){

return randomInt(
1,
13
);

}

};

/*=========================================================
GAME FACTORY
=========================================================*/
export const GameFactory={

get(id){

switch(id){

case "crash":
return CrashGame;

case "mines":
return MinesGame;

case "plinko":
return PlinkoGame;

case "wheel":
return WheelGame;

case "dice":
return DiceGame;

case "coinflip":
return CoinflipGame;

case "limbo":
return LimboGame;

case "hilo":
return HiloGame;

default:
return null;

}

}

};

/*=========================================================
BET ENGINE
=========================================================*/
export const BetEngine={

place(amount){

amount=Number(amount);

if(
amount<
Currency.minBet()
){
return false;
}

if(
!Wallet.debit(
STATE.currency,
amount
)
){
return false;
}

Analytics.bet(
amount
);

BUS.emit(
"bet:placed",
{
amount,
currency:
STATE.currency
}
);

return true;

},

win(amount){

Wallet.credit(
STATE.currency,
amount
);

Analytics.win(
amount
);

BUS.emit(
"bet:won",
amount
);

},

lose(amount){

Analytics.loss(
amount
);

BUS.emit(
"bet:lost",
amount
);

}

};

/*=========================================================
REALTIME RUNTIME
=========================================================*/
export const RealtimeRuntime={

start(){

SocketEngine.connect();

FeedRuntime.start();

BigWinsRuntime.start();

JackpotRuntime.start();

TournamentRuntime.start();

LeaderboardRuntime.start();

console.log(
"[CASINO V3.3] REALTIME READY"
);

}

};
