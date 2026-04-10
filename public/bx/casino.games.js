/* =========================================================
   CASINO PRO CORE V3 — PART 1 (UPGRADED SAFE)
   BX ONLY • STABLE • NO BREAK
========================================================= */

(function () {
"use strict";

/* =========================================================
CONFIG
========================================================= */

const BX = {
  SYMBOL: "BX",
  RATE: 45,
  MIN_BET: 0.01,
  MAX_BET: 1000,
  MAX_BET_PERCENT: 0.35,
  TRIAL_START: 1
};

/* =========================================================
STATE
========================================================= */

const STATE = {
  wallet: {
    real: 0,
    trial: 0,
    total: 0
  },

  bet: 0.1,
  currentGame: null,

  stats: {
    played: 0,
    won: 0,
    lost: 0,
    profit: 0,
    wagered: 0
  }
};

/* =========================================================
INIT
========================================================= */

function initWallet() {
  if (!localStorage.getItem("bx_trial_given")) {
    STATE.wallet.trial = BX.TRIAL_START;
    localStorage.setItem("bx_trial_given", "1");
  }
  recalc();
}

/* =========================================================
UTILS
========================================================= */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function toNum(v) {
  return Number(v || 0);
}

function round(n) {
  return +Number(n).toFixed(8);
}

/* =========================================================
WALLET ENGINE
========================================================= */

function recalc() {
  STATE.wallet.real = Math.max(0, toNum(STATE.wallet.real));
  STATE.wallet.trial = Math.max(0, toNum(STATE.wallet.trial));
  STATE.wallet.total = round(STATE.wallet.real + STATE.wallet.trial);
}

function getBalance() {
  recalc();
  return STATE.wallet.total;
}

function hasEnough(amount) {
  return getBalance() >= amount;
}

function canBet(amount) {
  amount = toNum(amount);

  if (amount <= 0) return false;
  if (amount < BX.MIN_BET) return false;
  if (amount > BX.MAX_BET) return false;

  if (!hasEnough(amount)) return false;

  const maxAllowed = getBalance() * BX.MAX_BET_PERCENT;
  if (amount > maxAllowed && getBalance() > 2) return false;

  return true;
}

function getStakeType(amount) {
  return STATE.wallet.trial >= amount ? "trial" : "real";
}

function debit(amount) {
  amount = toNum(amount);
  if (!hasEnough(amount)) return false;

  if (STATE.wallet.trial >= amount) {
    STATE.wallet.trial -= amount;
  } else {
    const rest = amount - STATE.wallet.trial;
    STATE.wallet.trial = 0;
    STATE.wallet.real -= rest;
  }

  recalc();
  save();
  return true;
}

function credit(amount, type = "real") {
  amount = toNum(amount);
  if (amount <= 0) return;

  if (type === "trial") {
    STATE.wallet.trial += amount;
  } else {
    STATE.wallet.real += amount;
  }

  recalc();
  save();
}

/* =========================================================
STATS ENGINE
========================================================= */

function updateStats(result) {
  STATE.stats.played++;

  STATE.stats.wagered += result.bet || 0;
  STATE.stats.profit += result.profit || 0;

  if (result.won) STATE.stats.won++;
  else STATE.stats.lost++;
}

/* =========================================================
PERSISTENCE
========================================================= */

function save() {
  try {
    localStorage.setItem("casino_v3_state", JSON.stringify(STATE));
  } catch (e) {}
}

function load() {
  try {
    const raw = localStorage.getItem("casino_v3_state");
    if (!raw) return;

    const parsed = JSON.parse(raw);

    Object.assign(STATE, parsed);
    recalc();
  } catch (e) {}
}

/* =========================================================
PUBLIC API
========================================================= */

window.CASINO_CORE = {

  init() {
    load();
    initWallet();
    recalc();
  },

  getState: () => STATE,

  getBalance,

  canBet,

  debit,

  credit,

  getStakeType,

  updateStats
};

})();
/* =========================================================
   CASINO PRO V3 — PART 2 FINAL ENGINE
   12 GAMES • RTP • HOUSE EDGE • PRO READY
========================================================= */

