/* =========================================
   BLOXIO CASINO — FINAL MATCH (REAL)
   Compatible 1:1 with:
   - casino.html FINAL STRUCTURE
   - casino.css FINAL MATCH
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

  const formatBX = (n) => `${Number(n).toFixed(2)} BX`;

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

  /* =========================================
     STATE
  ========================================= */
  const state = {
    balance: 250.0,
    activeFilter: "all",
    activeGame: null,
    isPlaying: false,

    serverSeed: randomSeed(32),
    clientSeed: "client_bloxio_seed",
    nonce: 0,

    betAmount: 10.0,

    // per-game
    limboTarget: 2.0,
    crashAutoCashout: 2.0,
    diceTarget: 50,
    diceMode: "over",
    coinSide: "heads",
    slotMode: "normal",
    plinkoRisk: "medium",
    hiloMode: "higher",
    birdsDifficulty: "easy",

    currentSettingsTab: "manual",
    currentHeaderTab: "classic",

    timers: {
      ticker: null,
      stats: null,
      players: null,
      engine: null
    }
  };

  const sampleNames = [
    "alpha", "king", "nova", "ghost", "hex", "milo", "drift", "astro",
    "luna", "volt", "echo", "zen", "omega", "delta", "saber"
  ];

  const currencies = ["BX", "USDT", "USDC", "INR", "NGN", "PKR"];

  /* =========================================
     INIT
  ========================================= */
  init();

  function init() {
    syncInitialBet();
    updateBalanceUI();
    updateFairnessUI();
    renderTickerPulse();
    renderBigWins();
    renderPlayersTable();
    updateTopStats();
    bindGlobalEvents();
    startAmbientLoops();
    openLobby();
  }

  /* =========================================
     GLOBAL EVENTS
  ========================================= */
  function bindGlobalEvents() {
    // lobby cards
    if (casinoGamesGrid) {
      casinoGamesGrid.addEventListener("click", (e) => {
        const card = e.target.closest(".casino-game-card");
        if (!card) return;
        openGame({
          id: card.dataset.game,
          title: card.dataset.title || card.dataset.game || "Game",
          mode: card.dataset.mode || "instant",
          provider: card.dataset.provider || "Bloxio Originals",
          image: card.dataset.image || ""
        });
      });
    }

    // lobby filter tabs
    $$(".casino-filter-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".casino-filter-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.activeFilter = btn.dataset.filter || "all";
        filterLobbyCards();
      });
    });

    // back
    casinoBackBtn?.addEventListener("click", () => {
      stopEngineLoop();
      openLobby();
    });

    // auth fake
    casinoAuthBtn?.addEventListener("click", () => {
      casinoAuthBtn.textContent = casinoAuthBtn.textContent === "Connexion" ? "Connected" : "Connexion";
    });

    // bet input
    betAmountInput?.addEventListener("input", () => {
      const v = parseFloat(betAmountInput.value);
      if (!isNaN(v) && v > 0) state.betAmount = round(v, 2);
    });

    // half / double / up
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-bet-action]");
      if (!btn) return;
      handleBetAction(btn.dataset.betAction);
    });

    // segmented buttons inside dynamic controls
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".seg-btn");
      if (!btn) return;
      handleSegBtn(btn);
    });

    // header tabs
    $$(".game-header-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".game-header-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.currentHeaderTab = btn.dataset.modeTab || "classic";
      });
    });

    // settings tabs
    $$(".settings-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".settings-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.currentSettingsTab = btn.dataset.settingsTab || "manual";
      });
    });

    // settings tools
    $$(".settings-tool-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".settings-tool-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    // play
    casinoPlayBtn?.addEventListener("click", onPlay);

    // new seed
    newSeedBtn?.addEventListener("click", () => {
      state.serverSeed = randomSeed(32);
      state.clientSeed = `client_${randInt(1000, 9999)}`;
      state.nonce = 0;
      updateFairnessUI();
    });
  }

  /* =========================================
     LOBBY
  ========================================= */
  function openLobby() {
    casinoLobby?.classList.remove("hidden");
    casinoGameView?.classList.add("hidden");
    state.activeGame = null;
    filterLobbyCards();
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

  function openGame(game) {
    state.activeGame = game;
    state.isPlaying = false;

    casinoLobby?.classList.add("hidden");
    casinoGameView?.classList.remove("hidden");

    gameEngineCaption.textContent = getGameCaption(game.id);
    gameMultiplierDisplay.textContent = "1.00×";
    casinoPlayBtn.textContent = getPlayButtonLabel(game.id);

    renderDynamicControls(game.id);
    renderGameEngine(game.id);
    renderPlayersTable();
    startEngineLoop(game.id);
  }

  /* =========================================
     TOP STATS / LIVE FEEDS
  ========================================= */
  function updateTopStats() {
    const liveBets = randInt(6000, 15000);
    const volume = randInt(80000, 300000);

    if (casinoLiveBetsCount) casinoLiveBetsCount.textContent = liveBets.toLocaleString();
    if (casinoVolumeToday) casinoVolumeToday.textContent = `${volume.toLocaleString()} BX`;
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

    const rows = Array.from({ length: 5 }).map(() => {
      const player = `@${rand(sampleNames)}`;
      const game = rand(["Crash", "Dice", "Plinko", "Limbo", "Slot", "Blackjack"]);
      const amount = `+${(Math.random() * 250 + 10).toFixed(2)} BX`;

      return `
        <div class="big-win-row">
          <span class="player">${player}</span>
          <span class="game">${game}</span>
          <span class="amount">${amount}</span>
        </div>
      `;
    });

    bigWinsList.innerHTML = rows.join("");
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
     DYNAMIC CONTROLS
  ========================================= */
  function renderDynamicControls(gameId) {
    if (!dynamicBetControls) return;

    switch (gameId) {
      case "coinflip":
        dynamicBetControls.innerHTML = `
          <div class="dynamic-card">
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
          <div class="dynamic-card">
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
          <div class="dynamic-card">
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
          <div class="dynamic-card">
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
          <div class="dynamic-card">
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
          <div class="dynamic-card">
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
          <div class="dynamic-card">
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
          <div class="dynamic-card">
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
          <div class="dynamic-card">
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
          <div class="dynamic-card">
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

    const parent = btn.parentElement;
    if (parent) parent.querySelectorAll(".seg-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

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
    }
  }

  function attachLimboInput() {
    const input = $("limboTargetInput");
    if (!input) return;
    input.addEventListener("input", () => {
      const v = parseFloat(input.value);
      if (!isNaN(v) && v >= 1.01) state.limboTarget = round(v, 2);
    });
  }

  function attachCrashInput() {
    const input = $("crashAutoInput");
    if (!input) return;
    input.addEventListener("input", () => {
      const v = parseFloat(input.value);
      if (!isNaN(v) && v >= 1.01) state.crashAutoCashout = round(v, 2);
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
     GAME ENGINE RENDER
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
            <circle id="crashDot" class="crash-dot" cx="30" cy="80" r="3.2"></circle>
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
        <div class="pick-grid">
          <button class="pick-card" type="button">🐦</button>
          <button class="pick-card" type="button">🥚</button>
          <button class="pick-card" type="button">🐦</button>
          <button class="pick-card" type="button">🥚</button>
          <button class="pick-card" type="button">🐦</button>
          <button class="pick-card" type="button">🥚</button>
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
            <div class="bj-score" id="dealerScore">16</div>
            <div class="bj-cards">
              <div class="bj-card">K♠</div>
              <div class="bj-card">6♦</div>
            </div>
          </div>
          <div class="bj-hand">
            <div class="bj-label">Player</div>
            <div class="bj-score" id="playerScore">18</div>
            <div class="bj-cards">
              <div class="bj-card">10♣</div>
              <div class="bj-card">8♥</div>
            </div>
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
     PLAY LOGIC
  ========================================= */
  function onPlay() {
    if (!state.activeGame || state.isPlaying) return;

    const bet = parseFloat(betAmountInput?.value || state.betAmount);
    if (isNaN(bet) || bet <= 0) return;
    if (bet > state.balance) {
      gameEngineCaption.textContent = "Insufficient balance";
      return;
    }

    state.betAmount = round(bet, 2);
    state.isPlaying = true;
    casinoPlayBtn.textContent = "Playing...";

    setTimeout(() => {
      const result = runGame(state.activeGame.id);
      applyResult(result);
    }, 700);
  }

  function runGame(gameId) {
    switch (gameId) {
      case "coinflip": return playCoinFlip();
      case "limbo":
      case "airboss":
      case "bananafarm": return playLimbo();
      case "crash": return playCrash();
      case "dice": return playDice();
      case "slot":
      case "fruitparty": return playSlot();
      case "birdsparty": return playBirds();
      case "blackjack": return playBlackjack();
      case "plinko": return playPlinko();
      case "hilo": return playHiLo();
      default:
        return { win: false, payout: 0, multiplier: 1, message: "No engine" };
    }
  }

  function applyResult(result) {
    state.nonce += 1;

    if (result.win) {
      state.balance = round(state.balance - state.betAmount + result.payout, 2);
    } else {
      state.balance = round(state.balance - state.betAmount, 2);
    }

    state.balance = Math.max(0, state.balance);

    gameMultiplierDisplay.textContent = `${Number(result.multiplier || 0).toFixed(2)}×`;
    gameEngineCaption.textContent = result.message || "Result updated";

    updateBalanceUI();
    updateFairnessUI();
    renderPlayersTable();
    renderTickerPulse();

    state.isPlaying = false;
    casinoPlayBtn.textContent = getPlayButtonLabel(state.activeGame?.id);
  }

  /* =========================================
     GAME ENGINES
  ========================================= */
  function playCoinFlip() {
    const landed = Math.random() > 0.5 ? "heads" : "tails";
    const win = landed === state.coinSide;
    const payout = win ? round(state.betAmount * 1.96, 2) : 0;

    const visual = $("coinFlipVisual");
    if (visual) visual.textContent = landed === "heads" ? "🪙" : "🥇";

    return {
      win,
      payout,
      multiplier: win ? 1.96 : 0,
      message: win ? `You won on ${landed}` : `${landed} landed`
    };
  }

  function playLimbo() {
    const rolled = round(Math.max(1.0, Math.random() * 20), 2);
    const win = rolled >= state.limboTarget;
    const payout = win ? round(state.betAmount * state.limboTarget, 2) : 0;

    animateRocket(rolled);

    return {
      win,
      payout,
      multiplier: rolled,
      message: `Result ${rolled.toFixed(2)}×`
    };
  }

  function playCrash() {
    const rolled = round(Math.max(1.0, Math.random() * 12), 2);
    const win = rolled >= state.crashAutoCashout;
    const payout = win ? round(state.betAmount * state.crashAutoCashout, 2) : 0;

    animateCrashDot(rolled);

    return {
      win,
      payout,
      multiplier: rolled,
      message: `Crash ended at ${rolled.toFixed(2)}×`
    };
  }

  function playDice() {
    const rolled = round(Math.random() * 100, 2);
    const win = state.diceMode === "over"
      ? rolled > state.diceTarget
      : rolled < state.diceTarget;

    const payoutMult = round(100 / (state.diceMode === "over" ? (100 - state.diceTarget) : state.diceTarget), 2);
    const payout = win ? round(state.betAmount * payoutMult, 2) : 0;

    const diceNumber = $("diceNumber");
    const diceFill = $("diceFill");
    if (diceNumber) diceNumber.textContent = rolled.toFixed(2);
    if (diceFill) diceFill.style.width = `${rolled}%`;

    return {
      win,
      payout,
      multiplier: win ? payoutMult : 0,
      message: `Rolled ${rolled.toFixed(2)}`
    };
  }

  function playSlot() {
    const icons = ["🍒", "7️⃣", "💎", "🍋", "⭐", "🔔"];
    const reels = [rand(icons), rand(icons), rand(icons)];
    const win = reels[0] === reels[1] && reels[1] === reels[2];
    const payout = win ? round(state.betAmount * 5, 2) : 0;

    const slotReels = $("slotReels");
    if (slotReels) {
      slotReels.innerHTML = reels.map((r) => `<div class="slot-reel">${r}</div>`).join("");
    }

    return {
      win,
      payout,
      multiplier: win ? 5 : 0,
      message: reels.join(" ")
    };
  }

  function playBirds() {
    const picked = document.querySelector(".pick-card.active");
    const win = !!picked && Math.random() > 0.45;
    const payout = win ? round(state.betAmount * 2.2, 2) : 0;

    return {
      win,
      payout,
      multiplier: win ? 2.2 : 0,
      message: win ? "Safe pick!" : "Wrong pick"
    };
  }

  function playBlackjack() {
    const player = randInt(14, 21);
    const dealer = randInt(14, 23);
    const win = player <= 21 && (dealer > 21 || player > dealer);
    const payout = win ? round(state.betAmount * 2, 2) : 0;

    const dealerScore = $("dealerScore");
    const playerScore = $("playerScore");
    if (dealerScore) dealerScore.textContent = dealer;
    if (playerScore) playerScore.textContent = player;

    return {
      win,
      payout,
      multiplier: win ? 2 : 0,
      message: `Player ${player} • Dealer ${dealer}`
    };
  }

  function playPlinko() {
    animatePlinkoBall();

    const mults = [0.2, 0.5, 0.8, 1, 1.5, 2, 3, 5, 8];
    const rolled = rand(mults);
    const win = rolled >= 1;
    const payout = win ? round(state.betAmount * rolled, 2) : 0;

    return {
      win,
      payout,
      multiplier: rolled,
      message: `Landed on ${rolled}×`
    };
  }

  function playHiLo() {
    const current = randInt(2, 14);
    const next = randInt(2, 14);
    const win = state.hiloMode === "higher" ? next > current : next < current;
    const payout = win ? round(state.betAmount * 1.9, 2) : 0;

    const hiloCard = $("hiloCard");
    if (hiloCard) hiloCard.textContent = `${cardFace(next)}${rand(["♠", "♥", "♣", "♦"])}`;

    return {
      win,
      payout,
      multiplier: win ? 1.9 : 0,
      message: `Current ${cardFace(current)} → Next ${cardFace(next)}`
    };
  }

  /* =========================================
     ENGINE ANIMATIONS
  ========================================= */
  function startEngineLoop(gameId) {
    stopEngineLoop();

    if (gameId === "limbo" || gameId === "airboss" || gameId === "bananafarm") {
      const rocket = $("rocketShip");
      let pos = 80;
      state.timers.engine = setInterval(() => {
        if (!rocket) return;
        pos = pos > 110 ? 80 : pos + 1.8;
        rocket.style.bottom = `${pos}px`;
      }, 90);
    }

    if (gameId === "crash") {
      const dot = $("crashDot");
      let x = 30;
      let y = 80;
      state.timers.engine = setInterval(() => {
        if (!dot) return;
        x = x > 88 ? 30 : x + 1.8;
        y = x < 40 ? y - 0.4 : y - 0.9;
        if (y < 12) y = 80;
        dot.setAttribute("cx", String(x));
        dot.setAttribute("cy", String(y));
      }, 90);
    }

    if (gameId === "plinko") {
      const ball = $("plinkoBall");
      let top = 12;
      state.timers.engine = setInterval(() => {
        if (!ball) return;
        top = top > 260 ? 12 : top + 4;
        ball.style.top = `${top}px`;
      }, 90);
    }
  }

  function stopEngineLoop() {
    clearInterval(state.timers.engine);
    state.timers.engine = null;
  }

  function animateRocket(multiplier) {
    const rocket = $("rocketShip");
    if (!rocket) return;

    const lift = Math.min(190, 70 + multiplier * 18);
    rocket.style.transition = "bottom 700ms ease, transform 700ms ease";
    rocket.style.bottom = `${lift}px`;
    rocket.style.transform = "translateX(-50%) scale(1.06)";

    setTimeout(() => {
      rocket.style.bottom = "80px";
      rocket.style.transform = "translateX(-50%) scale(1)";
    }, 900);
  }

  function animateCrashDot(multiplier) {
    const dot = $("crashDot");
    if (!dot) return;

    const x = Math.min(90, 20 + multiplier * 6);
    const y = Math.max(10, 88 - multiplier * 6);

    dot.setAttribute("cx", String(x));
    dot.setAttribute("cy", String(y));
  }

  function animatePlinkoBall() {
    const ball = $("plinkoBall");
    if (!ball) return;

    ball.style.transition = "all 900ms ease";
    ball.style.left = `${randInt(18, 82)}%`;
    ball.style.top = "82%";

    setTimeout(() => {
      ball.style.transition = "none";
      ball.style.left = "50%";
      ball.style.top = "12px";
      ball.style.transform = "translateX(-50%)";
    }, 1000);
  }

  function createPlinkoPegs() {
    const board = $("plinkoBoard");
    if (!board) return;

    board.querySelectorAll(".plinko-peg").forEach((el) => el.remove());

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

  function updateDicePreview() {
    const diceFill = $("diceFill");
    if (diceFill) diceFill.style.width = `${state.diceTarget}%`;
  }

  /* =========================================
     LABELS
  ========================================= */
  function getPlayButtonLabel(gameId) {
    if (gameId === "crash") return "Pari";
    return "Pari";
  }

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
