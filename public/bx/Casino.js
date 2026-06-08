/*=========================================================
BLOXIO CASINO V3.1 - CORE FOUNDATION
=========================================================*/
"use strict";

/*=========================================================
IMPORTS
=========================================================*/
import {CASINO_GAMES} from "./data/games.js";
import {COINS} from "./data/coins.js";

/*=========================================================
HELPERS
=========================================================*/
const $=(s,p=document)=>p.querySelector(s);
const $$=(s,p=document)=>[...p.querySelectorAll(s)];
const clamp=(n,min,max)=>Math.min(Math.max(n,min),max);
const random=(min,max)=>Math.random()*(max-min)+min;
const randomInt=(min,max)=>Math.floor(random(min,max+1));
const uid=()=>crypto.randomUUID?.()||Math.random().toString(36).slice(2);
const now=()=>Date.now();

/*=========================================================
STORAGE
=========================================================*/
const STORAGE={
APP:"bloxio_casino",
STATE:"bloxio_casino_state",
SETTINGS:"bloxio_casino_settings",
WALLET:"bloxio_wallet",
ANALYTICS:"bloxio_casino_analytics",
HISTORY:"bloxio_casino_history"
};

/*=========================================================
EVENT BUS
=========================================================*/
class EventBus{
constructor(){
this.events=new Map();}

on(event,callback){
if(!this.events.has(event)){
this.events.set(event,[]);
}
this.events.get(event).push(callback);
return()=>this.off(event,callback);
}

off(event,callback){
if(!this.events.has(event))return;
const list=this.events.get(event);
this.events.set(event,
list.filter(fn=>fn!==callback));}

emit(event,payload){
if(!this.events.has(event))return;
for(const callback of this.events.get(event)){
try{
callback(payload);}catch(error){
console.error(`[BUS:${event}]`,error);}}
}

clear(){
this.events.clear();}}

export const BUS=new EventBus();

/*=========================================================
STATE
=========================================================*/
export const STATE={
ready:false,
booted:false,
version:"3.1.0",
currency:"BX",
online:false,
activeGame:null,
activeView:"lobby",

wallet:{BX:0,XBC:0},

user:{
id:null,
username:null,
vip:0,
level:1,
verified:false
},

casino:{
onlinePlayers:0,
games:[],
featured:[],
jackpots:{},
leaderboard:[],
tournaments:[],
providers:[]
},

filters:{
search:"",
category:"all",
provider:"all"
},

feeds:{
live:[],
winners:[],
bigWins:[]
},

analytics:{
wagered:0,
won:0,
lost:0,
profit:0,
bets:0,
wins:0,
losses:0
},

runtime:{
socket:false,
pixi:false,
audio:false,
charts:false
}};

/*=========================================================
SETTINGS
=========================================================*/
export const Settings={
sound:true,
music:false,
animations:true,
currency:"BX",
theme:"dark",

save(){
localStorage.setItem(
STORAGE.SETTINGS,JSON.stringify({
sound:this.sound,music:this.music,
animations:this.animations,
currency:this.currency,
theme:this.theme}));
},

load(){
try{
const data=JSON.parse(
localStorage.getItem(STORAGE.SETTINGS)||"{}"
);
Object.assign(this,data);
}catch(error){
console.warn("[SETTINGS]",error);}}};

/*=========================================================
PERSISTENCE
=========================================================*/
export const Persistence={

saveState(){
localStorage.setItem(
STORAGE.STATE,JSON.stringify({
currency:STATE.currency,
analytics:STATE.analytics}));
},

loadState(){
try{
const data=JSON.parse(
localStorage.getItem(STORAGE.STATE)||"{}");

if(data.currency){
STATE.currency=data.currency;}

if(data.analytics){
STATE.analytics=data.analytics;}

}catch(error){
console.warn("[STATE]",error);}},

saveWallet(){
localStorage.setItem(
STORAGE.WALLET,
JSON.stringify(STATE.wallet));},

loadWallet(){
try{
const data=JSON.parse(
localStorage.getItem(STORAGE.WALLET)||"{}");

STATE.wallet.BX=Number(data.BX||0);
STATE.wallet.XBC=Number(data.XBC||0);

}catch(error){
console.warn("[WALLET]",error);}}};

/*=========================================================
WALLET ENGINE
=========================================================*/
export const Wallet={

get(currency=STATE.currency){
return Number(
STATE.wallet[currency]||0);},

set(currency,value){
STATE.wallet[currency]=Number(
value||0);

Persistence.saveWallet();

BUS.emit("wallet:update",STATE.wallet);

return true;},

credit(currency,amount){
amount=Number(amount||0);

STATE.wallet[currency]+=amount;

Persistence.saveWallet();

BUS.emit("wallet:update",STATE.wallet);

return true;},

debit(currency,amount){
amount=Number(amount||0);

if(STATE.wallet[currency]<amount){
return false;}

STATE.wallet[currency]-=amount;

Persistence.saveWallet();

BUS.emit("wallet:update",STATE.wallet);
return true;
}};