(function () {
"use strict";

/* =========================================================
RTP SYSTEM
========================================================= */

const RTP = {
  crash: 0.96,
  dice: 0.98,
  limbo: 0.96,
  hilo: 0.95,
  plinko: 0.94,
  mines: 0.93,
  coinflip: 0.97,
  wheel: 0.95,
  keno: 0.92,
  tower: 0.94,
  blackjack: 0.97,
  slots: 0.91
};

/* =========================================================
HELPERS
========================================================= */

function rand() {
  return Math.random();
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function round(n) {
  return +Number(n).toFixed(8);
}

function edge(m, game) {
  return m * (RTP[game] || 0.95);
}

/* =========================================================
ALGORITHMS (12 GAMES)
========================================================= */

/* CRASH */
function crash(target) {
  let r = rand();
  let m;

  if (r < 0.5) m = 1 + rand() * 0.5;
  else if (r < 0.8) m = 1.5 + rand() * 2;
  else if (r < 0.95) m = 3 + rand() * 5;
  else m = 10 + rand() * 40;

  m = edge(m, "crash");

  return {
    multiplier: round(m),
    won: m >= target
  };
}

/* DICE */
function dice(chance) {
  chance = clamp(chance, 1, 95);
  let roll = rand() * 100;
  let payout = edge(99 / chance, "dice");

  return {
    rolled: round(roll),
    multiplier: round(payout),
    won: roll <= chance
  };
}

/* LIMBO */
function limbo(target) {
  let m = 1 + Math.pow(rand() * 10, 1.2);
  m = edge(m, "limbo");

  return {
    multiplier: round(m),
    won: m >= target
  };
}

/* HILO */
function hilo(pick) {
  let a = Math.floor(rand() * 13) + 1;
  let b = Math.floor(rand() * 13) + 1;

  let win =
    (pick === "higher" && b > a) ||
    (pick === "lower" && b < a);

  let m = edge(1.7, "hilo");

  return {
    current: a,
    next: b,
    multiplier: round(m),
    won: win
  };
}

/* PLINKO */
function plinko(risk) {
  const map = {
    low: [0.5, 0.8, 1, 1.2, 1.5],
    medium: [0.3, 0.6, 1, 2, 3],
    high: [0.2, 0.5, 1, 3, 6]
  };

  let pool = map[risk] || map.medium;
  let m = pool[Math.floor(rand() * pool.length)];

  m = edge(m, "plinko");

  return {
    multiplier: round(m),
    won: m >= 1
  };
}

/* MINES */
function mines(count) {
  count = clamp(count, 1, 10);

  let safeChance = 1 - (count / 25);
  let safe = rand() < safeChance;

  let m = edge(1 + count * 0.2, "mines");

  return {
    multiplier: safe ? round(m) : 0,
    won: safe
  };
}

/* COINFLIP */
function coinflip(pick) {
  let flip = rand() > 0.5 ? "heads" : "tails";
  let win = flip === pick;

  let m = edge(2, "coinflip");

  return {
    flip,
    multiplier: round(m),
    won: win
  };
}

/* WHEEL */
function wheel(choice) {
  const sectors = [2, 3, 5, 10];
  let spin = sectors[Math.floor(rand() * sectors.length)];
  let win = spin === choice;

  let m = edge(choice, "wheel");

  return {
    result: spin,
    multiplier: round(m),
    won: win
  };
}

/* KENO */
function keno(picks) {
  let hits = 0;
  let draw = [];

  for (let i = 0; i < 10; i++) {
    draw.push(Math.floor(rand() * 40) + 1);
  }

  picks.forEach(p => {
    if (draw.includes(p)) hits++;
  });

  let m = edge(1 + hits * 0.5, "keno");

  return {
    hits,
    multiplier: round(m),
    won: hits > 0
  };
}

/* TOWER */
function tower(levels) {
  levels = clamp(levels, 1, 8);
  let success = rand() > 0.4;

  let m = edge(1 + levels * 0.3, "tower");

  return {
    multiplier: success ? round(m) : 0,
    won: success
  };
}

/* BLACKJACK (SIMPLIFIED) */
function blackjack() {
  let player = Math.floor(rand() * 21) + 1;
  let dealer = Math.floor(rand() * 21) + 1;

  let win = player > dealer && player <= 21;

  let m = edge(2, "blackjack");

  return {
    player,
    dealer,
    multiplier: round(m),
    won: win
  };
}

/* SLOTS */
function slots() {
  const symbols = ["7", "BAR", "🍒"];
  let a = symbols[Math.floor(rand() * 3)];
  let b = symbols[Math.floor(rand() * 3)];
  let c = symbols[Math.floor(rand() * 3)];

  let win = a === b && b === c;

  let m = edge(5, "slots");

  return {
    reels: [a, b, c],
    multiplier: round(m),
    won: win
  };
}

/* =========================================================
MAIN PLAY
========================================================= */

function play(game, bet, opts = {}) {

  let r;

  switch (game) {
    case "crash": r = crash(opts.target || 1.96); break;
    case "dice": r = dice(opts.chance || 50); break;
    case "limbo": r = limbo(opts.target || 1.96); break;
    case "hilo": r = hilo(opts.pick || "higher"); break;
    case "plinko": r = plinko(opts.risk || "medium"); break;
    case "mines": r = mines(opts.mines || 3); break;
    case "coinflip": r = coinflip(opts.pick || "heads"); break;
    case "wheel": r = wheel(opts.choice || 2); break;
    case "keno": r = keno(opts.picks || [1,2,3]); break;
    case "tower": r = tower(opts.levels || 3); break;
    case "blackjack": r = blackjack(); break;
    case "slots": r = slots(); break;
    default:
      return { ok:false };
  }

  let payout = r.won ? bet * r.multiplier : 0;

  return {
    ok: true,
    game,
    bet,
    payout: round(payout),
    profit: round(payout - bet),
    multiplier: r.multiplier,
    won: r.won,
    meta: r
  };
}

/* =========================================================
EXPORT
========================================================= */

window.CASINO_GAMES = { play };

})();
/* =========================================================
   CASINO PRO V3 — PART 3 FINAL UI
   FULL UI • EVENTS • RENDER • AUTO • 12 GAMES
========================================================= */

(function () {
"use strict";

if (!window.CASINO_CORE || !window.CASINO_GAMES) {
  console.error("Missing PART 1 or PART 2");
  return;
}

/* =========================================================
STATE
========================================================= */

const UI = {
  game: null,
  mode: "manual",
  autoRunning: false,
  autoTimer: null
};

window.CASINO_UI = UI;

/* =========================================================
HELPERS
========================================================= */

const $ = id => document.getElementById(id);

function fmt(n) {
  return Number(n || 0).toFixed(2);
}

/* =========================================================
INIT
========================================================= */

function init() {
  renderLobby();
  bindGlobal();
  window.CASINO_CORE.init();
}

document.addEventListener("DOMContentLoaded", init);

/* =========================================================
LOBBY
========================================================= */

const GAME_LIST = [
  "crash","dice","limbo","hilo","plinko","mines",
  "coinflip","wheel","keno","tower","blackjack","slots"
];

function renderLobby() {
  const root = document.getElementById("casino");
  if (!root) return;

  root.innerHTML = `
    <div class="casino-grid">
      ${GAME_LIST.map(g => `
        <button class="game" data-game="${g}">
          <div class="game-name">${g.toUpperCase()}</div>
        </button>
      `).join("")}
    </div>
    <div id="gameBox" style="display:none;"></div>
  `;
}

/* =========================================================
OPEN GAME
========================================================= */

function openGame(game) {
  UI.game = game;

  const box = $("gameBox");
  const grid = document.querySelector(".casino-grid");

  grid.style.display = "none";
  box.style.display = "block";

  box.innerHTML = `
    <div class="game-ui">

      <button id="backBtn">←</button>

      <h2>${game.toUpperCase()}</h2>

      <div id="resultDisplay">1.00x</div>

      <input id="betInput" type="number" value="0.10" step="0.01">

      <input id="targetInput" type="number" value="1.96" step="0.01">

      <button id="playBtn">PLAY</button>
      <button id="autoBtn">AUTO</button>

      <div id="log"></div>

    </div>
  `;

  bindGame();
}

/* =========================================================
PLAY
========================================================= */

function play() {
  const bet = parseFloat($("betInput").value);

  if (!window.CASINO_CORE.canBet(bet)) return;

  const stake = window.CASINO_CORE.getStakeType(bet);
  window.CASINO_CORE.debit(bet);

  const result = window.CASINO_GAMES.play(UI.game, bet, {
    target: parseFloat($("targetInput").value)
  });

  if (result.payout > 0) {
    window.CASINO_CORE.credit(result.payout, stake === "real");
  }

  updateUI(result);
}

/* =========================================================
AUTO PLAY
========================================================= */

function startAuto() {
  UI.autoRunning = true;

  UI.autoTimer = setInterval(() => {
    if (!UI.autoRunning) return;

    play();
  }, 800);
}

function stopAuto() {
  UI.autoRunning = false;
  clearInterval(UI.autoTimer);
}

/* =========================================================
UI UPDATE
========================================================= */

function updateUI(res) {
  $("resultDisplay").textContent = res.multiplier + "x";

  const log = $("log");
  const el = document.createElement("div");
  el.textContent = res.won
    ? "WIN +" + fmt(res.profit)
    : "LOSE -" + fmt(res.bet);

  el.style.color = res.won ? "lime" : "red";

  log.prepend(el);

  if (log.children.length > 10) {
    log.removeChild(log.lastChild);
  }
}

/* =========================================================
EVENTS
========================================================= */

function bindGlobal() {
  document.addEventListener("click", e => {
    const g = e.target.closest(".game");
    if (g) openGame(g.dataset.game);
  });
}

function bindGame() {
  $("backBtn").onclick = () => {
    stopAuto();
    renderLobby();
  };

  $("playBtn").onclick = play;

  $("autoBtn").onclick = () => {
    if (UI.autoRunning) {
      stopAuto();
      $("autoBtn").textContent = "AUTO";
    } else {
      startAuto();
      $("autoBtn").textContent = "STOP";
    }
  };
}

})();
