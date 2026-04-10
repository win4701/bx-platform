/* =========================================================
   CASINO V3 — CORE
   state + wallet + auto engine
========================================================= */

const CASINO = {
  state: {
    wallet: {
      real: 0,
      trial: 1,
      total: 1
    },

    currentGame: null,
    bet: 0.10,

    auto: {
      running: false,
      rounds: 10,
      roundsLeft: 10,
      delay: 1000,
      stopProfit: 2,
      stopLoss: 2,
      startBalance: 0
    },

    stats: {
      played: 0,
      profit: 0
    }
  },

  refs: {
    autoTimer: null
  }
};

/* ================= HELPERS ================= */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function fmt(n) {
  return Number(n || 0).toFixed(2);
}

/* ================= WALLET ================= */

function recalcWallet() {
  const w = CASINO.state.wallet;
  w.total = +(w.real + w.trial).toFixed(8);
}

function getBalance() {
  recalcWallet();
  return CASINO.state.wallet.total;
}

function canBet(amount) {
  return amount > 0 && amount <= getBalance();
}

function debit(amount) {
  const w = CASINO.state.wallet;

  if (w.trial >= amount) {
    w.trial -= amount;
  } else {
    const left = amount - w.trial;
    w.trial = 0;
    w.real -= left;
  }

  recalcWallet();
}

function credit(amount, isReal = false) {
  if (isReal) CASINO.state.wallet.real += amount;
  else CASINO.state.wallet.trial += amount;

  recalcWallet();
}

/* ================= AUTO ================= */

function startAuto() {
  const a = CASINO.state.auto;

  a.running = true;
  a.roundsLeft = a.rounds;
  a.startBalance = getBalance();

  runAuto();
}

function stopAuto(reason = "Stopped") {
  const a = CASINO.state.auto;
  a.running = false;

  if (CASINO.refs.autoTimer) {
    clearTimeout(CASINO.refs.autoTimer);
    CASINO.refs.autoTimer = null;
  }

  console.log("AUTO:", reason);
}

function runAuto() {
  const a = CASINO.state.auto;

  if (!a.running) return;

  if (a.roundsLeft <= 0) return stopAuto("Finished");

  const profit = getBalance() - a.startBalance;

  if (profit >= a.stopProfit) return stopAuto("Profit hit");
  if (profit <= -a.stopLoss) return stopAuto("Loss hit");

  playRound();

  a.roundsLeft--;

  CASINO.refs.autoTimer = setTimeout(runAuto, a.delay);
    }
/* =========================================================
   CASINO V3 — ENGINE + GAMES
   pure logic (no DOM)
========================================================= */

CASINO.engine = {};
CASINO.games = {};

/* ================= RNG ================= */

function rand() {
  return Math.random();
}

