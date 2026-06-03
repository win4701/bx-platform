/* =========================================================
CASINO GAMES 2026
TOTAL = 18 GAMES
========================================================= */

export const CASINO_GAMES = [

/* =========================================================
ORIGINALS
========================================================= */

{
id:"crash",
name:"Crash",
provider:"Bloxio Originals",
image:"/assets/images/casino/crash.webp",
currency:["BX","XBC"],
status:"active",
category:"original"
},

{
id:"dice",
name:"Dice",
provider:"Bloxio Originals",
image:"/assets/images/casino/dice.webp",
currency:["BX","XBC"],
status:"active",
category:"original"
},

{
id:"limbo",
name:"Limbo",
provider:"Bloxio Originals",
image:"/assets/images/casino/limbo.webp",
currency:["BX","XBC"],
status:"active",
category:"original"
},

{
id:"mines",
name:"Mines",
provider:"Bloxio Originals",
image:"/assets/images/casino/mines.webp",
currency:["BX","XBC"],
status:"active",
category:"original"
},

{
id:"plinko",
name:"Plinko",
provider:"Bloxio Originals",
image:"/assets/images/casino/plinko.webp",
currency:["BX","XBC"],
status:"active",
category:"original"
},

{
id:"roulette",
name:"Roulette",
provider:"Bloxio Originals",
image:"/assets/images/casino/roulette.webp",
currency:["BX","XBC"],
status:"active",
category:"original"
},

{
id:"wheel",
name:"Wheel",
provider:"Bloxio Originals",
image:"/assets/images/casino/wheel.webp",
currency:["BX","XBC"],
status:"active",
category:"original"
},

{
id:"tower",
name:"Tower",
provider:"Bloxio Originals",
image:"/assets/images/casino/tower-rush.webp",
currency:["BX","XBC"],
status:"active",
category:"original"
},

{
id:"keno",
name:"Keno",
provider:"Bloxio Originals",
image:"/assets/images/casino/keno.webp",
currency:["BX","XBC"],
status:"active",
category:"original"
},

{
id:"hilo",
name:"HiLo",
provider:"Bloxio Originals",
image:"/assets/images/casino/hilo.webp",
currency:["BX","XBC"],
status:"active",
category:"original"
},

{
id:"blackjack",
name:"Blackjack",
provider:"Bloxio Originals",
image:"/assets/images/casino/blackjack.webp",
currency:["BX","XBC"],
status:"active",
category:"card"
},

{
id:"baccarat",
name:"Baccarat",
provider:"Bloxio Originals",
image:"/assets/images/casino/baccarat.webp",
currency:["BX","XBC"],
status:"active",
category:"card"
},

{
id:"tower-rush",
name:"Tower Rush",
provider:"GS",
image:"/assets/images/casino/tower.webp",
category:"arcade",
currency:["BX","XBC"]
},

{
id:"chilli-respin",
name:"Chilli Respin",
provider:"Fazi",
image:"/assets/images/casino/chilli.webp",
category:"slot",
currency:["BX","XBC"]
},

{
id:"chix",
name:"Chix",
provider:"Onlyplay",
image:"/assets/images/casino/chix.webp",
category:"arcade",
currency:["BX","XBC"]
},

{
id:"mighty-masks",
name:"Mighty Masks",
provider:"Hacksaw",
image:"/assets/images/casino/masks.webp",
category:"slot",
currency:["BX","XBC"]
},

{
id:"roue",
name:"Roue",
provider:"Jeux Original",
image:"/assets/images/casino/roue.webp",
category:"roulette",
currency:["BX","XBC"]
},

{
id:"chicken-road",
name:"Chicken Road",
provider:"InOut",
image:"/assets/images/casino/chicken.webp",
category:"arcade",
currency:["BX","XBC"]
}

];


/* =========================================================
CASINO HOME ORDER
========================================================= */

export const CASINO_HOME_ORDER = [

"crash",
"mines",
"plinko",
"tower",
"chicken",
"chilli",
"chix",
"masks",

"dice",
"limbo",
"roulette",
"roue",

"wheel",
"keno",
"hilo",

"blackjack",
"baccarat"

];

/* =========================================================
CATEGORIES
========================================================= */

export const CASINO_CATEGORIES = [

{
id:"all",
name:"All Games"
},

{
id:"original",
name:"Originals"
},

{
id:"arcade",
name:"Arcade"
},

{
id:"slot",
name:"Slots"
},

{
id:"card",
name:"Cards"
},

{
id:"roulette",
name:"Roulette"
}

];

/* =========================================================
SUPPORTED CURRENCIES
========================================================= */

export const CASINO_CURRENCIES = [

"BX",
"XBC"

];

/* =========================================================
BET LIMITS
========================================================= */

export const CASINO_LIMITS = {

BX:{
min:0.1,
max:1000
},

XBC:{
min:10,
max:500000
}

};