/*=========================================================
CURRENCY ENGINE
=========================================================*/
export const Currency={

supported:["BX","XBC"],

set(currency){

if(!this.supported.includes(currency)
){
return false;
}

STATE.currency=currency;
Settings.currency=currency;
Settings.save();

BUS.emit("currency:change",currency);

return true;},

get(){return STATE.currency;},

minBet(){
return STATE.currency==="XBC"?10:0.1;}};

/*=========================================================
GAME REGISTRY
=========================================================*/
export const Registry={

games:[],

init(){

this.games=
Array.isArray(CASINO_GAMES)?CASINO_GAMES:[];

STATE.casino.games=this.games;

STATE.casino.featured=
this.games.filter(game=>game.featured);

STATE.casino.providers=[...new Set(
this.games.map(g=>g.provider||"BLOXIO"))];
},

all(){return this.games;},

featured(){
return STATE.casino.featured;
},

get(id){
return this.games.find(
game=>game.id===id);
},

search(term=""){term=term.toLowerCase();

return this.games.filter(game=>
game.name?.toLowerCase().includes(term)||
game.category?.toLowerCase().includes(term)||
game.provider?.toLowerCase().includes(term)
);},

category(category){

if(category==="all"){
return this.games;}

return this.games.filter(
game=>game.category===category);},

provider(provider){

if(provider==="all"){return this.games;}

return this.games.filter(game=>game.provider===provider);}};

/*=========================================================
ANALYTICS
=========================================================*/
export const Analytics={

bet(amount){
STATE.analytics.bets++;
STATE.analytics.wagered+=
Number(amount||0);},

win(amount){
STATE.analytics.wins++;
STATE.analytics.won+=
Number(amount||0);
},

loss(amount){
STATE.analytics.losses++;
STATE.analytics.lost+=
Number(amount||0);
},

recalculate(){

STATE.analytics.profit=
STATE.analytics.won-
STATE.analytics.lost;

Persistence.saveState();}};

/*=========================================================
CASINO CORE
=========================================================*/
export const CasinoCore={

boot(){

if(STATE.booted){return;}

Settings.load();
Persistence.loadState();
Persistence.loadWallet();

Registry.init();

STATE.currency=
Settings.currency||"BX";

STATE.booted=true;
BUS.emit("core:booted",STATE);
console.log("[CASINO V3.1] BOOTED");},

start(){

if(STATE.ready){return;}

this.boot();

STATE.ready=true;
BUS.emit("casino:ready",STATE);
console.log("[CASINO V3.1] READY");},

destroy(){

BUS.clear();
STATE.ready=false;
STATE.booted=false;
}};

/*=========================================================
GLOBALS
=========================================================*/
window.CasinoCore=CasinoCore;
window.CasinoState=STATE;
window.CasinoWallet=Wallet;
window.CasinoRegistry=Registry;
window.CasinoBus=BUS;

/*=========================================================
BLOXIO CASINO V3.2 - UI RENDERER
Requires: V3.1 Core Foundation
=========================================================*/

export const DOM={
gamesGrid:$("#casinoGamesGrid"),
featuredTrack:$("#casinoFeaturedTrack"),
searchInput:$("#casinoSearch"),
gameView:$("#casinoGameView"),
gameContainer:$("#casinoGameContainer"),
leaderboard:$("#casinoLeaderboard"),
leaderboardTop3:$("#casinoLeaderboardTop3"),
liveFeed:$("#casinoTickerTrack"),
liveWinners:$("#casinoLiveWinners"),
winnerTrack:$("#casinoLiveWinnerTrack"),
tournaments:$("#casinoTournamentList"),
tournamentCountdown:$("#casinoTournamentCountdown"),
bigWins:$("#bigWinsTrack"),
bigWinStats:$("#casinoBigWinStats"),
bxBalance:$("#casinoBXBalance"),
xbcBalance:$("#casinoXBCBalance"),
gamesCount:$("#casinoGamesCount"),
onlinePlayers:$("#casinoOnlineText"),
volume:$("#casinoVolumeText"),
catOriginals:$("#catOriginals"),
catArcade:$("#catArcade"),
catCards:$("#catCards"),
catSlots:$("#catSlots"),
catRoulette:$("#catRoulette"),
jackpotCrash:$("#jackpotCrash"),
jackpotMines:$("#jackpotMines"),
jackpotPlinko:$("#jackpotPlinko"),
jackpotWheel:$("#jackpotWheel")
};

