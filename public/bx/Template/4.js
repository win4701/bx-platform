/*=========================================================
BLOXIO CASINO V3.4 - PIXI + GSAP + HOWLER
Requires:
V3.1 Core
V3.2 Renderer
V3.3 Runtime
=========================================================*/
"use strict";

/*=========================================================
PIXI ENGINE
=========================================================*/
export const PixiEngine={

enabled:false,
apps:new Map(),

init(){

if(typeof PIXI==="undefined"){
console.warn("[PIXI] Missing");
return;
}

this.enabled=true;
STATE.runtime.pixi=true;

console.log(
"[PIXI] Ready"
);

},

create(id,container){

if(
!this.enabled||
!container
){
return null;
}

if(this.apps.has(id)){
return this.apps.get(id);
}

const app=new PIXI.Application({
resizeTo:container,
antialias:true,
backgroundAlpha:0,
autoDensity:true,
resolution:
window.devicePixelRatio||1
});

container.appendChild(
app.view
);

this.apps.set(
id,
app
);

return app;

},

get(id){

return this.apps.get(id);

},

destroy(id){

const app=
this.apps.get(id);

if(!app)return;

app.destroy(
true,
true
);

this.apps.delete(id);

},

destroyAll(){

for(const id of this.apps.keys()){

this.destroy(id);

}

}

};

/*=========================================================
PARTICLE FX
=========================================================*/
export const ParticlesEngine={

explode(
container,
count=50
){

if(
!PixiEngine.enabled||
!container
){
return;
}

const app=

PixiEngine.create(
"particles",
container
);

for(
let i=0;
i<count;
i++
){

const particle=

new PIXI.Graphics();

particle.beginFill(
Math.random()*0xffffff
);

particle.drawCircle(
0,
0,
3
);

particle.endFill();

particle.x=
container.clientWidth/2;

particle.y=
container.clientHeight/2;

app.stage.addChild(
particle
);

gsap.to(
particle,
{
x:
particle.x+
random(
-300,
300
),

y:
particle.y+
random(
-300,
300
),

alpha:0,

duration:1.2,

onComplete(){

app.stage.removeChild(
particle
);

}
}
);

}

}

};

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

PixiEngine.create(
"crash",
container
);

this.line=
new PIXI.Graphics();

this.app.stage.addChild(
this.line
);

},

render(multiplier){

if(!this.line)return;

this.line.clear();

this.line.lineStyle(
4,
0x00ff99
);

this.line.moveTo(
0,
300
);

this.line.lineTo(
multiplier*10,
300-(multiplier*5)
);

},

start(){

this.running=true;

const tick=()=>{

if(!this.running)
return;

this.render(
CrashGame.multiplier
);

requestAnimationFrame(
tick
);

};

tick();

},

stop(){

this.running=false;

}

};

/*=========================================================
PLINKO PIXI
=========================================================*/
export const PlinkoPixi={

app:null,
ball:null,

mount(container){

if(!container)return;

this.app=

PixiEngine.create(
"plinko",
container
);

this.ball=
new PIXI.Graphics();

this.ball.beginFill(
0xffff00
);

this.ball.drawCircle(
0,
0,
10
);

this.ball.endFill();

this.ball.x=250;
this.ball.y=30;

this.app.stage.addChild(
this.ball
);

},

drop(){

if(!this.ball)
return;

gsap.to(
this.ball,
{
y:500,

x:
250+
random(
-120,
120
),

duration:2,

ease:"bounce.out"
}
);

}

};

/*=========================================================
ROULETTE PIXI
=========================================================*/
export const RoulettePixi={

app:null,
wheel:null,

mount(container){

if(!container)return;

this.app=

PixiEngine.create(
"roulette",
container
);

this.wheel=
new PIXI.Graphics();

this.wheel.beginFill(
0xff0000
);

this.wheel.drawCircle(
0,
0,
150
);

this.wheel.endFill();

this.wheel.x=250;
this.wheel.y=250;

this.app.stage.addChild(
this.wheel
);

},

spin(){

if(!this.wheel)
return;

gsap.to(
this.wheel,
{
rotation:
Math.PI*10+
random(
0,
10
),

duration:5,

ease:"power4.out"
}
);

}

};

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

