/* =========================================
   BLOXIO CASINO — PRO ENGINE UPGRADE
   FINAL MATCH with uploaded casino.html + casino.css
========================================= */

(() => {
  "use strict";

  /* =========================================
     HELPERS
  ========================================= */
  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const round = (n, d = 2) => {
    const p = 10 ** d;
    return Math.round(n * p) / p;
  };
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const randomSeed = (len = 32) => {
    const chars = "abcdef0123456789";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };

  const cardFace = (n) => {
    if (n === 11) return "J";
    if (n === 12) return "Q";
    if (n === 13) return "K";
    if (n === 14) return "A";
    return String(n);
  };

  const cardSuit = () => rand(["♠", "♥", "♣", "♦"]);
  const formatBX = (n) => `${Number(n).toFixed(2)} BX`;

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* =========================================
     ROOT CHECK
  ========================================= */
  const casinoPage = $("casinoPage");
  if (!casinoPage) return;

  /* =========================================
     DOM
  ========================================= */
  const casinoLobby = $("casinoLobby");
  const casinoGameView = $("casinoGameView");
  const casinoGamesGrid = $("casinoGamesGrid");

  const tickerPulse = $("tickerPulse");
  const bigWinsList = $("bigWinsList");

  const casinoBalanceTop = $("casinoBalanceTop");
  const casinoLiveBetsCount = $("casinoLiveBetsCount");
  const casinoVolumeToday = $("casinoVolumeToday");

  const casinoBackBtn = $("casinoBackBtn");
  const casinoAuthBtn = $("casinoAuthBtn");
  const casinoRefreshBtn = $("casinoRefreshBtn");

  const gameEngineCaption = $("gameEngineCaption");
  const gameMultiplierDisplay = $("gameMultiplierDisplay");
  const gameEngineBody = $("gameEngineBody");

  const betAmountInput = $("betAmountInput");
  const dynamicBetControls = $("dynamicBetControls");
  const casinoPlayBtn = $("casinoPlayBtn");

  const serverSeedText = $("serverSeedText");
  const clientSeedText = $("clientSeedText");
  const nonceText = $("nonceText");
  const newSeedBtn = $("newSeedBtn");

  const playersCountText = $("playersCountText");
  const playersVolumeText = $("playersVolumeText");
  const playersTableBody = $("playersTableBody");

  const pulseStrip = document.querySelector(".game-pulse-strip");

  /* =========================================
     STATE
  ========================================= */
  const state = {
    balance: 250.0,
    activeFilter: "all",
    activeGame: null,

    serverSeed: randomSeed(32),
    clientSeed: "client_bloxio_seed",
    nonce: 0,

    betAmount: 10.0,
    currentSettingsTab: "manual",
    currentHeaderTab: "classic",

    // game settings
    limboTarget: 2.0,
    crashAutoCashout: 2.0,
    diceTarget: 50,
    diceMode: "over",
    coinSide: "heads",
    slotMode: "normal",
    plinkoRisk: "medium",
    hiloMode: "higher",
    birdsDifficulty: "easy",

    // session state
    isPlaying: false,
    isTransitioning: false,
    gameHistory: [],
    livePulse: [],
    recentWins: [],

    // crash session
    crashSession: {
      running: false,
      cashedOut: false,
      current: 1.0,
      final: 1.0,
      frame: null,
      startedBet: 0
    },

    // blackjack session
    blackjack: {
      inRound: false,
      player: [],
      dealer: [],
      bet: 0
    },

    // hilo session
    hilo: {
      inRound: false,
      current: 8
    },

    // birds session
    birds: {
      selected: null
    },

    // plinko
    plinko: {
      dropping: false
    },

    timers: {
      ticker: null,
      stats: null,
      players: null,
      engineAmbient: null
    }
  };

  const sampleNames = [
    "alpha", "king", "nova", "ghost", "hex", "milo", "drift", "astro",
    "luna", "volt", "echo", "zen", "omega", "delta", "saber", "raven",
    "vex", "mamba", "hype", "orbit"
  ];

  const currencies = ["BX", "USDT", "USDC", "INR", "NGN", "PKR"];

  /* =========================================
     INIT
  ========================================= */
  init();

  function init() {
    injectProStyles();
    syncInitialBet();
    updateBalanceUI();
    updateFairnessUI();

    state.livePulse = generatePulseHistory(8);
    state.recentWins = generateRecentWins(5);

    renderTickerPulse();
    renderBigWins();
    renderPlayersTable();
    updateTopStats();
    renderPulseStrip();
    bindGlobalEvents();
    startAmbientLoops();
    openLobby(true);
  }

  /* =========================================
     PRO STYLES (JS ONLY)
  ========================================= */
  function injectProStyles() {
    if ($("casinoProRuntimeStyles")) return;

    const style = document.createElement("style");
    style.id = "casinoProRuntimeStyles";
    style.textContent = `
      #casinoPage .view-enter {
        animation: cxFadeIn .28s ease both;
      }
      #casinoPage .view-exit {
        animation: cxFadeOut .20s ease both;
      }
      #casinoPage .card-enter {
        animation: cxScaleIn .22s ease both;
      }
      #casinoPage .cashout-main-btn {
        width: 100%;
        min-height: 58px;
        border: 0;
        border-radius: 16px;
        background: linear-gradient(180deg, #ffb340 0%, #ff9830 100%);
        color: #121212;
        font-size: 18px;
        font-weight: 900;
        cursor: pointer;
        margin-bottom: 14px;
        box-shadow: 0 10px 30px rgba(255, 173, 50, 0.18);
      }
      #casinoPage .result-flash-win {
        animation: cxWinPulse .55s ease;
      }
      #casinoPage .result-flash-loss {
        animation: cxLossPulse .55s ease;
      }
      #casinoPage .slot-reel.spin {
        animation: cxSlotSpin .7s ease;
      }
      #casinoPage .pick-card.revealed-safe {
        box-shadow: 0 0 0 1px rgba(46,229,127,.3), 0 0 24px rgba(46,229,127,.18);
      }
      #casinoPage .pick-card.revealed-bad {
        box-shadow: 0 0 0 1px rgba(255,91,103,.3), 0 0 24px rgba(255,91,103,.18);
      }
      #casinoPage .casino-game-card.launching {
        transform: scale(.98);
        opacity: .88;
      }
      @keyframes cxFadeIn {
        from { opacity:0; transform: translateY(10px); }
        to { opacity:1; transform: translateY(0); }
      }
      @keyframes cxFadeOut {
        from { opacity:1; transform: translateY(0); }
        to { opacity:0; transform: translateY(8px); }
      }
      @keyframes cxScaleIn {
        from { opacity:0; transform: scale(.98); }
        to { opacity:1; transform: scale(1); }
      }
      @keyframes cxWinPulse {
        0% { filter:none; }
        50% { filter: drop-shadow(0 0 18px rgba(46,229,127,.35)); transform: scale(1.03); }
        100% { filter:none; transform: scale(1); }
      }
      @keyframes cxLossPulse {
        0% { filter:none; }
        50% { filter: drop-shadow(0 0 16px rgba(255,91,103,.22)); transform: scale(.985); }
        100% { filter:none; transform: scale(1); }
      }
      @keyframes cxSlotSpin {
        0% { transform: translateY(0) scale(1); }
        30% { transform: translateY(-12px) scale(1.02); }
        70% { transform: translateY(10px) scale(.98); }
        100% { transform: translateY(0) scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  /* =========================================
     BIND EVENTS
  ========================================= */
  function bindGlobalEvents() {
    casinoGamesGrid?.addEventListener("click", async (e) => {
      const card = e.target.closest(".casino-game-card");
      if (!card || state.isTransitioning) return;

      card.classList.add("launching");
      await wait(110);
      card.classList.remove("launching");

      openGame({
        id: card.dataset.game,
        title: card.dataset.title || card.dataset.game || "Game",
        mode: card.dataset.mode || "instant",
        provider: card.dataset.provider || "Bloxio Originals",
        image: card.dataset.image || ""
      });
    });

    $$(".casino-filter-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".casino-filter-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.activeFilter = btn.dataset.filter || "all";
        filterLobbyCards();
      });
    });

    casinoBackBtn?.addEventListener("click", async () => {
      if (state.isTransitioning) return;
      await closeCurrentGameAndReturn();
    });

    casinoAuthBtn?.addEventListener("click", () => {
      casinoAuthBtn.textContent = casinoAuthBtn.textContent === "Connexion" ? "Connected" : "Connexion";
    });

    casinoRefreshBtn?.addEventListener("click", () => {
      updateTopStats();
      state.livePulse = generatePulseHistory(10);
      state.recentWins = generateRecentWins(5);
      renderTickerPulse();
      renderBigWins();
      renderPlayersTable();
      renderPulseStrip();
    });

    betAmountInput?.addEventListener("input", () => {
      const v = parseFloat(betAmountInput.value);
      if (!isNaN(v) && v > 0) state.betAmount = round(v, 2);
    });

    document.addEventListener("click", (e) => {
      const betBtn = e.target.closest("[data-bet-action]");
      if (betBtn) {
        handleBetAction(betBtn.dataset.betAction);
        return;
      }

      const segBtn = e.target.closest(".seg-btn");
      if (segBtn) {
        handleSegBtn(segBtn);
        return;
      }

      const pickCard = e.target.closest(".pick-card");
      if (pickCard && state.activeGame?.id === "birdsparty") {
        handleBirdPick(pickCard);
        return;
      }
    });

    $$(".game-header-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".game-header-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.currentHeaderTab = btn.dataset.modeTab || "classic";
      });
    });

    $$(".settings-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".settings-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.currentSettingsTab = btn.dataset.settingsTab || "manual";
      });
    });

    $$(".settings-tool-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".settings-tool-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    casinoPlayBtn?.addEventListener("click", onPrimaryAction);

    newSeedBtn?.addEventListener("click", () => {
      state.serverSeed = randomSeed(32);
      state.clientSeed = `client_${randInt(1000, 9999)}`;
      state.nonce = 0;
      updateFairnessUI();
      setCaption("New fairness seed generated");
    });
  }

  /* =========================================
     LOBBY / VIEW TRANSITIONS
  ========================================= */
  function openLobby(initial = false) {
    stopAmbientEngine();
    stopCrashSession(true);

    state.activeGame = null;
    state.isPlaying = false;

    casinoGameView?.classList.add("hidden");
    casinoLobby?.classList.remove("hidden");

    if (!initial) {
      casinoLobby?.classList.remove("view-exit");
      casinoLobby?.classList.add("view-enter");
      setTimeout(() => casinoLobby?.classList.remove("view-enter"), 300);
    }

    filterLobbyCards();
  }

  async function openGame(game) {
    state.isTransitioning = true;
    stopAmbientEngine();
    stopCrashSession(true);
    resetGameSessionStates();

    casinoLobby?.classList.add("view-exit");
    await wait(180);

    casinoLobby?.classList.add("hidden");
    casinoLobby?.classList.remove("view-exit");

    state.activeGame = game;
    state.isPlaying = false;

    casinoGameView?.classList.remove("hidden");
    casinoGameView?.classList.add("view-enter");
    setTimeout(() => casinoGameView?.classList.remove("view-enter"), 300);

    gameEngineCaption.textContent = getGameCaption(game.id);
    gameMultiplierDisplay.textContent = "1.00×";

    renderDynamicControls(game.id);
    renderGameEngine(game.id);
    renderPlayersTable();
    renderPulseStrip();
    updatePrimaryButtonState();
    startAmbientEngine(game.id);

    state.isTransitioning = false;
  }

  async function closeCurrentGameAndReturn() {
    state.isTransitioning = true;
    stopCrashSession(true);
    stopAmbientEngine();

    casinoGameView?.classList.add("view-exit");
    await wait(180);

    casinoGameView?.classList.add("hidden");
    casinoGameView?.classList.remove("view-exit");

    openLobby();
    state.isTransitioning = false;
  }

  function filterLobbyCards() {
    const cards = $$(".casino-game-card", casinoGamesGrid);
    cards.forEach((card) => {
      const mode = card.dataset.mode || "instant";
      let show = true;

      if (state.activeFilter === "instant") show = mode === "instant";
      else if (state.activeFilter === "provably") show = mode === "provably";
      else if (state.activeFilter === "slots") show = mode === "slots";

      card.style.display = show ? "" : "none";
    });
  }

  /* =========================================
     TOP LIVE DATA
  ========================================= */
  function updateTopStats() {
    const liveBets = randInt(6000, 15000);
    const volume = randInt(80000, 300000);

    if (casinoLiveBetsCount) casinoLiveBetsCount.textContent = liveBets.toLocaleString();
    if (casinoVolumeToday) casinoVolumeToday.textContent = `${volume.toLocaleString()} BX`;
  }

  function generatePulseHistory(count = 8) {
    return Array.from({ length: count }).map(() => {
      const mult = Math.random() > 0.55
        ? round(Math.random() * 3 + 1.1, 2)
        : round(Math.random() * 0.5 + 1.01, 2);
      return mult;
    });
  }

  function generateRecentWins(count = 5) {
    return Array.from({ length: count }).map(() => ({
      player: `@${rand(sampleNames)}`,
      game: rand(["Crash", "Dice", "Plinko", "Limbo", "Slot", "Blackjack"]),
      amount: `+${(Math.random() * 250 + 10).toFixed(2)} BX`
    }));
  }

  function renderTickerPulse() {
    if (!tickerPulse) return;

    const items = Array.from({ length: 10 }).map(() => {
      const win = Math.random() > 0.4;
      const player = rand(sampleNames);
      const game = rand(["Crash", "Dice", "Plinko", "Limbo", "Coin Flip", "Slot"]);
      const value = (Math.random() * 120 + 5).toFixed(2);
      return `<div class="ticker-item ${win ? "win" : "loss"}">${win ? "🔥" : "🔻"} @${player} ${win ? "won" : "lost"} ${win ? "+" : "-"}${value} BX on ${game}</div>`;
    });

    tickerPulse.innerHTML = items.join("");
  }

  function renderBigWins() {
    if (!bigWinsList) return;

    bigWinsList.innerHTML = state.recentWins.map((w) => `
      <div class="big-win-row">
        <span class="player">${w.player}</span>
        <span class="game">${w.game}</span>
        <span class="amount">${w.amount}</span>
      </div>
    `).join("");
  }

  function renderPulseStrip() {
    if (!pulseStrip) return;

    const pills = state.livePulse.slice(-8).map((mult) => {
      const green = mult >= 2;
      return `<div class="pulse-pill ${green ? "green" : "orange"}">${mult.toFixed(2)}×</div>`;
    }).join("");

    pulseStrip.innerHTML = `
      ${pills}
      <button class="pulse-mini-btn" type="button">🕒</button>
      <button class="pulse-mini-btn" type="button">☷</button>
    `;
  }

  function pushPulse(mult) {
    state.livePulse.push(mult);
    if (state.livePulse.length > 16) state.livePulse.shift();
    renderPulseStrip();
  }

  function renderPlayersTable() {
    if (!playersTableBody) return;

    const rows = Array.from({ length: 10 }).map(() => {
      const player = `@${rand(sampleNames)}`;
      const cashout = Math.random() > 0.45 ? `${(Math.random() * 4 + 1).toFixed(2)}×` : "-";
      const amount = `${randInt(5, 5000).toLocaleString()} ${rand(currencies)}`;

      return `
        <div class="player-row">
          <span class="name">${player}</span>
          <span class="cashout">${cashout}</span>
          <span class="amount">${amount}</span>
        </div>
      `;
    });

    playersTableBody.innerHTML = rows.join("");
    playersCountText.textContent = `0/${randInt(120, 1355)} Joueurs`;
    playersVolumeText.textContent = `${(Math.random() * 9000 + 1000).toFixed(2)} $US`;
  }

  function startAmbientLoops() {
    clearInterval(state.timers.ticker);
    clearInterval(state.timers.stats);
    clearInterval(state.timers.players);

    state.timers.ticker = setInterval(renderTickerPulse, 7000);
    state.timers.stats = setInterval(() => {
      updateTopStats();
      state.recentWins = generateRecentWins(5);
      renderBigWins();
    }, 9000);
    state.timers.players = setInterval(renderPlayersTable, 8000);
  }

  /* =========================================
     FAIRNESS / BALANCE
  ========================================= */
  function updateBalanceUI() {
    if (casinoBalanceTop) casinoBalanceTop.textContent = formatBX(state.balance);
    if (betAmountInput) betAmountInput.value = Number(state.betAmount).toFixed(2);
  }

  function updateFairnessUI() {
    if (serverSeedText) serverSeedText.textContent = state.serverSeed;
    if (clientSeedText) clientSeedText.textContent = state.clientSeed;
    if (nonceText) nonceText.textContent = String(state.nonce);
  }

  function syncInitialBet() {
    if (betAmountInput) betAmountInput.value = state.betAmount.toFixed(2);
  }

  function spendBet(amount) {
    state.balance = round(state.balance - amount, 2);
    state.balance = Math.max(0, state.balance);
    updateBalanceUI();
  }

  function addPayout(amount) {
    state.balance = round(state.balance + amount, 2);
    updateBalanceUI();
  }

  function canAfford(bet) {
    return bet > 0 && bet <= state.balance;
  }

  /* =========================================
     BUTTON / CAPTION / FX
  ========================================= */
  function setCaption(text) {
    if (gameEngineCaption) gameEngineCaption.textContent = text;
  }

  function setMultiplier(v) {
    if (gameMultiplierDisplay) gameMultiplierDisplay.textContent = `${Number(v).toFixed(2)}×`;
  }

  function flashResult(win = true) {
    if (!gameMultiplierDisplay) return;
    gameMultiplierDisplay.classList.remove("result-flash-win", "result-flash-loss");
    void gameMultiplierDisplay.offsetWidth;
    gameMultiplierDisplay.classList.add(win ? "result-flash-win" : "result-flash-loss");
  }

  function updatePrimaryButtonState() {
    if (!casinoPlayBtn || !state.activeGame) return;

    casinoPlayBtn.classList.remove("cashout-main-btn");
    casinoPlayBtn.disabled = false;

    if (state.activeGame.id === "crash" && state.crashSession.running && !state.crashSession.cashedOut) {
      casinoPlayBtn.textContent = `Cashout ${state.crashSession.current.toFixed(2)}×`;
      casinoPlayBtn.classList.add("cashout-main-btn");
      return;
    }

    if (state.activeGame.id === "blackjack" && state.blackjack.inRound) {
      casinoPlayBtn.textContent = "Round Active";
      casinoPlayBtn.disabled = true;
      return;
    }

    if (state.activeGame.id === "hilo" && state.hilo.inRound) {
      casinoPlayBtn.textContent = "Next Round";
      return;
    }

    casinoPlayBtn.textContent = "Pari";
  }

  /* =========================================
     BET ACTIONS
  ========================================= */
  function handleBetAction(action) {
    switch (action) {
      case "half":
        state.betAmount = Math.max(0.01, round(state.betAmount / 2, 2));
        break;
      case "double":
        state.betAmount = round(state.betAmount * 2, 2);
        break;
      case "up":
        state.betAmount = round(state.betAmount + 1, 2);
        break;
    }
    updateBalanceUI();
  }

  /* =========================================
     GAME CONTROLS
  ========================================= */
  function renderDynamicControls(gameId) {
    if (!dynamicBetControls) return;

    switch (gameId) {
      case "coinflip":
        dynamicBetControls.innerHTML = `
          <div class="dynamic-card card-enter">
            <div class="dynamic-card-title">Pick Side</div>
            <div class="segmented-row">
              <button class="seg-btn ${state.coinSide === "heads" ? "active" : ""}" data-seg="coin" data-value="heads">Heads</button>
              <button class="seg-btn ${state.coinSide === "tails" ? "active" : ""}" data-seg="coin" data-value="tails">Tails</button>
            </div>
          </div>
        `;
        break;

      case "limbo":
      case "airboss":
      case "bananafarm":
        dynamicBetControls.innerHTML = `
          <div class="dynamic-card card-enter">
            <div class="inline-value-row">
              <span>Target Multiplier</span>
              <strong>${state.limboTarget.toFixed(2)}×</strong>
            </div>
            <input class="mini-input" id="limboTargetInput" type="number" min="1.01" step="0.01" value="${state.limboTarget.toFixed(2)}">
          </div>
        `;
        attachLimboInput();
        break;

      case "crash":
        dynamicBetControls.innerHTML = `
          <div class="dynamic-card card-enter">
            <div class="inline-value-row">
              <span>Auto Cashout</span>
              <strong>${state.crashAutoCashout.toFixed(2)}×</strong>
            </div>
            <input class="mini-input" id="crashAutoInput" type="number" min="1.01" step="0.01" value="${state.crashAutoCashout.toFixed(2)}">
          </div>
        `;
        attachCrashInput();
        break;

      case "dice":
        dynamicBetControls.innerHTML = `
          <div class="dynamic-card card-enter">
            <div class="inline-value-row">
              <span>Target</span>
              <strong>${state.diceTarget}</strong>
            </div>
            <input type="range" id="diceRangeInput" min="2" max="98" step="1" value="${state.diceTarget}">
            <input class="mini-input" id="diceTargetInput" type="number" min="2" max="98" step="1" value="${state.diceTarget}">
            <div class="segmented-row" style="margin-top:10px;">
              <button class="seg-btn ${state.diceMode === "over" ? "active" : ""}" data-seg="dice-mode" data-value="over">Roll Over</button>
              <button class="seg-btn ${state.diceMode === "under" ? "active" : ""}" data-seg="dice-mode" data-value="under">Roll Under</button>
            </div>
          </div>
        `;
        attachDiceInputs();
        break;

      case "slot":
      case "fruitparty":
        dynamicBetControls.innerHTML = `
          <div class="dynamic-card card-enter">
            <div class="dynamic-card-title">Spin Mode</div>
            <div class="segmented-row three">
              <button class="seg-btn ${state.slotMode === "normal" ? "active" : ""}" data-seg="slot" data-value="normal">Normal</button>
              <button class="seg-btn ${state.slotMode === "turbo" ? "active" : ""}" data-seg="slot" data-value="turbo">Turbo</button>
              <button class="seg-btn ${state.slotMode === "bonus" ? "active" : ""}" data-seg="slot" data-value="bonus">Bonus</button>
            </div>
          </div>
        `;
        break;

      case "birdsparty":
        dynamicBetControls.innerHTML = `
          <div class="dynamic-card card-enter">
            <div class="dynamic-card-title">Difficulty</div>
            <div class="segmented-row three">
              <button class="seg-btn ${state.birdsDifficulty === "easy" ? "active" : ""}" data-seg="birds" data-value="easy">Easy</button>
              <button class="seg-btn ${state.birdsDifficulty === "medium" ? "active" : ""}" data-seg="birds" data-value="medium">Medium</button>
              <button class="seg-btn ${state.birdsDifficulty === "hard" ? "active" : ""}" data-seg="birds" data-value="hard">Hard</button>
            </div>
          </div>
        `;
        break;

      case "plinko":
        dynamicBetControls.innerHTML = `
          <div class="dynamic-card card-enter">
            <div class="dynamic-card-title">Risk</div>
            <div class="segmented-row three">
              <button class="seg-btn ${state.plinkoRisk === "low" ? "active" : ""}" data-seg="plinko" data-value="low">Low</button>
              <button class="seg-btn ${state.plinkoRisk === "medium" ? "active" : ""}" data-seg="plinko" data-value="medium">Medium</button>
              <button class="seg-btn ${state.plinkoRisk === "high" ? "active" : ""}" data-seg="plinko" data-value="high">High</button>
            </div>
          </div>
        `;
        break;

      case "hilo":
        dynamicBetControls.innerHTML = `
          <div class="dynamic-card card-enter">
            <div class="dynamic-card-title">Prediction</div>
            <div class="segmented-row">
              <button class="seg-btn ${state.hiloMode === "higher" ? "active" : ""}" data-seg="hilo" data-value="higher">Higher</button>
              <button class="seg-btn ${state.hiloMode === "lower" ? "active" : ""}" data-seg="hilo" data-value="lower">Lower</button>
            </div>
          </div>
        `;
        break;

      case "blackjack":
        dynamicBetControls.innerHTML = `
          <div class="dynamic-card card-enter">
            <div class="dynamic-card-title">Actions</div>
            <div class="segmented-row three">
              <button class="seg-btn" data-seg="bj-action" data-value="hit">Hit</button>
              <button class="seg-btn" data-seg="bj-action" data-value="stand">Stand</button>
              <button class="seg-btn" data-seg="bj-action" data-value="double">Double</button>
            </div>
          </div>
        `;
        break;

      default:
        dynamicBetControls.innerHTML = `
          <div class="dynamic-card card-enter">
            <div class="dynamic-card-title">Game Ready</div>
            <div class="engine-muted">Default Bloxio controls loaded.</div>
          </div>
        `;
    }
  }

  function handleSegBtn(btn) {
    const seg = btn.dataset.seg;
    const value = btn.dataset.value;
    if (!seg) return;

    if (seg !== "bj-action") {
      const parent = btn.parentElement;
      if (parent) parent.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    }

    switch (seg) {
      case "coin":
        state.coinSide = value;
        break;
      case "dice-mode":
        state.diceMode = value;
        break;
      case "slot":
        state.slotMode = value;
        break;
      case "plinko":
        state.plinkoRisk = value;
        break;
      case "hilo":
        state.hiloMode = value;
        break;
      case "birds":
        state.birdsDifficulty = value;
        break;
      case "bj-action":
        handleBlackjackAction(value);
        break;
    }
  }

  function attachLimboInput() {
    const input = $("limboTargetInput");
    if (!input) return;
    input.addEventListener("input", () => {
      const v = parseFloat(input.value);
      if (!isNaN(v) && v >= 1.01) {
        state.limboTarget = round(v, 2);
        renderDynamicControls(state.activeGame.id);
      }
    });
  }

  function attachCrashInput() {
    const input = $("crashAutoInput");
    if (!input) return;
    input.addEventListener("input", () => {
      const v = parseFloat(input.value);
      if (!isNaN(v) && v >= 1.01) {
        state.crashAutoCashout = round(v, 2);
        renderDynamicControls(state.activeGame.id);
      }
    });
  }

  function attachDiceInputs() {
    const range = $("diceRangeInput");
    const input = $("diceTargetInput");
    if (!range || !input) return;

    range.addEventListener("input", () => {
      state.diceTarget = parseInt(range.value, 10);
      input.value = state.diceTarget;
      updateDicePreview();
    });

    input.addEventListener("input", () => {
      const v = parseInt(input.value, 10);
      if (!isNaN(v)) {
        state.diceTarget = clamp(v, 2, 98);
        range.value = state.diceTarget;
        input.value = state.diceTarget;
        updateDicePreview();
      }
    });

    updateDicePreview();
  }

  /* =========================================
     ENGINE RENDER
  ========================================= */
  function renderGameEngine(gameId) {
    if (!gameEngineBody) return;

    switch (gameId) {
      case "limbo":
      case "airboss":
      case "bananafarm":
        gameEngineBody.innerHTML = rocketEngineHTML();
        break;
      case "crash":
        gameEngineBody.innerHTML = crashEngineHTML();
        break;
      case "coinflip":
        gameEngineBody.innerHTML = coinflipEngineHTML();
        break;
      case "dice":
        gameEngineBody.innerHTML = diceEngineHTML();
        break;
      case "slot":
      case "fruitparty":
        gameEngineBody.innerHTML = slotEngineHTML();
        break;
      case "birdsparty":
        gameEngineBody.innerHTML = birdsEngineHTML();
        break;
      case "blackjack":
        gameEngineBody.innerHTML = blackjackEngineHTML();
        break;
      case "plinko":
        gameEngineBody.innerHTML = plinkoEngineHTML();
        createPlinkoPegs();
        createPlinkoBuckets();
        break;
      case "hilo":
        gameEngineBody.innerHTML = hiloEngineHTML();
        break;
      default:
        gameEngineBody.innerHTML = `
          <div class="engine-center">
            <div class="engine-card">
              <div class="engine-muted">Game Engine Loaded</div>
            </div>
          </div>
        `;
    }
  }

  function rocketEngineHTML() {
    return `
      <div class="engine-center">
        <div class="rocket-scene">
          <div class="rocket-ship" id="rocketShip">🚀</div>
          <div class="rocket-smoke">☁️</div>
          <div class="rocket-ground"></div>
        </div>
      </div>
    `;
  }

  function crashEngineHTML() {
    return `
      <div class="engine-center">
        <div class="crash-chart-wrap">
          <svg class="crash-chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path id="crashPath" class="crash-line" d="M6,88 C18,86 24,84 30,80 C40,73 52,58 62,40 C68,28 76,18 90,10"></path>
            <circle id="crashDot" class="crash-dot" cx="6" cy="88" r="3.2"></circle>
          </svg>
        </div>
      </div>
    `;
  }

  function coinflipEngineHTML() {
    return `
      <div class="engine-column">
        <div class="engine-muted">Choose your side</div>
        <div style="font-size:96px;" id="coinFlipVisual">🪙</div>
      </div>
    `;
  }

  function diceEngineHTML() {
    return `
      <div class="engine-center">
        <div class="dice-stage">
          <div class="dice-number" id="diceNumber">50.00</div>
          <div class="dice-bar">
            <div class="dice-fill" id="diceFill"></div>
          </div>
        </div>
      </div>
    `;
  }

  function slotEngineHTML() {
    return `
      <div class="engine-center">
        <div class="slot-reels" id="slotReels">
          <div class="slot-reel">🍒</div>
          <div class="slot-reel">7️⃣</div>
          <div class="slot-reel">💎</div>
        </div>
      </div>
    `;
  }

  function birdsEngineHTML() {
    return `
      <div class="engine-center">
        <div class="pick-grid" id="birdsPickGrid">
          <button class="pick-card" type="button" data-pick="0">🐦</button>
          <button class="pick-card" type="button" data-pick="1">🥚</button>
          <button class="pick-card" type="button" data-pick="2">🐦</button>
          <button class="pick-card" type="button" data-pick="3">🥚</button>
          <button class="pick-card" type="button" data-pick="4">🐦</button>
          <button class="pick-card" type="button" data-pick="5">🥚</button>
        </div>
      </div>
    `;
  }

  function blackjackEngineHTML() {
    return `
      <div class="engine-center">
        <div class="blackjack-board">
          <div class="bj-hand">
            <div class="bj-label">Dealer</div>
            <div class="bj-score" id="dealerScore">0</div>
            <div class="bj-cards" id="dealerCards"></div>
          </div>
          <div class="bj-hand">
            <div class="bj-label">Player</div>
            <div class="bj-score" id="playerScore">0</div>
            <div class="bj-cards" id="playerCards"></div>
          </div>
        </div>
      </div>
    `;
  }

  function plinkoEngineHTML() {
    return `
      <div class="engine-center">
        <div class="plinko-board" id="plinkoBoard">
          <div class="plinko-ball" id="plinkoBall" style="top:12px; left:50%; transform:translateX(-50%);"></div>
        </div>
      </div>
    `;
  }

  function hiloEngineHTML() {
    return `
      <div class="engine-center">
        <div class="hilo-card-wrap">
          <div class="engine-muted">Current Card</div>
          <div class="hilo-card" id="hiloCard">8♣</div>
        </div>
      </div>
    `;
  }

  /* =========================================
     PRIMARY ACTION
  ========================================= */
  function onPrimaryAction() {
    if (!state.activeGame || state.isTransitioning) return;

    const gameId = state.activeGame.id;

    if (gameId === "crash" && state.crashSession.running && !state.crashSession.cashedOut) {
      cashoutCrash();
      return;
    }

    if (state.isPlaying) return;

    const bet = parseFloat(betAmountInput?.value || state.betAmount);
    if (isNaN(bet) || bet <= 0) {
      setCaption("Invalid bet amount");
      return;
    }

    state.betAmount = round(bet, 2);

    if (!canAfford(state.betAmount)) {
      setCaption("Insufficient balance");
      return;
    }

    switch (gameId) {
      case "coinflip":
        return playCoinFlip();
      case "limbo":
      case "airboss":
      case "bananafarm":
        return playLimboLike();
      case "crash":
        return startCrashRound();
      case "dice":
        return playDice();
      case "slot":
      case "fruitparty":
        return playSlot();
      case "birdsparty":
        return playBirds();
      case "blackjack":
        return startBlackjackRound();
      case "plinko":
        return playPlinko();
      case "hilo":
        return playHiLo();
      default:
        setCaption("Game not available");
    }
  }

  /* =========================================
     COMMON RESULT FLOW
  ========================================= */
  function finalizeRound({ win, payout = 0, multiplier = 1, message = "Result updated" }) {
    state.nonce += 1;
    updateFairnessUI();

    if (win && payout > 0) {
      addPayout(payout);
      flashResult(true);
    } else {
      flashResult(false);
    }

    setMultiplier(multiplier);
    setCaption(message);
    pushPulse(multiplier);

    renderPlayersTable();
    renderTickerPulse();

    if (win && payout > 0) {
      state.recentWins.unshift({
        player: "@you",
        game: state.activeGame?.title || "Game",
        amount: `+${payout.toFixed(2)} BX`
      });
      state.recentWins = state.recentWins.slice(0, 5);
      renderBigWins();
    }

    state.isPlaying = false;
    updatePrimaryButtonState();
  }

  /* =========================================
     GAME: COIN FLIP
  ========================================= */
  async function playCoinFlip() {
    state.isPlaying = true;
    updatePrimaryButtonState();
    spendBet(state.betAmount);

    const visual = $("coinFlipVisual");
    if (visual) {
      visual.textContent = "🌀";
      visual.style.transform = "scale(1.06) rotate(360deg)";
      visual.style.transition = "all 550ms ease";
    }

    await wait(700);

    const landed = Math.random() > 0.5 ? "heads" : "tails";
    const win = landed === state.coinSide;
    const payout = win ? round(state.betAmount * 1.96, 2) : 0;

    if (visual) {
      visual.textContent = landed === "heads" ? "🪙" : "🥇";
      visual.style.transform = "scale(1)";
    }

    finalizeRound({
      win,
      payout,
      multiplier: win ? 1.96 : 0,
      message: win ? `You won on ${landed}` : `${landed} landed`
    });
  }

  /* =========================================
     GAME: LIMBO / AIRBOSS / BANANAFARM
  ========================================= */
  async function playLimboLike() {
    state.isPlaying = true;
    updatePrimaryButtonState();
    spendBet(state.betAmount);

    const rolled = round(Math.max(1.0, Math.random() * 20), 2);
    animateRocket(rolled);

    let live = 1.0;
    const interval = setInterval(() => {
      live += Math.max(0.05, (rolled - 1) / 20);
      setMultiplier(Math.min(live, rolled));
      if (live >= rolled) clearInterval(interval);
    }, 45);

    await wait(900);

    const win = rolled >= state.limboTarget;
    const payout = win ? round(state.betAmount * state.limboTarget, 2) : 0;

    finalizeRound({
      win,
      payout,
      multiplier: rolled,
      message: `Result ${rolled.toFixed(2)}×`
    });
  }

  /* =========================================
     GAME: CRASH (REAL LOOP)
  ========================================= */
  function startCrashRound() {
    state.isPlaying = true;
    spendBet(state.betAmount);

    state.crashSession.running = true;
    state.crashSession.cashedOut = false;
    state.crashSession.current = 1.0;
    state.crashSession.startedBet = state.betAmount;
    state.crashSession.final = generateCrashPoint();

    updatePrimaryButtonState();
    setCaption("Crash round started");
    setMultiplier(1.0);

    animateCrashCurveLive();
    crashLoop();
  }

  function generateCrashPoint() {
    const r = Math.random();
    if (r < 0.35) return round(1.01 + Math.random() * 0.5, 2);
    if (r < 0.7) return round(1.5 + Math.random() * 2.5, 2);
    if (r < 0.92) return round(4 + Math.random() * 6, 2);
    return round(10 + Math.random() * 15, 2);
  }

  function crashLoop() {
    const tick = () => {
      if (!state.crashSession.running) return;

      state.crashSession.current = round(state.crashSession.current * 1.018 + 0.01, 2);
      setMultiplier(state.crashSession.current);
      updatePrimaryButtonState();
      animateCrashDotLive(state.crashSession.current);

      if (!state.crashSession.cashedOut && state.crashSession.current >= state.crashAutoCashout) {
        cashoutCrash();
        return;
      }

      if (state.crashSession.current >= state.crashSession.final) {
        endCrashRound();
        return;
      }

      state.crashSession.frame = requestAnimationFrame(() => setTimeout(tick, 70));
    };

    tick();
  }

  function cashoutCrash() {
    if (!state.crashSession.running || state.crashSession.cashedOut) return;

    state.crashSession.cashedOut = true;
    const payout = round(state.crashSession.startedBet * state.crashSession.current, 2);

    addPayout(payout);
    flashResult(true);
    setCaption(`Cashed out at ${state.crashSession.current.toFixed(2)}×`);
    pushPulse(state.crashSession.current);

    state.recentWins.unshift({
      player: "@you",
      game: "Crash",
      amount: `+${payout.toFixed(2)} BX`
    });
    state.recentWins = state.recentWins.slice(0, 5);
    renderBigWins();

    updatePrimaryButtonState();
  }

  function endCrashRound() {
    cancelAnimationFrame(state.crashSession.frame);

    const finalMult = state.crashSession.final;
    const won = state.crashSession.cashedOut;

    if (!won) {
      flashResult(false);
      setCaption(`Crashed at ${finalMult.toFixed(2)}×`);
      pushPulse(finalMult);
    }

    state.nonce += 1;
    updateFairnessUI();

    state.crashSession.running = false;
    state.isPlaying = false;
    updatePrimaryButtonState();
    renderPlayersTable();
    renderTickerPulse();
  }

  function stopCrashSession(silent = false) {
    cancelAnimationFrame(state.crashSession.frame);
    state.crashSession.running = false;
    state.crashSession.cashedOut = false;
    state.crashSession.current = 1.0;
    state.crashSession.final = 1.0;
    if (!silent && state.activeGame?.id === "crash") {
      setMultiplier(1.0);
      setCaption("Crash reset");
    }
  }

  /* =========================================
     GAME: DICE
  ========================================= */
  async function playDice() {
    state.isPlaying = true;
    updatePrimaryButtonState();
    spendBet(state.betAmount);

    const diceNumber = $("diceNumber");
    const diceFill = $("diceFill");

    for (let i = 0; i < 18; i++) {
      const fake = round(Math.random() * 100, 2);
      if (diceNumber) diceNumber.textContent = fake.toFixed(2);
      if (diceFill) diceFill.style.width = `${fake}%`;
      await wait(35);
    }

    const rolled = round(Math.random() * 100, 2);
    const win = state.diceMode === "over"
      ? rolled > state.diceTarget
      : rolled < state.diceTarget;

    const chance = state.diceMode === "over"
      ? (100 - state.diceTarget)
      : state.diceTarget;

    const payoutMult = round((99 / chance), 2);
    const payout = win ? round(state.betAmount * payoutMult, 2) : 0;

    if (diceNumber) diceNumber.textContent = rolled.toFixed(2);
    if (diceFill) diceFill.style.width = `${rolled}%`;

    finalizeRound({
      win,
      payout,
      multiplier: win ? payoutMult : 0,
      message: `Rolled ${rolled.toFixed(2)}`
    });
  }

  /* =========================================
     GAME: SLOT / FRUIT PARTY
  ========================================= */
  async function playSlot() {
    state.isPlaying = true;
    updatePrimaryButtonState();
    spendBet(state.betAmount);

    const icons = ["🍒", "7️⃣", "💎", "🍋", "⭐", "🔔"];
    const reelsWrap = $("slotReels");
    if (!reelsWrap) return;

    const reels = [...reelsWrap.children];
    reels.forEach((r) => r.classList.add("spin"));

    for (let spin = 0; spin < 12; spin++) {
      reels.forEach((reel) => reel.textContent = rand(icons));
      await wait(state.slotMode === "turbo" ? 45 : 80);
    }

    const final = [rand(icons), rand(icons), rand(icons)];
    reels.forEach((reel, i) => {
      reel.textContent = final[i];
      reel.classList.remove("spin");
    });

    const counts = final.reduce((acc, x) => (acc[x] = (acc[x] || 0) + 1, acc), {});
    const maxMatch = Math.max(...Object.values(counts));

    let multiplier = 0;
    if (maxMatch === 3) multiplier = state.slotMode === "bonus" ? 8 : 5;
    else if (maxMatch === 2) multiplier = 1.5;

    const win = multiplier > 0;
    const payout = win ? round(state.betAmount * multiplier, 2) : 0;

    finalizeRound({
      win,
      payout,
      multiplier,
      message: final.join(" ")
    });
  }

  /* =========================================
     GAME: BIRDS PARTY
  ========================================= */
  function handleBirdPick(card) {
    $$(".pick-card").forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    state.birds.selected = Number(card.dataset.pick);
    setCaption("Selection ready — place your bet");
  }

  async function playBirds() {
    if (state.birds.selected === null || state.birds.selected === undefined) {
      setCaption("Select a card first");
      return;
    }

    state.isPlaying = true;
    updatePrimaryButtonState();
    spendBet(state.betAmount);

    const cards = $$(".pick-card");
    cards.forEach((c) => c.disabled = true);

    const safeIndex = randInt(0, cards.length - 1);
    await wait(500);

    cards.forEach((c, i) => {
      c.classList.remove("revealed-safe", "revealed-bad");
      c.textContent = i === safeIndex ? "💎" : "💣";
      c.classList.add(i === safeIndex ? "revealed-safe" : "revealed-bad");
    });

    const selected = state.birds.selected;
    const win = selected === safeIndex;

    let multiplier = 0;
    if (state.birdsDifficulty === "easy") multiplier = 2.0;
    if (state.birdsDifficulty === "medium") multiplier = 3.0;
    if (state.birdsDifficulty === "hard") multiplier = 5.0;

    const payout = win ? round(state.betAmount * multiplier, 2) : 0;

    await wait(900);

    finalizeRound({
      win,
      payout,
      multiplier: win ? multiplier : 0,
      message: win ? "Safe pick!" : "Wrong pick"
    });

    await wait(800);
    renderGameEngine("birdsparty");
    state.birds.selected = null;
  }

  /* =========================================
     GAME: BLACKJACK (REAL SESSION)
  ========================================= */
  function drawCard() {
    return randInt(2, 14);
  }

  function handValue(hand) {
    let total = 0;
    let aces = 0;

    hand.forEach((c) => {
      if (c >= 11 && c <= 13) total += 10;
      else if (c === 14) {
        total += 11;
        aces += 1;
      } else total += c;
    });

    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return total;
  }

  function renderBlackjackHands(revealDealer = false) {
    const dealerCards = $("dealerCards");
    const playerCards = $("playerCards");
    const dealerScore = $("dealerScore");
    const playerScore = $("playerScore");
    if (!dealerCards || !playerCards || !dealerScore || !playerScore) return;

    dealerCards.innerHTML = state.blackjack.dealer.map((c, i) => {
      if (!revealDealer && i === 1) return `<div class="bj-card">🂠</div>`;
      return `<div class="bj-card">${cardFace(c)}${cardSuit()}</div>`;
    }).join("");

    playerCards.innerHTML = state.blackjack.player.map((c) =>
      `<div class="bj-card">${cardFace(c)}${cardSuit()}</div>`
    ).join("");

    dealerScore.textContent = revealDealer ? handValue(state.blackjack.dealer) : cardValueVisible(state.blackjack.dealer[0]);
    playerScore.textContent = handValue(state.blackjack.player);
  }

  function cardValueVisible(c) {
    if (c >= 11 && c <= 13) return 10;
    if (c === 14) return 11;
    return c;
  }

  function startBlackjackRound() {
    if (state.blackjack.inRound) return;
    if (!canAfford(state.betAmount)) {
      setCaption("Insufficient balance");
      return;
    }

    spendBet(state.betAmount);

    state.blackjack.inRound = true;
    state.blackjack.bet = state.betAmount;
    state.blackjack.player = [drawCard(), drawCard()];
    state.blackjack.dealer = [drawCard(), drawCard()];

    renderBlackjackHands(false);
    updatePrimaryButtonState();

    const playerVal = handValue(state.blackjack.player);
    if (playerVal === 21) {
      finishBlackjackRound();
    } else {
      setCaption("Blackjack round started");
      setMultiplier(1.00);
    }
  }

  function handleBlackjackAction(action) {
    if (!state.activeGame || state.activeGame.id !== "blackjack") return;
    if (!state.blackjack.inRound) return;

    if (action === "hit") {
      state.blackjack.player.push(drawCard());
      renderBlackjackHands(false);

      if (handValue(state.blackjack.player) > 21) {
        finishBlackjackRound();
      } else {
        setCaption("Player hits");
      }
    }

    if (action === "stand") {
      finishBlackjackRound();
    }

    if (action === "double") {
      if (state.balance < state.blackjack.bet) {
        setCaption("Need more balance to double");
        return;
      }
      spendBet(state.blackjack.bet);
      state.blackjack.bet = round(state.blackjack.bet * 2, 2);
      state.blackjack.player.push(drawCard());
      renderBlackjackHands(false);
      finishBlackjackRound();
    }
  }

  function finishBlackjackRound() {
    while (handValue(state.blackjack.dealer) < 17) {
      state.blackjack.dealer.push(drawCard());
    }

    renderBlackjackHands(true);

    const p = handValue(state.blackjack.player);
    const d = handValue(state.blackjack.dealer);

    let win = false;
    let multiplier = 0;
    let payout = 0;
    let msg = `Player ${p} • Dealer ${d}`;

    if (p > 21) {
      win = false;
      msg = `Bust! Player ${p} • Dealer ${d}`;
    } else if (d > 21 || p > d) {
      win = true;
      multiplier = 2;
      payout = round(state.blackjack.bet * 2, 2);
      msg = `You win! Player ${p} • Dealer ${d}`;
    } else if (p === d) {
      win = true;
      multiplier = 1;
      payout = round(state.blackjack.bet, 2);
      msg = `Push • Player ${p} • Dealer ${d}`;
    }

    state.blackjack.inRound = false;
    finalizeRound({
      win,
      payout,
      multiplier,
      message: msg
    });

    state.blackjack.bet = 0;
  }

  /* =========================================
     GAME: PLINKO
  ========================================= */
  async function playPlinko() {
    if (state.plinko.dropping) return;

    state.isPlaying = true;
    state.plinko.dropping = true;
    updatePrimaryButtonState();
    spendBet(state.betAmount);

    const riskMap = {
      low:  [0.5, 0.7, 0.9, 1, 1.2, 1.5, 2],
      medium: [0.2, 0.5, 0.8, 1, 1.5, 2, 3, 5],
      high: [0.1, 0.3, 0.5, 1, 2, 4, 8, 12]
    };

    const mults = riskMap[state.plinkoRisk] || riskMap.medium;
    const rolled = rand(mults);
    const win = rolled >= 1;
    const payout = win ? round(state.betAmount * rolled, 2) : 0;

    await animatePlinkoBall(rolled);

    finalizeRound({
      win,
      payout,
      multiplier: rolled,
      message: `Landed on ${rolled}×`
    });

    state.plinko.dropping = false;
  }

  /* =========================================
     GAME: HILO
  ========================================= */
  function playHiLo() {
    if (!state.hilo.inRound) {
      if (!canAfford(state.betAmount)) {
        setCaption("Insufficient balance");
        return;
      }

      spendBet(state.betAmount);
      state.hilo.inRound = true;
      state.hilo.current = randInt(2, 14);

      const hiloCard = $("hiloCard");
      if (hiloCard) hiloCard.textContent = `${cardFace(state.hilo.current)}${cardSuit()}`;

      setMultiplier(1.00);
      setCaption("Round started — choose higher or lower");
      updatePrimaryButtonState();
      return;
    }

    const current = state.hilo.current;
    const next = randInt(2, 14);
    const win = state.hiloMode === "higher" ? next > current : next < current;
    const payout = win ? round(state.betAmount * 1.9, 2) : 0;

    const hiloCard = $("hiloCard");
    if (hiloCard) hiloCard.textContent = `${cardFace(next)}${cardSuit()}`;

    state.hilo.inRound = false;

    finalizeRound({
      win,
      payout,
      multiplier: win ? 1.9 : 0,
      message: `Current ${cardFace(current)} → Next ${cardFace(next)}`
    });
  }

  /* =========================================
     ENGINE AMBIENT
  ========================================= */
  function startAmbientEngine(gameId) {
    stopAmbientEngine();

    if (gameId === "limbo" || gameId === "airboss" || gameId === "bananafarm") {
      const rocket = $("rocketShip");
      let pos = 80;
      state.timers.engineAmbient = setInterval(() => {
        if (!rocket) return;
        pos = pos > 110 ? 80 : pos + 1.8;
        rocket.style.bottom = `${pos}px`;
      }, 90);
    }

    if (gameId === "plinko") {
      const ball = $("plinkoBall");
      let top = 12;
      state.timers.engineAmbient = setInterval(() => {
        if (!ball || state.plinko.dropping) return;
        top = top > 28 ? 12 : top + 1;
        ball.style.top = `${top}px`;
      }, 120);
    }
  }

  function stopAmbientEngine() {
    clearInterval(state.timers.engineAmbient);
    state.timers.engineAmbient = null;
  }

  function resetGameSessionStates() {
    state.isPlaying = false;
    state.crashSession.running = false;
    state.crashSession.cashedOut = false;
    state.crashSession.current = 1.0;
    state.crashSession.final = 1.0;

    state.blackjack.inRound = false;
    state.blackjack.player = [];
    state.blackjack.dealer = [];
    state.blackjack.bet = 0;

    state.hilo.inRound = false;
    state.hilo.current = 8;

    state.birds.selected = null;
    state.plinko.dropping = false;
  }

  /* =========================================
     ANIMATIONS
  ========================================= */
  function animateRocket(multiplier) {
    const rocket = $("rocketShip");
    if (!rocket) return;

    const lift = Math.min(190, 70 + multiplier * 18);
    rocket.style.transition = "bottom 800ms ease, transform 800ms ease";
    rocket.style.bottom = `${lift}px`;
    rocket.style.transform = "translateX(-50%) scale(1.06)";

    setTimeout(() => {
      rocket.style.bottom = "80px";
      rocket.style.transform = "translateX(-50%) scale(1)";
    }, 950);
  }

  function animateCrashCurveLive() {
    const path = $("crashPath");
    if (!path) return;
    path.setAttribute("d", "M6,88 C18,86 24,84 30,80 C40,73 52,58 62,40 C68,28 76,18 90,10");
  }

  function animateCrashDotLive(multiplier) {
    const dot = $("crashDot");
    if (!dot) return;

    const x = Math.min(92, 6 + multiplier * 6.3);
    const y = Math.max(10, 88 - multiplier * 6.2);

    dot.setAttribute("cx", String(x));
    dot.setAttribute("cy", String(y));
  }

  async function animatePlinkoBall(multiplier) {
    const ball = $("plinkoBall");
    const board = $("plinkoBoard");
    if (!ball || !board) return;

    const columns = [14, 24, 34, 44, 50, 56, 66, 76, 86];
    const targetIndex = Math.min(columns.length - 1, Math.max(0, Math.floor((multiplier / 12) * (columns.length - 1))));
    const finalLeft = columns[targetIndex];

    ball.style.transition = "none";
    ball.style.left = "50%";
    ball.style.top = "12px";
    ball.style.transform = "translateX(-50%)";

    const steps = [
      { top: 38, left: rand([44, 50, 56]) },
      { top: 68, left: rand([38, 46, 54, 62]) },
      { top: 102, left: rand([32, 42, 52, 62, 72]) },
      { top: 140, left: rand([28, 40, 52, 64, 76]) },
      { top: 182, left: rand([24, 36, 48, 60, 72, 84]) },
      { top: 228, left: rand([20, 32, 44, 56, 68, 80]) },
      { top: 278, left: finalLeft }
    ];

    for (const step of steps) {
      ball.style.transition = "all 180ms ease";
      ball.style.top = `${step.top}px`;
      ball.style.left = `${step.left}%`;
      await wait(190);
    }

    await wait(300);

    ball.style.transition = "all 200ms ease";
    ball.style.top = "12px";
    ball.style.left = "50%";
  }

  function createPlinkoPegs() {
    const board = $("plinkoBoard");
    if (!board) return;

    board.querySelectorAll(".plinko-peg, .plinko-bucket").forEach((el) => el.remove());

    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const count = 5 + r;
      for (let c = 0; c < count; c++) {
        const peg = document.createElement("div");
        peg.className = "plinko-peg";
        peg.style.top = `${38 + r * 28}px`;
        peg.style.left = `${((c + 1) / (count + 1)) * 100}%`;
        peg.style.transform = "translateX(-50%)";
        board.appendChild(peg);
      }
    }
  }

  function createPlinkoBuckets() {
    const board = $("plinkoBoard");
    if (!board) return;

    const values = state.plinkoRisk === "high"
      ? [0.1, 0.3, 0.5, 1, 2, 4, 8]
      : state.plinkoRisk === "low"
      ? [0.5, 0.7, 0.9, 1, 1.2, 1.5, 2]
      : [0.2, 0.5, 0.8, 1, 1.5, 2, 3];

    values.forEach((v, i) => {
      const bucket = document.createElement("div");
      bucket.className = "plinko-bucket";
      bucket.textContent = `${v}×`;
      bucket.style.position = "absolute";
      bucket.style.bottom = "8px";
      bucket.style.left = `${8 + i * 13.2}%`;
      bucket.style.width = "11%";
      bucket.style.height = "28px";
      bucket.style.borderRadius = "10px";
      bucket.style.display = "grid";
      bucket.style.placeItems = "center";
      bucket.style.fontSize = "11px";
      bucket.style.fontWeight = "900";
      bucket.style.color = "#fff";
      bucket.style.background = v >= 2 ? "rgba(46,229,127,.18)" : "rgba(255,255,255,.06)";
      bucket.style.border = "1px solid rgba(255,255,255,.06)";
      board.appendChild(bucket);
    });
  }

  function updateDicePreview() {
    const diceFill = $("diceFill");
    if (diceFill) diceFill.style.width = `${state.diceTarget}%`;
  }

  /* =========================================
     LABELS
  ========================================= */
  function getGameCaption(gameId) {
    const captions = {
      coinflip: "Coin result will appear here",
      bananafarm: "Rocket payout result will appear here",
      limbo: "Target result will appear here",
      fruitparty: "Spin result will appear here",
      dice: "Dice roll result will appear here",
      crash: "Crash result will appear here",
      slot: "Spin result will appear here",
      birdsparty: "Pick result will appear here",
      blackjack: "Blackjack result will appear here",
      airboss: "Flight result will appear here",
      hilo: "Card result will appear here",
      plinko: "Plinko result will appear here"
    };
    return captions[gameId] || "Game result will appear here";
  }
})();