/*=========================================================
TEMPLATES
=========================================================*/
export const Templates={

game(game){
return`
<button class="casino-game-card"
data-game="${game.id}"
data-category="${game.category||"all"}">

<div class="casino-game-cover">
<img
loading="lazy"
src="${game.image}"
alt="${game.name}">
</div>

<div class="casino-game-body">

<h3>${game.name}</h3>

<p>${game.provider||"BLOXIO"}</p>

<div class="casino-game-meta">

<span>${game.category||"casino"}</span>

<span>RTP ${game.rtp||99}%</span>

</div>
</div>

</button>`;},

featured(game){
return`
<button
class="casino-featured-card"
data-game="${game.id}">

<img
loading="lazy"
src="${game.image}"
alt="${game.name}">

<div>

<h4>${game.name}</h4>

<p>${game.provider||"BLOXIO"}</p>

</div>

</button>`;},

feed(row){
return`
<div class="feed-row">

<span>${row.user}</span>
<span>${row.game}</span>

<strong>${row.amount}${row.currency||"BX"}</strong>
</div>
`;
},

winner(row){
return`
<div class="winner-row">

<span>${row.user}</span>
<span>${row.game}</span>

<strong>${row.amount}${row.currency||"BX"}</strong>
</div>
`;
},

leaderboard(row){
return`
<div class="leaderboard-row">

<span>#${row.rank}</span>
<span>${row.username}</span>

<strong>${row.profit}</strong>

</div>
`;
},

tournament(row){
return`
<div class="tournament-card">

<h4>${row.name}</h4>

<p>Prize: ${row.prize}</p>
<p>Players: ${row.players||0}</p>

</div>
`;}

};

/*=========================================================
VIRTUAL LIST
=========================================================*/
export const VirtualList={

render(root,items,renderer){

if(!root)return;

root.innerHTML=
items
.map(renderer)
.join("");

}

};

/*=========================================================
WALLET UI
=========================================================*/
export const WalletUI={

update(){

if(DOM.bxBalance){

DOM.bxBalance.textContent=Wallet
.get("BX")
.toFixed(4);

}

if(DOM.xbcBalance){

DOM.xbcBalance.textContent=Wallet
.get("XBC")
.toFixed(2);

}}};

BUS.on("wallet:update",()=>WalletUI.update());

/*=========================================================
CATEGORY UI
=========================================================*/
export const CategoryUI={

update(){

const games=
Registry.all();

const count=name=>

games.filter(
g=>g.category===name
).length;

if(DOM.catOriginals){

DOM.catOriginals.textContent=count("originals");}

if(DOM.catArcade){

DOM.catArcade.textContent=count("arcade");}

if(DOM.catCards){

DOM.catCards.textContent=count("cards");}

if(DOM.catSlots){

DOM.catSlots.textContent= count("slots");}

if(DOM.catRoulette){

DOM.catRoulette.textContent=count("roulette");}}

};

/*=========================================================
GAMES UI
=========================================================*/
export const GamesUI={

render(
games=Registry.all()){

VirtualList.render(DOM.gamesGrid,games,Templates.game);

},

refresh(){this.render();}

};

/*=========================================================
FEATURED UI
=========================================================*/
export const FeaturedUI={

render(){

VirtualList.render(
DOM.featuredTrack,
Registry.featured(),
Templates.featured
);}

};

/*=========================================================
SEARCH UI
=========================================================*/
export const SearchUI={

init(){

if(!DOM.searchInput)
return;

DOM.searchInput.addEventListener("input",

event=>{

const value=
event.target
.value
.trim();

STATE.filters.search=value;

GamesUI.render(
Registry.search(value));});}

};

/*=========================================================
FILTER UI
=========================================================*/
export const FilterUI={

init() {$$(".casino-filter-btn")

.forEach(btn=>{

btn.addEventListener("click",()=>{
$$(".casino-filter-btn")

.forEach(b=>b.classList.remove("active"));

btn.classList.add("active");

const category=btn.dataset.tab;

STATE.filters.category=category;

GamesUI.render(Registry.category(category));}

);});

}};

/*=========================================================
GAME VIEW
=========================================================*/
export const GameView={

open(id){

const game=
Registry.get(id);

if(!game)
return;

STATE.activeGame=game.id;

DOM.gameView?.classList.remove("hidden");

DOM.gameContainer.innerHTML=`

<div class="casino-active-view">
<div class="casino-active-header">

<h2>${game.name}</h2>

<button id="closeGame">Close</button>

</div>

<div id="casinoRuntime">
</div>
</div>

`;

BUS.emit("game:open",game);},

close(){

STATE.activeGame=
null;

DOM.gameView?.classList.add("hidden");

if(DOM.gameContainer){

DOM.gameContainer.innerHTML="";}}

};

/*=========================================================
CLICK ROUTER
=========================================================*/
export const ClickRouter={

init(){

document.addEventListener("click",

event=>{

const game=

event.target.closest(".casino-game-card");

if(game){

GameView.open(
game.dataset.game);

}

const featured=

event.target.closest(".casino-featured-card");

if(featured){

GameView.open(
featured.dataset.game);}

if(event.target.id==="closeGame"
){GameView.close();}}

);}};

/*=========================================================
LIVE FEED UI
=========================================================*/
export const FeedUI={

render(){

VirtualList.render(
DOM.liveFeed,
STATE.feeds.live,
Templates.feed);}};

BUS.on("feed:update",()=>FeedUI.render());