console.log(
"[GSAP] Ready"
);

},

cards(){

if(!this.enabled)
return;

gsap.from(
".casino-game-card",
{
opacity:0,
y:40,
duration:0.4,
stagger:0.03
}
);

},

featured(){

if(!this.enabled)
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

},

winner(element){

if(
!this.enabled||
!element
)return;

gsap.fromTo(
element,
{
scale:0.8,
opacity:0
},
{
scale:1,
opacity:1,
duration:0.4
}
);

},

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
{
scale:1.15,
repeat:1,
yoyo:true,
duration:0.4
}
);

},

shake(element){

if(
!this.enabled||
!element
)return;

gsap.fromTo(
element,
{
x:-8
},
{
x:8,
repeat:4,
yoyo:true,
duration:0.05
}
);

}

};

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

click:new Howl({
src:["/audio/click.mp3"]
}),

win:new Howl({
src:["/audio/win.mp3"]
}),

lose:new Howl({
src:["/audio/lose.mp3"]
}),

jackpot:new Howl({
src:["/audio/jackpot.mp3"]
}),

rain:new Howl({
src:["/audio/rain.mp3"]
}),

tip:new Howl({
src:["/audio/tip.mp3"]
}),

spin:new Howl({
src:["/audio/spin.mp3"]
}),

crash:new Howl({
src:["/audio/crash.mp3"]
})

};

console.log(
"[HOWLER] Ready"
);

},

play(name){

if(!this.enabled)
return;

const sound=
this.sounds[name];

if(sound){

sound.play();

}

},

stop(name){

const sound=
this.sounds[name];

if(sound){

sound.stop();

}

},

toggle(){

this.enabled=
!this.enabled;

}

};

/*=========================================================
AUDIO EVENTS
=========================================================*/
BUS.on(
"bet:placed",
()=>AudioEngine.play("click")
);

BUS.on(
"bet:won",
()=>AudioEngine.play("win")
);

BUS.on(
"bet:lost",
()=>AudioEngine.play("lose")
);

BUS.on(
"rain:update",
()=>AudioEngine.play("rain")
);

BUS.on(
"jackpot:update",
()=>AudioEngine.play("jackpot")
);

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
document.getElementById(
"casinoBigWinStats"
);

if(!root)
return;

this.chart=
LightweightCharts.createChart(
root,
{
width:
root.clientWidth,
height:250
}
);

this.series=
this.chart.addAreaSeries();

this.series.setData([
{time:1,value:10},
{time:2,value:15},
{time:3,value:8},
{time:4,value:25}
]);

STATE.runtime.charts=true;

},

update(value){

if(!this.series)
return;

this.series.update({
time:
Math.floor(
Date.now()/1000
),
value
});

}

};

/*=========================================================
EFFECTS ENGINE
=========================================================*/
export const EffectsEngine={

bigWin(){

ParticlesEngine.explode(
document.body,
100
);

},

jackpot(){

ParticlesEngine.explode(
document.body,
200
);

AudioEngine.play(
"jackpot"
);

}

};

BUS.on(
"bigwin:update",
()=>EffectsEngine.bigWin()
);

BUS.on(
"jackpot:update",
()=>EffectsEngine.jackpot()
);

/*=========================================================
GAME OPEN EVENTS
=========================================================*/
BUS.on(
"game:open",
game=>{

const runtime=
document.getElementById(
"casinoRuntime"
);

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

PlinkoPixi.mount(
runtime
);

break;

case "roulette":
case "wheel":

RoulettePixi.mount(
runtime
);

break;

}

}
);

/*=========================================================
CRASH MULTIPLIER UI
=========================================================*/
BUS.on(
"crash:update",
value=>{

const el=
document.getElementById(
"crashMultiplier"
);

if(!el)
return;

el.textContent=
value.toFixed(2)+"x";

}
);

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

console.log(
"[CASINO V3.4] VISUAL READY"
);

}

};