function randInt(min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

/* ================= ENGINE ================= */

CASINO.engine.play = function (gameId, bet, options = {}) {
  const game = CASINO.games[gameId];
  if (!game) {
    return { ok: false, error: "Game not found" };
  }

  return game(bet, options);
};

/* ================= GAMES ================= */

/* ---------- CRASH ---------- */

CASINO.games.crash = function (bet, opts = {}) {
  const target = Math.max(1.01, Number(opts.target || 1.96));

  const r = rand();
  let bust;

  if (r < 0.33) bust = +(1 + rand() * 0.5).toFixed(2);
  else if (r < 0.7) bust = +(1.5 + rand() * 2.5).toFixed(2);
  else if (r < 0.93) bust = +(4 + rand() * 6).toFixed(2);
  else bust = +(10 + rand() * 40).toFixed(2);

  const won = bust >= target;
  const payout = won ? bet * target : 0;

  return {
    ok: true,
    game: "crash",
    multiplier: bust,
    won,
    payout,
    profit: payout - bet,
    meta: { bust, target }
  };
};

/* ---------- DICE ---------- */

CASINO.games.dice = function (bet, opts = {}) {
  const chance = clamp(Number(opts.chance || 50), 1, 95);
  const roll = +(rand() * 100).toFixed(2);

  const payoutMult = +(99 / chance).toFixed(2);
  const won = roll <= chance;

  const payout = won ? bet * payoutMult : 0;

  return {
    ok: true,
    game: "dice",
    multiplier: payoutMult,
    won,
    payout,
    profit: payout - bet,
    meta: { roll, chance }
  };
};

/* ---------- LIMBO ---------- */

CASINO.games.limbo = function (bet, opts = {}) {
  const target = Math.max(1.01, Number(opts.target || 1.96));

  const hit = +(1 + Math.pow(rand() * 10, 1.25)).toFixed(2);
  const won = hit >= target;

  const payout = won ? bet * target : 0;

  return {
    ok: true,
    game: "limbo",
    multiplier: hit,
    won,
    payout,
    profit: payout - bet,
    meta: { hit, target }
  };
};

/* ================= GAME FLOW ================= */

function playRound() {
  const gameId = CASINO.state.currentGame;
  if (!gameId) {
    console.warn("No game selected");
    return;
  }

  const bet = CASINO.state.bet;

  if (!canBet(bet)) {
    console.warn("Invalid bet");
    stopAuto("Invalid bet");
    return;
  }

  const stakeType =
    CASINO.state.wallet.trial >= bet ? "trial" : "real";

  debit(bet);

  const options = getGameOptions(); // من UI لاحقًا

  const result = CASINO.engine.play(gameId, bet, options);

  if (!result.ok) return;

  if (result.payout > 0) {
    credit(result.payout, stakeType === "real");
  }

  CASINO.state.stats.played++;
  CASINO.state.stats.profit += result.profit;

  console.log("RESULT:", result);

  // UI hook (PART 3)
  if (CASINO.onResult) {
    CASINO.onResult(result);
  }
    }
/* =========================================================
   CASINO V3 — UI + APP
   render + events + integration
========================================================= */

CASINO.onResult = null;

/* ================= ROOT ================= */

function mountCasino() {
  let root = document.getElementById("casino");
  if (!root) {
    root = document.createElement("div");
    root.id = "casino";
    document.body.appendChild(root);
  }

  renderLobby();
}

/* ================= LOBBY ================= */

function renderLobby() {
  const root = document.getElementById("casino");

  root.innerHTML = `
    <div style="padding:20px">

      <h2>🎰 BX Casino</h2>

      <div style="margin-bottom:10px">
        Balance: <b id="balance">${fmt(getBalance())} BX</b>
      </div>

      <div id="games"></div>

      <div id="gameView" style="margin-top:20px;"></div>

    </div>
  `;

  const games = ["crash", "dice", "limbo"];

  const gamesDiv = document.getElementById("games");

  games.forEach(g => {
    const btn = document.createElement("button");
    btn.textContent = g.toUpperCase();
    btn.onclick = () => openGame(g);
    gamesDiv.appendChild(btn);
  });
}

/* ================= GAME ================= */

function openGame(gameId) {
  stopAuto(); // 🔥 يمنع block

  CASINO.state.currentGame = gameId;

  const view = document.getElementById("gameView");

  view.innerHTML = `
    <h3>${gameId.toUpperCase()}</h3>

    <div>
      Bet: <input id="betInput" type="number" value="${CASINO.state.bet}" step="0.1">
    </div>

    <div id="gameControls"></div>

    <button id="playBtn">Play</button>
    <button id="autoBtn">Auto</button>

    <div id="result" style="margin-top:15px;font-weight:bold;"></div>
  `;

  renderControls(gameId);
  bindGameEvents();
}

/* ================= CONTROLS ================= */

function renderControls(gameId) {
  const div = document.getElementById("gameControls");

  if (gameId === "crash" || gameId === "limbo") {
    div.innerHTML = `
      Target: <input id="targetInput" value="1.96" step="0.01">
    `;
  }

  if (gameId === "dice") {
    div.innerHTML = `
      Chance: <input id="chanceInput" value="50">
    `;
  }
}

/* ================= OPTIONS ================= */

function getGameOptions() {
  const g = CASINO.state.currentGame;

  if (g === "crash" || g === "limbo") {
    return {
      target: parseFloat(document.getElementById("targetInput")?.value || 1.96)
    };
  }

  if (g === "dice") {
    return {
      chance: parseFloat(document.getElementById("chanceInput")?.value || 50)
    };
  }

  return {};
}

/* ================= EVENTS ================= */

function bindGameEvents() {
  document.getElementById("betInput").oninput = (e) => {
    CASINO.state.bet = parseFloat(e.target.value || 0.1);
  };

  document.getElementById("playBtn").onclick = () => {
    playRound();
  };

  document.getElementById("autoBtn").onclick = () => {
    if (CASINO.state.auto.running) stopAuto();
    else startAuto();
  };
}

/* ================= RESULT UI ================= */

CASINO.onResult = function (result) {
  const el = document.getElementById("result");
  const balance = document.getElementById("balance");

  if (!el) return;

  if (result.won) {
    el.innerHTML = `✅ WIN +${fmt(result.profit)} BX (${fmt(result.multiplier)}x)`;
    el.style.color = "green";
  } else {
    el.innerHTML = `❌ LOSE -${fmt(result.bet)} BX`;
    el.style.color = "red";
  }

  if (balance) {
    balance.textContent = fmt(getBalance()) + " BX";
  }
};

/* ================= BOOT ================= */

document.addEventListener("DOMContentLoaded", () => {
  mountCasino();
});