/*=========================================================
WINNERS UI
=========================================================*/
export const WinnersUI={

render(){

VirtualList.render(
DOM.liveWinners,
STATE.feeds.winners,
Templates.winner);}};

BUS.on("winner:update",()=>WinnersUI.render());

/*=========================================================
LEADERBOARD UI
=========================================================*/
export const LeaderboardUI={

render(){

VirtualList.render(
DOM.leaderboard,
STATE.casino.leaderboard,
Templates.leaderboard);}

};

BUS.on(
"leaderboard:update",
()=>LeaderboardUI.render()
);

/*=========================================================
TOURNAMENT UI
=========================================================*/
export const TournamentUI={

render(){

VirtualList.render(
DOM.tournaments,
STATE.casino.tournaments,
Templates.tournament);}

};

BUS.on("tournament:update",()=>TournamentUI.render());

/*=========================================================
JACKPOT UI
=========================================================*/
export const JackpotUI={

update(){

const jp=
STATE.casino.jackpots;

if(DOM.jackpotCrash){

DOM.jackpotCrash.textContent=
(jp.crash||0).toFixed(0);

}

if(DOM.jackpotMines){

DOM.jackpotMines.textContent=
(jp.mines||0).toFixed(0);

}

if(DOM.jackpotPlinko){

DOM.jackpotPlinko.textContent=
(jp.plinko||0).toFixed(0);

}

if(DOM.jackpotWheel){

DOM.jackpotWheel.textContent=
(jp.wheel||0).toFixed(0);

}}

};

BUS.on("jackpot:update",()=>JackpotUI.update());

/*=========================================================
STATS UI
=========================================================*/
export const StatsUI={

update(){

if(DOM.gamesCount){

DOM.gamesCount.textContent=Registry.all().length;

}

if(DOM.onlinePlayers){

DOM.onlinePlayers.textContent=
STATE.casino.onlinePlayers;}}

};

/*=========================================================
GSAP BRIDGE
=========================================================*/
export const AnimationUI={

enabled(){return typeof gsap!=="undefined";},

cards(){

if(!this.enabled())
return;

gsap.from(".casino-game-card",
{
opacity:0,y:30,
duration:0.4,
stagger:0.02});},

featured(){

if(!this.enabled())
return;

gsap.from(".casino-featured-card",
{
opacity:0,
scale:0.9,
duration:0.5,
stagger:0.05
});}};

/*=========================================================
PIXI BRIDGE
=========================================================*/
export const PixiBridge={

create(container){

if(typeof PIXI==="undefined"){return null;}

const app=
new PIXI.Application({
resizeTo:container,antialias:true,
backgroundAlpha:0});

container.appendChild(app.view);

return app;}};

/*=========================================================
UI RENDERER
=========================================================*/
export const UIRenderer={

init(){

WalletUI.update();
CategoryUI.update();
StatsUI.update();
GamesUI.render();
FeaturedUI.render();
SearchUI.init();
FilterUI.init();
ClickRouter.init();
AnimationUI.cards();
AnimationUI.featured();
console.log(
"[CASINO V3.2] UI READY");}};

/*=========================================================
BLOXIO CASINO V3.3 - REALTIME + GAMES RUNTIME
Requires:
V3.1 Core Foundation
V3.2 UI Renderer
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
transports:["websocket","polling"]});

this.bind();

},

bind(){

if(!this.socket)return;

this.socket.on(
"connect",
()=>{
this.connected=true;
STATE.runtime.socket=true;
BUS.emit("socket:connected");});

this.socket.on("disconnect",()=>{
this.connected=false;
STATE.runtime.socket=false;
BUS.emit("socket:disconnected");});

this.socket.on("casino:online",count=>{
STATE.casino.onlinePlayers=count;
BUS.emit("online:update",count);});

this.socket.on("casino:feed",payload=>{

STATE.feeds.live.unshift(payload);
STATE.feeds.live=
STATE.feeds.live.slice(0,100);
BUS.emit("feed:update",payload);

});

this.socket.on("casino:winner",payload=>{

STATE.feeds.winners.unshift(payload);
STATE.feeds.winners=
STATE.feeds.winners.slice(0,100);
BUS.emit("winner:update",payload);});

this.socket.on("casino:bigwin",payload=>{

STATE.feeds.bigWins.unshift(payload);
STATE.feeds.bigWins=
STATE.feeds.bigWins.slice(0,50);
BUS.emit("bigwin:update",payload);});

this.socket.on("casino:leaderboard",rows=>{

STATE.casino.leaderboard=rows;
BUS.emit("leaderboard:update",rows);});

this.socket.on("casino:jackpot",payload=>{

Object.assign(STATE.casino.jackpots,payload);
BUS.emit("jackpot:update",payload);});

this.socket.on("casino:tournaments",payload=>{

STATE.casino.tournaments=payload;
BUS.emit("tournament:update",payload);});

this.socket.on("casino:rain",payload=>{

BUS.emit("rain:update",payload);});

},

emit(event,data={}){

if(!this.connected)
return;

this.socket.emit(event,data);}};

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

games[randomInt(0,games.length-1)];
STATE.feeds.live.unshift({

user:"Player"+randomInt(1000,9999),

game:game.name,

amount:randomInt(10,5000),

currency:randomInt(0,1)?"BX":"XBC"});

STATE.feeds.live=
STATE.feeds.live.slice(0,50);
BUS.emit("feed:update");},3000);}};

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

games[randomInt(0,games.length-1)];

const payload={

user:"Whale"+randomInt(100,999),

game:game.name,

amount:randomInt(1000,50000),

multiplier:random(5,150).toFixed(2)};

STATE.feeds.bigWins.unshift(payload);
STATE.feeds.bigWins=
STATE.feeds.bigWins.slice(0,20);
BUS.emit("bigwin:update",payload);},12000);}};

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

randomInt(1,25);}

BUS.emit("jackpot:update");},5000);}};

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
Date.now()+259200000}];

BUS.emit("tournament:update");}};

/*=========================================================
RAIN RUNTIME
=========================================================*/

