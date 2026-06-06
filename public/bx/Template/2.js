/*=========================================================
BLOXIO CASINO V3.2 - UI RENDERER
Requires: V3.1 Core Foundation
=========================================================*/
"use strict";

/*=========================================================
DOM CACHE
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

<span>
${game.category||"casino"}
</span>

<span>
RTP ${game.rtp||99}%
</span>

</div>

</div>

</button>
`;
},

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

<h4>
${game.name}
</h4>

<p>
${game.provider||"BLOXIO"}
</p>

</div>

</button>
`;
},

feed(row){
return`
<div class="feed-row">

<span>
${row.user}
</span>

<span>
${row.game}
</span>

<strong>
${row.amount}
${row.currency||"BX"}
</strong>

</div>
`;
},

winner(row){
return`
<div class="winner-row">

<span>
${row.user}
</span>

<span>
${row.game}
</span>

<strong>
${row.amount}
${row.currency||"BX"}
</strong>

</div>
`;
},

leaderboard(row){
return`
<div class="leaderboard-row">

<span>
#${row.rank}
</span>

<span>
${row.username}
</span>

<strong>
${row.profit}
</strong>

</div>
`;
},

tournament(row){
return`
<div class="tournament-card">

<h4>
${row.name}
</h4>

<p>
Prize: ${row.prize}
</p>

<p>
Players: ${row.players||0}
</p>

</div>
`;
}

};

/*=========================================================
VIRTUAL LIST
=========================================================*/
export const VirtualList={

render(
root,
items,
renderer
){

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

DOM.bxBalance.textContent=
Wallet
.get("BX")
.toFixed(4);

}

if(DOM.xbcBalance){

DOM.xbcBalance.textContent=
Wallet
.get("XBC")
.toFixed(2);

}

}

};

BUS.on(
"wallet:update",
()=>WalletUI.update()
);

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

DOM.catOriginals.textContent=
count("originals");

}

if(DOM.catArcade){

DOM.catArcade.textContent=
count("arcade");

}

if(DOM.catCards){

DOM.catCards.textContent=
count("cards");

}

if(DOM.catSlots){

DOM.catSlots.textContent=
count("slots");

}

if(DOM.catRoulette){

DOM.catRoulette.textContent=
count("roulette");

}

}

};

/*=========================================================
GAMES UI
=========================================================*/
export const GamesUI={

render(
games=Registry.all()
){

VirtualList.render(
DOM.gamesGrid,
games,
Templates.game
);

},

refresh(){

this.render();

}

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
);

}

};

/*=========================================================
SEARCH UI
=========================================================*/
export const SearchUI={

init(){

if(!DOM.searchInput)
return;

DOM.searchInput
.addEventListener(

"input",

event=>{

const value=
event.target
.value
.trim();

STATE.filters.search=
value;

GamesUI.render(
Registry.search(value)
);

}

);

}

};

/*=========================================================
FILTER UI
=========================================================*/
export const FilterUI={

init(){

$$(
".casino-filter-btn"
)

.forEach(btn=>{

btn.addEventListener(

"click",

()=>{

$$(
".casino-filter-btn"
)

.forEach(
b=>b.classList.remove("active")
);

btn.classList.add("active");

const category=
btn.dataset.tab;

STATE.filters.category=
category;

GamesUI.render(
Registry.category(category)
);

}

);

});

}

};

/*=========================================================
GAME VIEW
=========================================================*/
export const GameView={

open(id){

const game=
Registry.get(id);

if(!game)
return;

STATE.activeGame=
game.id;

DOM.gameView
?.classList
.remove("hidden");

DOM.gameContainer.innerHTML=`

<div class="casino-active-view">

<div class="casino-active-header">

<h2>
${game.name}
</h2>

<button id="closeGame">

Close

</button>

</div>

<div id="casinoRuntime">

</div>

</div>

`;

BUS.emit(
"game:open",
game
);

},

close(){

STATE.activeGame=
null;

DOM.gameView
?.classList
.add("hidden");

if(DOM.gameContainer){

DOM.gameContainer.innerHTML="";

}

}

};

/*=========================================================
CLICK ROUTER
=========================================================*/
export const ClickRouter={

init(){

document.addEventListener(

"click",

event=>{

const game=

event.target.closest(
".casino-game-card"
);

if(game){

GameView.open(
game.dataset.game
);

}

const featured=

event.target.closest(
".casino-featured-card"
);

if(featured){

GameView.open(
featured.dataset.game
);

}

if(
event.target.id==="closeGame"
){

GameView.close();

}

}

);

}

};

/*=========================================================
LIVE FEED UI
=========================================================*/
export const FeedUI={

render(){

VirtualList.render(
DOM.liveFeed,
STATE.feeds.live,
Templates.feed
);

}

};

BUS.on(
"feed:update",
()=>FeedUI.render()
);

/*=========================================================
WINNERS UI
=========================================================*/
export const WinnersUI={

render(){

VirtualList.render(
DOM.liveWinners,
STATE.feeds.winners,
Templates.winner
);

}

};

BUS.on(
"winner:update",
()=>WinnersUI.render()
);

/*=========================================================
LEADERBOARD UI
=========================================================*/
export const LeaderboardUI={

render(){

VirtualList.render(
DOM.leaderboard,
STATE.casino.leaderboard,
Templates.leaderboard
);

}

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
Templates.tournament
);

}

};

BUS.on(
"tournament:update",
()=>TournamentUI.render()
);

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

}

}

};

BUS.on(
"jackpot:update",
()=>JackpotUI.update()
);

/*=========================================================
STATS UI
=========================================================*/
export const StatsUI={

update(){

if(DOM.gamesCount){

DOM.gamesCount.textContent=
Registry.all().length;

}

if(DOM.onlinePlayers){

DOM.onlinePlayers.textContent=
STATE.casino.onlinePlayers;

}

}

};

/*=========================================================
GSAP BRIDGE
=========================================================*/
export const AnimationUI={

enabled(){
return typeof gsap!=="undefined";
},

cards(){

if(!this.enabled())
return;

gsap.from(
".casino-game-card",
{
opacity:0,
y:30,
duration:0.4,
stagger:0.02
}
);

},

featured(){

if(!this.enabled())
return;

gsap.from(
".casino-featured-card",
{
opacity:0,
scale:0.9,
duration:0.5,
stagger:0.05
}
);

}

};

/*=========================================================
PIXI BRIDGE
=========================================================*/
export const PixiBridge={

create(container){

if(
typeof PIXI==="undefined"
){
return null;
}

const app=
new PIXI.Application({
resizeTo:container,
antialias:true,
backgroundAlpha:0
});

container.appendChild(
app.view
);

return app;

}

};

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
"[CASINO V3.2] UI READY"
);

}

};