export const RainRuntime={

current:null,

create(){

this.current={
amount:randomInt(100,10000),
currency:randomInt(0,1)?"BX":"XBC",
players:0,
expires:Date.now()+300000};

BUS.emit("rain:update",this.current);},
join(){

if(!this.current)
return;

this.current.players++;

BUS.emit("rain:joined",this.current);},
claim(){

if(!this.current)
return false;

BUS.emit("rain:claim",this.current);
return true;

}};

export const TipsEngine={

open()
{BUS.emit("tips:open");},
send(user,amount,currency){
BUS.emit("tips:send",{user,amount,currency});}};

/*=========================================================
LEADERBOARD RUNTIME
=========================================================*/
export const LeaderboardRuntime={

generate(){

const rows=[];

for(
let i=1; i<=100; i++){

rows.push({ rank:i,

username:"Player"+randomInt(1000,9999),
profit:randomInt(1000,1000000),
wagered:randomInt(10000,10000000)});}

STATE.casino.leaderboard=rows;
BUS.emit("leaderboard:update",rows);},

start(){

this.generate();

setInterval(()=>this.generate(),60000);}};

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

BUS.emit("crash:update",this.multiplier);

requestAnimationFrame(tick);};

tick();},

cashout(){

this.running=false;

return this.multiplier;

},

stop(){

this.running=false;}};

/*=========================================================
MINES GAME
=========================================================*/
export const MinesGame={

createBoard(tiles=25,mines=3){

const board=Array(tiles).fill(false);

let count=0;

while(count<mines){

const index=randomInt(0,tiles-1);

if(board[index])
continue;

board[index]=true; count++;}

return board;}};

/*=========================================================
PLINKO GAME
=========================================================*/

export const PlinkoGame={
drop(){const payouts=[0.2,0.5,1,2,5,10,25];
return payouts[randomInt(0,payouts.length-1)];}};

/*=========================================================
WHEEL GAME
=========================================================*/
export const WheelGame={
spin(){const sectors=[1,2,3,5,10,25];
return sectors[randomInt(0,sectors.length-1)];}};

/*=========================================================
DICE GAME
=========================================================*/
export const DiceGame={
roll(){return randomInt(1,100);}};

/*=========================================================
COINFLIP GAME
=========================================================*/
export const CoinflipGame={flip(){
return Math.random()>0.5?"heads":"tails";}};

/*=========================================================
LIMBO GAME
=========================================================*/
export const LimboGame={roll(){
return Number(random(1,1000).toFixed(2));}};

/*=========================================================
HILO GAME
=========================================================*/
export const HiloGame={draw(){
return randomInt(1,13);}};

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

}}};

/*=========================================================
BET ENGINE
=========================================================*/
export const BetEngine={

place(amount){

amount=Number(amount);

if(
amount<Currency.minBet()){
return false;}

if(
!Wallet.debit(STATE.currency,amount)){
return false;}

Analytics.bet(amount);

BUS.emit("bet:placed",
{amount,currency:STATE.currency});

return true;},

win(amount){

Wallet.credit(STATE.currency,amount);

Analytics.win(amount);

BUS.emit("bet:won",amount);},

lose(amount){

Analytics.loss(amount);

BUS.emit("bet:lost",amount);}};

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
"[CASINO V3.3] REALTIME READY");}};

/*=========================================================
BLOXIO CASINO V3.4 - PIXI + GSAP + HOWLER
Requires:
=========================================================*/

export const PixiEngine={

enabled:false,
apps:new Map(),

init(){

if(typeof PIXI==="undefined"){
console.warn("[PIXI] Missing");
return;}

this.enabled=true;
STATE.runtime.pixi=true;
console.log("[PIXI] Ready");},

create(id,container){

if(!this.enabled||!container){
return null;}

if(this.apps.has(id)){
return this.apps.get(id);}

const app=new PIXI.Application({
resizeTo:container,
antialias:true,
backgroundAlpha:0,
autoDensity:true,
resolution:
window.devicePixelRatio||1});
container.appendChild(app.view);

this.apps.set(id,app);

return app;},

get(id){

return this.apps.get(id);},

destroy(id){

const app=
this.apps.get(id);

if(!app)return;

app.destroy(true,true);

this.apps.delete(id);},

destroyAll(){

for(const id of this.apps.keys()){

this.destroy(id);}}};

/*=========================================================
PARTICLE FX
=========================================================*/
export const ParticlesEngine={

explode(container,count=50){

if(!PixiEngine.enabled||!container){return;}

const app=

PixiEngine.create("particles",container);

for(
let i=0;i<count;i++){

const particle=

new PIXI.Graphics();

particle.beginFill(Math.random()*0xffffff);
particle.drawCircle(0,0,3);
particle.endFill();
particle.x=container.clientWidth/2;
particle.y=container.clientHeight/2;

app.stage.addChild(particle);

gsap.to(particle,{x:particle.x+
random(-300,300),
y:particle.y+random(-300,300),alpha:0,

duration:1.2,onComplete(){
app.stage.removeChild(particle);}});

}}};

/*=========================================================
CRASH PIXI
=========================================================*/
export const CrashPixi={

app:null,
line:null,
running:false,

mount(container){

if(!container)return;

this.app=

PixiEngine.create("crash",container);

this.line=
new PIXI.Graphics();

this.app.stage.addChild(
this.line);},

render(multiplier){

if(!this.line)return;

this.line.clear();
this.line.lineStyle(4,0x00ff99);
this.line.moveTo(0,300);
this.line.lineTo(multiplier*10,300-(multiplier*5));},

start(){

this.running=true;

const tick=()=>{

if(!this.running)
return;

this.render(CrashGame.multiplier);

requestAnimationFrame(tick);};

tick();},

stop(){

this.running=false;

}};

/*=========================================================
PLINKO PIXI
=========================================================*/
export const PlinkoPixi={

app:null,
ball:null,

mount(container){

if(!container)return;

this.app=PixiEngine.create("plinko",container);
this.ball=new PIXI.Graphics();
this.ball.beginFill(0xffff00);
this.ball.drawCircle(0,0,10);
this.ball.endFill();
this.ball.x=250;
this.ball.y=30;
this.app.stage.addChild(
this.ball);},

drop(){

if(!this.ball)
return;

gsap.to(this.ball,
{
y:500,
x:250+
random(-120,120),

duration:2,
ease:"bounce.out"});

}};

/*=========================================================
ROULETTE PIXI
=========================================================*/
export const RoulettePixi={

app:null,
wheel:null,

mount(container){

if(!container)return;

this.app=

PixiEngine.create("roulette",container);

this.wheel=
new PIXI.Graphics();

this.wheel.beginFill(0xff0000);
this.wheel.drawCircle(0,0,150);
this.wheel.endFill();
this.wheel.x=250;
this.wheel.y=250;
this.app.stage.addChild(
this.wheel
);},

spin(){

if(!this.wheel)
return;

gsap.to(
this.wheel,
{
rotation:
Math.PI*10+
random(0,10),

duration:5,ease:"power4.out"});

}};

/*=========================================================
GSAP ENGINE
=========================================================*/
export const AnimationEngine={

enabled:false,

init(){

if(typeof gsap==="undefined"){
console.warn("[GSAP] Missing");
return;
}

this.enabled=true;

console.log("[GSAP] Ready");},

cards(){

if(!this.enabled)
return;

gsap.from(".casino-game-card",
{opacity:0,y:40,duration:0.4,stagger:0.03});

},

featured(){

if(!this.enabled)
return;

gsap.from(".casino-featured-card",
{opacity:0,scale:0.9,duration:0.5,stagger:0.05});
},

winner(element){

if(
!this.enabled||
!element
)return;

gsap.fromTo(
element,
{scale:0.8,opacity:0},
{scale:1,opacity:1,duration:0.4});},

jackpot(element){

if(
!this.enabled||
!element
)return;

gsap.fromTo(
element,
{
scale:1
},
{scale:1.15,repeat:1,yoyo:true,duration:0.4});

},

shake(element){

if(
!this.enabled||
!element
)return;

gsap.fromTo(element,{x:-8},
{x:8,repeat:4,yoyo:true,duration:0.05});

}};

/*=========================================================
HOWLER AUDIO
=========================================================*/
export const AudioEngine={

enabled:true,
sounds:{},

init(){

if(typeof Howl==="undefined"){
console.warn("[HOWLER] Missing");
return;
}

STATE.runtime.audio=true;

this.sounds={

click:new Howl({src:["/audio/click.mp3"]}),
win:new Howl({src:["/audio/win.mp3"]}),
lose:new Howl({src:["/audio/lose.mp3"]}),
jackpot:new Howl({src:["/audio/jackpot.mp3"]}),
rain:new Howl({src:["/audio/rain.mp3"]}),
tip:new Howl({src:["/audio/tip.mp3"]}),
spin:new Howl({src:["/audio/spin.mp3"]}),
crash:new Howl({src:["/audio/crash.mp3"]})

};

console.log("[HOWLER] Ready");

},

play(name){

if(!this.enabled)
return;

const sound= this.sounds[name];

if(sound) {sound.play();}},

stop(name){

const sound=
this.sounds[name];

if(sound){

sound.stop();

}},

toggle(){

this.enabled= !this.enabled;

}};

/*=========================================================
AUDIO EVENTS
=========================================================*/
BUS.on("bet:placed",()=>AudioEngine.play("click"));
BUS.on("bet:won",()=>AudioEngine.play("win"));
BUS.on("bet:lost",()=>AudioEngine.play("lose"));
BUS.on("rain:update",()=>AudioEngine.play("rain"));
BUS.on("jackpot:update",()=>AudioEngine.play("jackpot"));

/*=========================================================
LIGHTWEIGHT CHARTS
=========================================================*/
export const ChartsEngine={

chart:null,
series:null,

init(){

if(
typeof LightweightCharts==="undefined"
){
return;
}

const root=
document.getElementById("casinoBigWinStats");

if(!root)
return;

this.chart=
LightweightCharts.createChart(root,
{
width:
root.clientWidth,height:250});

this.series=
this.chart.addAreaSeries();

this.series.setData([
{time:1,value:10},{time:2,value:15},
{time:3,value:8},{time:4,value:25}]);

STATE.runtime.charts=true;

},

update(value){

if(!this.series)
return;

this.series.update({
time:
Math.floor(Date.now()/1000),
value
});
}};

/*=========================================================
EFFECTS ENGINE
=========================================================*/
export const EffectsEngine={

bigWin(){

ParticlesEngine.explode(document.body,100);},

jackpot(){

ParticlesEngine.explode(document.body,200);

AudioEngine.play("jackpot");}};

BUS.on("bigwin:update",()=>EffectsEngine.bigWin());
BUS.on("jackpot:update",()=>EffectsEngine.jackpot());

/*=========================================================
GAME OPEN EVENTS
=========================================================*/
BUS.on("game:open",game=>{

const runtime=
document.getElementById("casinoRuntime");

if(!runtime)
return;

switch(game.id){

case "crash":

CrashPixi.mount(
runtime
);

CrashPixi.start();

break;

case "plinko":

PlinkoPixi.mount(runtime);

break;

case "roulette":
case "wheel":

RoulettePixi.mount(
runtime);

break;

}}
);

/*=========================================================
CRASH MULTIPLIER UI
=========================================================*/
BUS.on("crash:update",value=>{

const el=document.getElementById("crashMultiplier");

if(!el)
return;

el.textContent=value.toFixed(2)+"x";});

/*=========================================================
VISUAL ENGINE
=========================================================*/
export const VisualEngine={

start(){

PixiEngine.init();
AnimationEngine.init();
AudioEngine.init();
ChartsEngine.init();
AnimationEngine.cards();
AnimationEngine.featured();
console.log("[CASINO V3.4] VISUAL READY");

}};

/*=========================================================
BLOXIO CASINO V3.5 - FINAL BOOTSTRAP
Requires:
=========================================================*/

export const VERSION={
name:"BLOXIO CASINO",
version:"3.5.0",
build:"ENTERPRISE",
release:"2026"
};

/*=========================================================
HEALTH ENGINE
=========================================================*/
export const HealthEngine={

checks:[],

add(name,callback){

this.checks.push({name,callback});

},

run(){

const report=[];

for(const check of this.checks){

try{

report.push({
name:check.name,
status:check.callback()});

}catch(error){

report.push({name:check.name,
status:false,error});

}

}

return report;

}};

HealthEngine.add("Wallet",
()=>typeof Wallet!=="undefined");

HealthEngine.add("Registry",
()=>typeof Registry!=="undefined");

HealthEngine.add("SocketEngine",
()=>typeof SocketEngine!=="undefined");

HealthEngine.add("PixiEngine",
()=>typeof PixiEngine!=="undefined");

HealthEngine.add("AudioEngine",
()=>typeof AudioEngine!=="undefined");

HealthEngine.add("ChartsEngine",
()=>typeof ChartsEngine!=="undefined");

/*=========================================================
PROVIDER ENGINE
=========================================================*/
export const ProviderEngine={

providers:new Map(),

register(provider){

if(!provider?.id)
return;

this.providers.set(provider.id,provider);},

get(id){return this.providers.get(id);},

all(){

return[...this.providers.values()];}

};

/*=========================================================
GAME LOADER
=========================================================*/
export const GameLoader={

load(){

const games=
Registry.all();

for(const game of games){

if(!game.provider){

game.provider="BLOXIO";}}
console.log(`[CASINO] ${games.length} Games Loaded`);

return games.length;

}

};

/*=========================================================
SYNC ENGINES
=========================================================*/
export const WalletSync={

start(){

WalletUI.update();

BUS.emit("wallet:sync",STATE.wallet);

}};

export const FeedSync={

start(){

BUS.emit("feed:update",STATE.feeds.live);

BUS.emit("winner:update",STATE.feeds.winners);

}};

export const JackpotSync={

start(){

BUS.emit("jackpot:update",STATE.casino.jackpots);

}};

export const TournamentSync={

start(){

BUS.emit("tournament:update",STATE.casino.tournaments);

}};

export const LeaderboardSync={

start(){

BUS.emit("leaderboard:update",STATE.casino.leaderboard);

}

};

/*=========================================================
PERFORMANCE ENGINE
=========================================================*/
export const PerformanceEngine={

fps:0,
frames:0,
last:performance.now(),
raf:null,

start(){

const loop=time=>{

this.frames++;

if(time-this.last>=1000){

this.fps=
this.frames;

this.frames=0;

this.last=time;

}

this.raf=requestAnimationFrame(loop);};
this.raf=requestAnimationFrame(loop);},

stop(){cancelAnimationFrame(this.raf);}

};

/*=========================================================
MEMORY ENGINE
=========================================================*/
export const MemoryEngine={

usage(){

if(
!performance.memory){return null;}

return{

used:
Math.round(
performance.memory.usedJSHeapSize
/1024/1024),

limit:
Math.round(
performance.memory.jsHeapSizeLimit
/1024/1024)

};}

};

/*=========================================================
CASINO ANALYTICS
=========================================================*/
export const CasinoAnalytics={

sessionStart:Date.now(),

sessionDuration(){

return Math.floor((Date.now()-this.sessionStart)/1000);

},

snapshot(){

return{

version:VERSION.version,
currency:STATE.currency,
wallet:STATE.wallet,
analytics:STATE.analytics,
online:STATE.casino.onlinePlayers,
games:Registry.all().length,
fps:PerformanceEngine.fps};}

};

/*=========================================================
HOTKEYS
=========================================================*/
export const Hotkeys={

init(){

document.addEventListener("keydown",event=>{

if(event.key==="Escape"){

GameView.close();}

if(event.key==="/"){

event.preventDefault();

document.getElementById("casinoSearch")?.focus();}}

);}

};

/*=========================================================
VISIBILITY ENGINE
=========================================================*/
export const VisibilityEngine={ init(){

document.addEventListener("visibilitychange",()=>{

if(document.hidden){

BUS.emit("app:hidden");

}else{

BUS.emit("app:visible");}}

);}

};

/*=========================================================
MOBILE ENGINE
=========================================================*/
export const MobileEngine={

init(){

document.getElementById("mobileCasinoSearch")
?.addEventListener("click",()=>{

document.getElementById("casinoSearch")?.focus();

});

document.getElementById("mobileCasinoWallet")
?.addEventListener("click",()=>{

BUS.emit("wallet:open");

});

document.getElementById("mobileCasinoLeaderboard")
?.addEventListener("click",()=>{

document.getElementById("casinoLeaderboard")
?.scrollIntoView({behavior:"smooth"});

});

}};

/*=========================================================
DEVTOOLS
=========================================================*/
export const DevTools={

mount(){

window.BLOXIO={

VERSION,STATE,BUS,Wallet,Currency,

Registry,Analytics,

SocketEngine,AudioEngine,CasinoAnalytics

};}

};

/*=========================================================
APP ENGINE
=========================================================*/
export const CasinoApp={

started:false,
start(){

if(this.started)
return;

console.group(`🚀 ${VERSION.name}`);
console.log(VERSION);

CasinoCore.start();
GameLoader.load();
WalletSync.start();
FeedSync.start();
JackpotSync.start();
TournamentSync.start();
LeaderboardSync.start();
RealtimeRuntime.start();
VisualEngine.start();
PerformanceEngine.start();
Hotkeys.init();
VisibilityEngine.init();
MobileEngine.init();

$$(".casino-currency").forEach(btn=>{
btn.addEventListener("click",()=>{
$$(".casino-currency").forEach(x=>
x.classList.remove("active"));
btn.classList.add("active");
Currency.set(btn.dataset.currency);
WalletUI.update();

});});

$("#joinRainBtn")?.addEventListener(
"click",()=>RainRuntime.join());

$("#claimRainBtn")?.addEventListener(
"click",()=>RainRuntime.claim?.());

$("#sendTipBtn")?.addEventListener(
"click",()=>TipsEngine.open?.());
DevTools.mount();

const report=
HealthEngine.run();

console.table(report);
console.groupEnd();

this.started=true;

BUS.emit("casino:started");

console.log("[CASINO V3.5] READY");

},

stop(){

PerformanceEngine.stop();

this.started=false;

BUS.emit("casino:stopped");

}};

/*=========================================================
GLOBAL EXPORTS
=========================================================*/
window.CasinoApp=CasinoApp;
window.CasinoVersion=VERSION;
window.CasinoAnalytics=CasinoAnalytics;

/*=========================================================
BOOTSTRAP
=========================================================*/
document.addEventListener("DOMContentLoaded",()=>{
CasinoApp.start();});
