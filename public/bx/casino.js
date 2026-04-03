/* =========================================================
   BLOXIO CASINO — GENERAL PRO SYSTEM FINAL
   MATCHED TO CURRENT HTML STRUCTURE
========================================================= */

(() => {
  "use strict";

  /* =========================================================
     HELPERS
  ========================================================= */
  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const formatBX = (n) => `${Number(n || 0).toFixed(2)} BX`;
  const formatUSD = (n) => `${Number(n || 0).toFixed(2)} $US`;
  const formatMult = (n) => `${Number(n || 1).toFixed(2)}×`;

  /* =========================================================
     ROOT DOM
  ========================================================= */
  const dom = {
    root: $("casino"),
    lobby: $("casinoLobby"),
    gameView: $("casinoGameView"),
    grid: $("casinoGamesGrid"),

    refreshBtn: $("casinoRefreshBtn"),
    backBtn: $("casinoBackBtn"),

    balanceTop: $("casinoBalanceTop"),
    liveBetsCount: $("casinoLiveBetsCount"),
    volumeToday: $("casinoVolumeToday"),

    ticker: $("tickerPulse"),
    bigWins: $("bigWinsList"),

    gameTitle: document.querySelector(".game-shell-title"),
    gameCaption: $("gameEngineCaption"),
    gameModeTabs: $$(".game-header-tab"),
    pulseStrip: document.querySelector(".game-pulse-strip"),

    multiplier: $("gameMultiplierDisplay"),
    engineBody: $("gameEngineBody"),

    settingsTabs: $$(".settings-tab"),
    settingsTools: $$(".settings-tool-btn"),

    betInput: $("betAmountInput"),
    betActionBtns: $$("[data-bet-action]"),
    dynamicControls: $("dynamicBetControls"),
    playBtn: $("casinoPlayBtn"),

    fairnessServer: $("serverSeedText"),
    fairnessClient: $("clientSeedText"),
    fairnessNonce: $("nonceText"),
    newSeedBtn: $("newSeedBtn"),

    playersCount: $("playersCountText"),
    playersVolume: $("playersVolumeText"),
    playersTable: $("playersTableBody"),

    filterTabs: $$(".casino-filter-tab")
  };

  if (!dom.root) return;

  /* =========================================================
     STATE
  ========================================================= */
  const state = {
    balanceBX: 250.0,
    currentGame: null,
    currentModeTab: "classic",
    currentSettingsTab: "manual",
    currentToolMode: "basic",
    currentFilter: "all",

    bet: 10,
    playing: false,
    canCashout: false,
    activeRoundId: null,

    autoPlay: false,
    autoCount: 0,
    autoRemaining: 0,
    autoStopOnProfit: 0,
    autoStopOnLoss: 0,

    serverSeed: "",
    clientSeed: "",
    nonce: 0,

    tickerTimer: null,
    statsTimer: null,
    playersTimer: null,
    pulseTimer: null,
    gameLoopTimer: null,
    autoLoopTimer: null
  };

  /* =========================================================
     GAMES CONFIG
  ========================================================= */
  const GAMES = {
    coinflip: {
      key: "coinflip",
      name: "Coin Flip",
      subtitle: "Instant • 50 / 50",
      mode: "instant",
      provider: "Bloxio Originals",
      baseMultiplier: 1.96
    },
    limbo: {
      key: "limbo",
      name: "Limbo",
      subtitle: "Provably Fair • Target Multiplier",
      mode: "provably",
      provider: "Bloxio Originals",
      baseMultiplier: 2.00
    },
    dice: {
      key: "dice",
      name: "Dice",
      subtitle: "Provably Fair • Roll Under / Over",
      mode: "provably",
      provider: "Bloxio Originals",
      baseMultiplier: 2.00
    },
    crash: {
      key: "crash",
      name: "Crash",
      subtitle: "Provably Fair • Cash Out Before Crash",
      mode: "provably",
      provider: "Bloxio Originals",
      baseMultiplier: 1.00
    },
    plinko: {
      key: "plinko",
      name: "Plinko",
      subtitle: "Provably Fair • Bounce & Drop",
      mode: "provably",
      provider: "Bloxio Originals",
      baseMultiplier: 1.00
    },
    blackjack: {
      key: "blackjack",
      name: "Blackjack",
      subtitle: "Instant • Beat The Dealer",
      mode: "instant",
      provider: "Bloxio Originals",
      baseMultiplier: 1.50
    },
    hilo: {
      key: "hilo",
      name: "HiLo",
      subtitle: "Instant • Higher or Lower",
      mode: "instant",
      provider: "Bloxio Originals",
      baseMultiplier: 2.00
    },
    birdsparty: {
      key: "birdsparty",
      name: "Birds Party",
      subtitle: "Instant • Safe Picks",
      mode: "instant",
      provider: "Bloxio Originals",
      baseMultiplier: 1.00
    },
    airboss: {
      key: "airboss",
      name: "Air Boss",
      subtitle: "Provably Fair • Flight Cashout",
      mode: "provably",
      provider: "Bloxio Originals",
      baseMultiplier: 1.00
    },
    slot: {
      key: "slot",
      name: "Seven Classic Slot",
      subtitle: "Slots • Classic Reels",
      mode: "slots",
      provider: "Bloxio Slots",
      baseMultiplier: 1.00
    },
    fruitparty: {
      key: "fruitparty",
      name: "Fruit Party",
      subtitle: "Slots • Fruit Combo",
      mode: "slots",
      provider: "Bloxio Slots",
      baseMultiplier: 1.00
    },
    bananafarm: {
      key: "bananafarm",
      name: "Banana Farm",
      subtitle: "Slots • Harvest Combo",
      mode: "slots",
      provider: "Bloxio Slots",
      baseMultiplier: 1.00
    }
  };

  const gameCards = $$(".casino-game-card", dom.grid);

  /* =========================================================
     AUDIO FX (safe)
  ========================================================= */
  const snd = {
    click: $("snd-click"),
    win: $("snd-win"),
    lose: $("snd-lose"),
    spin: $("snd-spin")
  };

  function playSound(name) {
    try {
      const el = snd[name];
      if (!el) return;
      el.currentTime = 0;
      el.play().catch(() => {});
    } catch (_) {}
  }

  /* =========================================================
     FX
  ========================================================= */
  function pulseMultiplier() {
    dom.multiplier?.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.12)" },
        { transform: "scale(1)" }
      ],
      { duration: 280, easing: "ease-out" }
    );
  }

  function flashEngine(type = "win") {
    if (!dom.engineBody) return;
    const color =
      type === "win"
        ? "0 0 36px rgba(34,197,94,.32)"
        : "0 0 36px rgba(239,68,68,.28)";
    dom.engineBody.style.boxShadow = color;
    setTimeout(() => {
      dom.engineBody.style.boxShadow = "";
    }, 280);
  }

  function shakeEngine() {
    dom.engineBody?.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-5px)" },
        { transform: "translateX(5px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(3px)" },
        { transform: "translateX(0)" }
      ],
      { duration: 280, easing: "ease-out" }
    );
  }

  /* =========================================================
     PROVABLY FAIR
  ========================================================= */
  function randomSeed(len = 16) {
    const chars = "abcdef0123456789";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[randInt(0, chars.length - 1)];
    return out;
  }

  function regenerateSeeds() {
    state.serverSeed = randomSeed(32);
    state.clientSeed = randomSeed(16);
    state.nonce = 0;
    syncFairnessUI();
  }

  function syncFairnessUI() {
    if (dom.fairnessServer) dom.fairnessServer.textContent = state.serverSeed;
    if (dom.fairnessClient) dom.fairnessClient.textContent = state.clientSeed;
    if (dom.fairnessNonce) dom.fairnessNonce.textContent = String(state.nonce);
  }

  /* =========================================================
     GENERAL UI
  ========================================================= */
  function syncTopStats() {
    if (dom.balanceTop) dom.balanceTop.textContent = formatBX(state.balanceBX);
    if (dom.liveBetsCount) dom.liveBetsCount.textContent = randInt(6800, 12890).toLocaleString();
    if (dom.volumeToday) dom.volumeToday.textContent = `${randInt(85000, 245000).toLocaleString()} BX`;
  }

  function syncPlayButton(label = "Pari") {
    if (!dom.playBtn) return;
    dom.playBtn.textContent = label;
    dom.playBtn.disabled = false;
  }

  function setPlayingUI(on) {
    state.playing = on;
    if (!dom.playBtn) return;
    dom.playBtn.disabled = false;

    if (!state.currentGame) {
      dom.playBtn.textContent = "Pari";
      return;
    }

    const g = state.currentGame;

    if ((g === "crash" || g === "airboss") && on && state.canCashout) {
      dom.playBtn.textContent = "Cash Out";
      return;
    }

    if (state.currentSettingsTab === "auto") {
      dom.playBtn.textContent = on ? "Running..." : "Start Auto";
      return;
    }

    dom.playBtn.textContent = on ? "Playing..." : "Pari";
  }

  function updatePulseStrip() {
    if (!dom.pulseStrip || !state.currentGame) return;

    const items = [
      { txt: "Live", cls: "green" },
      { txt: `Mode: ${state.currentModeTab}`, cls: "" },
      { txt: `Bet: ${state.bet.toFixed(2)} BX`, cls: "" },
      { txt: `Nonce: ${state.nonce}`, cls: "orange" }
    ];

    dom.pulseStrip.innerHTML = items
      .map(
        (x) =>
          `<div class="pulse-pill ${x.cls || ""}">${x.txt}</div>`
      )
      .join("");
  }

  function showLobby() {
    dom.lobby?.classList.remove("hidden");
    dom.gameView?.classList.add("hidden");
    state.currentGame = null;
    clearActiveGameTimers();
  }

  function showGameView() {
    dom.lobby?.classList.add("hidden");
    dom.gameView?.classList.remove("hidden");
  }

  function clearActiveGameTimers() {
    if (state.gameLoopTimer) clearInterval(state.gameLoopTimer);
    if (state.autoLoopTimer) clearTimeout(state.autoLoopTimer);
    state.gameLoopTimer = null;
    state.autoLoopTimer = null;
    state.playing = false;
    state.canCashout = false;
    setPlayingUI(false);
  }

  /* =========================================================
     FILTERS
  ========================================================= */
  function applyFilter(filterKey) {
    state.currentFilter = filterKey;

    dom.filterTabs.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === filterKey);
    });

    gameCards.forEach((card) => {
      const mode = (card.dataset.mode || "").toLowerCase();
      const visible = filterKey === "all" || mode === filterKey;
      card.style.display = visible ? "" : "none";
    });
  }

  /* =========================================================
     TICKER / BIG WINS / PLAYERS
  ========================================================= */
  const tickerGames = [
    "Coin Flip", "Crash", "Dice", "Limbo", "Plinko", "HiLo", "Blackjack", "Air Boss", "Fruit Party"
  ];

  function pushTickerItem() {
    if (!dom.ticker) return;
    const isWin = Math.random() > 0.35;
    const user = `User${randInt(12, 998)}`;
    const game = tickerGames[randInt(0, tickerGames.length - 1)];
    const amount = rand(2, 250).toFixed(2);

    const row = document.createElement("div");
    row.className = `ticker-item ${isWin ? "win" : "loss"}`;
    row.textContent = isWin
      ? `${user} won ${amount} BX on ${game}`
      : `${user} lost ${amount} BX on ${game}`;

    dom.ticker.prepend(row);

    while (dom.ticker.children.length > 12) {
      dom.ticker.lastElementChild?.remove();
    }
  }

  function pushBigWinRow(gameName = "Crash", amount = rand(40, 800), mult = rand(2, 24)) {
    if (!dom.bigWins) return;

    const row = document.createElement("div");
    row.className = "big-win-row";
    row.innerHTML = `
      <span class="user">Player${randInt(10, 999)}</span>
      <span class="game">${gameName}</span>
      <span class="amount">+${amount.toFixed(2)} BX • ${mult.toFixed(2)}×</span>
    `;

    row.style.opacity = "0";
    row.style.transform = "translateY(10px)";
    dom.bigWins.prepend(row);

    requestAnimationFrame(() => {
      row.style.transition = "all .28s ease";
      row.style.opacity = "1";
      row.style.transform = "translateY(0)";
    });

    while (dom.bigWins.children.length > 14) {
      dom.bigWins.lastElementChild?.remove();
    }
  }

  function pushPlayerRow(mult = 1.0, amount = 10) {
    if (!dom.playersTable) return;

    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `
      <span class="name">Player${randInt(10, 999)}</span>
      <span class="cashout">${formatMult(mult)}</span>
      <span class="amount">${amount.toFixed(2)} BX</span>
    `;

    dom.playersTable.prepend(row);

    while (dom.playersTable.children.length > 16) {
      dom.playersTable.lastElementChild?.remove();
    }

    if (dom.playersCount) {
      dom.playersCount.textContent = `${randInt(62, 148)}/${randInt(180, 420)} Joueurs`;
    }
    if (dom.playersVolume) {
      dom.playersVolume.textContent = formatUSD(rand(1000, 12500));
    }
  }

  function bootstrapFeeds() {
    dom.ticker && (dom.ticker.innerHTML = "");
    dom.bigWins && (dom.bigWins.innerHTML = "");
    dom.playersTable && (dom.playersTable.innerHTML = "");

    for (let i = 0; i < 7; i++) pushTickerItem();
    for (let i = 0; i < 6; i++) pushBigWinRow(tickerGames[randInt(0, tickerGames.length - 1)]);
    for (let i = 0; i < 8; i++) pushPlayerRow(rand(1.05, 4.5), rand(2, 180));
  }

  function startBackgroundLoops() {
    if (state.tickerTimer) clearInterval(state.tickerTimer);
    if (state.statsTimer) clearInterval(state.statsTimer);
    if (state.playersTimer) clearInterval(state.playersTimer);

    state.tickerTimer = setInterval(pushTickerItem, 1600);
    state.statsTimer = setInterval(syncTopStats, 5000);
    state.playersTimer = setInterval(() => {
      pushPlayerRow(rand(1.02, 6.8), rand(2, 220));
      if (Math.random() > 0.62) {
        pushBigWinRow(tickerGames[randInt(0, tickerGames.length - 1)], rand(30, 920), rand(1.5, 34));
      }
    }, 2400);
  }

  /* =========================================================
     BET SYSTEM
  ========================================================= */
  function getBet() {
    const v = Number(dom.betInput?.value || state.bet || 0);
    return clamp(Number.isFinite(v) ? v : 0, 0.01, 999999);
  }

  function setBet(v) {
    state.bet = clamp(Number(v || 0), 0.01, 999999);
    if (dom.betInput) dom.betInput.value = state.bet.toFixed(2);
    updatePulseStrip();
  }

  function bindBetActions() {
    dom.betActionBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        playSound("click");
        const action = btn.dataset.betAction;
        const current = getBet();

        if (action === "half") setBet(current / 2);
        if (action === "double") setBet(current * 2);
        if (action === "up") setBet(current + 1);
      });
    });

    dom.betInput?.addEventListener("input", () => {
      setBet(getBet());
    });
  }

  /* =========================================================
     GAME MODE / SETTINGS
  ========================================================= */
  function bindTabs() {
    dom.gameModeTabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        playSound("click");
        dom.gameModeTabs.forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
        state.currentModeTab = btn.dataset.modeTab || "classic";
        updatePulseStrip();
      });
    });

    dom.settingsTabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        playSound("click");
        dom.settingsTabs.forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
        state.currentSettingsTab = btn.dataset.settingsTab || "manual";
        renderDynamicControls(state.currentGame);
        setPlayingUI(false);
      });
    });

    dom.settingsTools.forEach((btn) => {
      btn.addEventListener("click", () => {
        playSound("click");
        dom.settingsTools.forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
        state.currentToolMode = btn.textContent.trim().toLowerCase();
      });
    });
  }

  /* =========================================================
     OPEN / CLOSE GAME
  ========================================================= */
  function openGame(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return;

    clearActiveGameTimers();
    playSound("click");

    state.currentGame = gameKey;
    state.canCashout = false;

    if (dom.gameTitle) dom.gameTitle.textContent = game.name;
    if (dom.gameCaption) dom.gameCaption.textContent = game.subtitle;

    dom.multiplier.textContent = "1.00×";

    showGameView();
    renderDynamicControls(gameKey);
    renderGame(gameKey);
    updatePulseStrip();
    setPlayingUI(false);
  }

  function closeGame() {
    playSound("click");
    showLobby();
  }

  /* =========================================================
     DYNAMIC CONTROLS
  ========================================================= */
  function renderDynamicControls(gameKey) {
    if (!dom.dynamicControls || !gameKey) return;

    const isAuto = state.currentSettingsTab === "auto";

    const autoCard = isAuto
      ? `
      <div class="dynamic-card">
        <div class="dynamic-card-title">Auto Settings</div>

        <div class="inline-value-row">
          <span>Rounds</span>
          <strong id="autoRoundsLabel">10</strong>
        </div>
        <input id="autoRoundsInput" type="range" min="5" max="100" step="1" value="10">

        <div class="inline-value-row">
          <span>Stop Profit</span>
          <strong id="autoProfitLabel">0 BX</strong>
        </div>
        <input id="autoProfitInput" type="number" class="mini-input" value="0" min="0" step="1">

        <div class="inline-value-row">
          <span>Stop Loss</span>
          <strong id="autoLossLabel">0 BX</strong>
        </div>
        <input id="autoLossInput" type="number" class="mini-input" value="0" min="0" step="1">
      </div>
      `
      : "";

    let html = "";

    switch (gameKey) {
      case "coinflip":
        html = `
          <div class="dynamic-card">
            <div class="dynamic-card-title">Side</div>
            <div class="segmented-row">
              <button class="seg-btn active" data-side="heads" type="button">Heads</button>
              <button class="seg-btn" data-side="tails" type="button">Tails</button>
            </div>
          </div>
          ${autoCard}
        `;
        break;

      case "limbo":
        html = `
          <div class="dynamic-card">
            <div class="dynamic-card-title">Target Multiplier</div>
            <input id="limboTarget" type="number" value="2.00" min="1.01" step="0.01">
          </div>
          ${autoCard}
        `;
        break;

      case "dice":
        html = `
          <div class="dynamic-card">
            <div class="dynamic-card-title">Roll Mode</div>
            <div class="segmented-row">
              <button class="seg-btn active" data-rollmode="under" type="button">Roll Under</button>
              <button class="seg-btn" data-rollmode="over" type="button">Roll Over</button>
            </div>
          </div>
          <div class="dynamic-card">
            <div class="inline-value-row">
              <span>Chance</span>
              <strong id="diceChanceLabel">50%</strong>
            </div>
            <input id="diceChance" type="range" min="5" max="95" value="50">
          </div>
          ${autoCard}
        `;
        break;

      case "crash":
      case "airboss":
        html = `
          <div class="dynamic-card">
            <div class="dynamic-card-title">Auto Cashout</div>
            <input id="autoCashout" type="number" value="2.00" min="1.01" step="0.01">
          </div>
          ${autoCard}
        `;
        break;

      case "plinko":
        html = `
          <div class="dynamic-card">
            <div class="dynamic-card-title">Risk</div>
            <div class="segmented-row three">
              <button class="seg-btn" data-risk="low" type="button">Low</button>
              <button class="seg-btn active" data-risk="medium" type="button">Medium</button>
              <button class="seg-btn" data-risk="high" type="button">High</button>
            </div>
          </div>
          <div class="dynamic-card">
            <div class="dynamic-card-title">Rows</div>
            <input id="plinkoRows" type="number" value="12" min="8" max="16" step="1">
          </div>
          ${autoCard}
        `;
        break;

      case "blackjack":
        html = `
          <div class="dynamic-card">
            <div class="dynamic-card-title">Blackjack Rules</div>
            <div class="inline-value-row">
              <span>Payout</span>
              <strong>1.5×</strong>
            </div>
          </div>
          ${autoCard}
        `;
        break;

      case "hilo":
        html = `
          <div class="dynamic-card">
            <div class="dynamic-card-title">Prediction</div>
            <div class="segmented-row">
              <button class="seg-btn active" data-hilo="higher" type="button">Higher</button>
              <button class="seg-btn" data-hilo="lower" type="button">Lower</button>
            </div>
          </div>
          ${autoCard}
        `;
        break;

      case "birdsparty":
        html = `
          <div class="dynamic-card">
            <div class="dynamic-card-title">Difficulty</div>
            <div class="segmented-row three">
              <button class="seg-btn active" data-birds="easy" type="button">Easy</button>
              <button class="seg-btn" data-birds="medium" type="button">Medium</button>
              <button class="seg-btn" data-birds="hard" type="button">Hard</button>
            </div>
          </div>
          ${autoCard}
        `;
        break;

      case "slot":
      case "fruitparty":
      case "bananafarm":
        html = `
          <div class="dynamic-card">
            <div class="dynamic-card-title">Spin Mode</div>
            <div class="segmented-row">
              <button class="seg-btn active" data-spinmode="normal" type="button">Normal</button>
              <button class="seg-btn" data-spinmode="turbo" type="button">Turbo</button>
            </div>
          </div>
          ${autoCard}
        `;
        break;

      default:
        html = autoCard;
    }

    dom.dynamicControls.innerHTML = html;
    bindDynamicControls();
  }

  function bindDynamicControls() {
    $$(".seg-btn", dom.dynamicControls).forEach((btn) => {
      btn.addEventListener("click", () => {
        playSound("click");
        const group = btn.parentElement;
        if (!group) return;
        $$(".seg-btn", group).forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    const diceChance = $("diceChance");
    const diceChanceLabel = $("diceChanceLabel");
    if (diceChance && diceChanceLabel) {
      const sync = () => (diceChanceLabel.textContent = `${diceChance.value}%`);
      diceChance.addEventListener("input", sync);
      sync();
    }

    const autoRoundsInput = $("autoRoundsInput");
    const autoRoundsLabel = $("autoRoundsLabel");
    if (autoRoundsInput && autoRoundsLabel) {
      const sync = () => (autoRoundsLabel.textContent = autoRoundsInput.value);
      autoRoundsInput.addEventListener("input", sync);
      sync();
    }

    const autoProfitInput = $("autoProfitInput");
    const autoProfitLabel = $("autoProfitLabel");
    if (autoProfitInput && autoProfitLabel) {
      const sync = () => (autoProfitLabel.textContent = `${Number(autoProfitInput.value || 0).toFixed(0)} BX`);
      autoProfitInput.addEventListener("input", sync);
      sync();
    }

    const autoLossInput = $("autoLossInput");
    const autoLossLabel = $("autoLossLabel");
    if (autoLossInput && autoLossLabel) {
      const sync = () => (autoLossLabel.textContent = `${Number(autoLossInput.value || 0).toFixed(0)} BX`);
      autoLossInput.addEventListener("input", sync);
      sync();
    }
  }

  /* =========================================================
     ENGINE RENDERERS
  ========================================================= */
  function renderGame(gameKey) {
    if (!dom.engineBody) return;
    dom.engineBody.innerHTML = "";

    switch (gameKey) {
      case "coinflip":
        dom.engineBody.innerHTML = `
          <div class="game-visual" id="coinFlipVisual" style="font-size:68px;">🪙</div>
        `;
        break;

      case "limbo":
        dom.engineBody.innerHTML = `
          <div class="game-visual">
            <div style="font-size:20px;font-weight:900;">🎯 LIMBO TARGET</div>
          </div>
        `;
        break;

      case "dice":
        dom.engineBody.innerHTML = `
          <div class="game-visual" id="diceVisual" style="font-size:68px;">🎲</div>
        `;
        break;

      case "crash":
        dom.engineBody.innerHTML = `
          <div class="game-visual">
            <div style="font-size:42px;">📈</div>
            <div style="font-size:14px;margin-top:8px;">Wait • Climb • Cashout</div>
          </div>
        `;
        break;

      case "plinko":
        dom.engineBody.innerHTML = `
          <div class="game-visual" style="position:relative;">
            <div id="plinkoBall" style="font-size:34px;">⬤</div>
          </div>
        `;
        break;

      case "blackjack":
        dom.engineBody.innerHTML = `
          <div class="game-visual" id="blackjackTable">
            <div style="font-size:34px;">🂡 🂱</div>
          </div>
        `;
        break;

      case "hilo":
        dom.engineBody.innerHTML = `
          <div class="game-visual" id="hiloCard" style="font-size:62px;">7️⃣</div>
        `;
        break;

      case "birdsparty":
        dom.engineBody.innerHTML = `
          <div class="pick-grid" id="birdsGrid">
            ${Array.from({ length: 9 })
              .map((_, i) => `<div class="pick-card" data-bird-index="${i}">?</div>`)
              .join("")}
          </div>
        `;
        bindBirdsGrid();
        break;

      case "airboss":
        dom.engineBody.innerHTML = `
          <div class="game-visual">
            <div style="font-size:42px;">✈️</div>
            <div style="font-size:14px;margin-top:8px;">Flight • Cashout • Boom</div>
          </div>
        `;
        break;

      case "slot":
        dom.engineBody.innerHTML = `
          <div class="game-visual" id="slotReels" style="font-size:56px;">🍒 🍋 ⭐</div>
        `;
        break;

      case "fruitparty":
        dom.engineBody.innerHTML = `
          <div class="game-visual" id="fruitReels" style="font-size:56px;">🍓 🍊 🍉</div>
        `;
        break;

      case "bananafarm":
        dom.engineBody.innerHTML = `
          <div class="game-visual" id="bananaFarmCounter" style="font-size:56px;">🍌 0</div>
        `;
        break;

      default:
        dom.engineBody.innerHTML = `<div class="game-visual">Bloxio Game</div>`;
    }
  }

  function bindBirdsGrid() {
    const picks = $$(".pick-card", dom.engineBody);
    picks.forEach((card) => {
      card.addEventListener("click", () => {
        if (state.playing) return;
        if (card.classList.contains("revealed-safe") || card.classList.contains("revealed-bad")) return;

        playSound("click");
        const safe = Math.random() > 0.32;
        card.textContent = safe ? "🐦" : "💣";
        card.classList.add(safe ? "revealed-safe" : "revealed-bad");

        const current = parseFloat(dom.multiplier.textContent) || 1;
        const next = safe ? current + 0.35 : 0;
        dom.multiplier.textContent = safe ? formatMult(next) : "0.00×";

        if (!safe) {
          flashEngine("lose");
          shakeEngine();
          playSound("lose");
        } else {
          flashEngine("win");
          pulseMultiplier();
          playSound("win");
        }
      });
    });
  }

  /* =========================================================
     GAME PLAY DISPATCHER
  ========================================================= */
  function handlePlayClick() {
    if (!state.currentGame) return;

    if ((state.currentGame === "crash" || state.currentGame === "airboss") && state.playing && state.canCashout) {
      return cashoutCrashLike();
    }

    if (state.playing) return;

    if (state.currentSettingsTab === "auto") {
      startAutoMode();
      return;
    }

    startSingleRound();
  }

  function startSingleRound() {
    const bet = getBet();
    if (bet > state.balanceBX) {
      flashEngine("lose");
      shakeEngine();
      playSound("lose");
      dom.gameCaption && (dom.gameCaption.textContent = "Insufficient BX balance");
      return;
    }

    state.balanceBX -= bet;
    state.nonce += 1;
    syncFairnessUI();
    syncTopStats();
    setBet(bet);

    state.activeRoundId = Date.now();
    setPlayingUI(true);
    playSound("click");

    runGameEngine(state.currentGame, bet);
  }

  function startAutoMode() {
    const rounds = Number($("autoRoundsInput")?.value || 10);
    const stopProfit = Number($("autoProfitInput")?.value || 0);
    const stopLoss = Number($("autoLossInput")?.value || 0);

    state.autoPlay = true;
    state.autoCount = rounds;
    state.autoRemaining = rounds;
    state.autoStopOnProfit = stopProfit;
    state.autoStopOnLoss = stopLoss;

    const startBalance = state.balanceBX;

    const loop = () => {
      if (!state.autoPlay || state.autoRemaining <= 0) {
        state.autoPlay = false;
        setPlayingUI(false);
        return;
      }

      const pnl = state.balanceBX - startBalance;
      if (stopProfit > 0 && pnl >= stopProfit) {
        state.autoPlay = false;
        setPlayingUI(false);
        dom.gameCaption && (dom.gameCaption.textContent = "Auto stopped on profit");
        return;
      }
      if (stopLoss > 0 && pnl <= -stopLoss) {
        state.autoPlay = false;
        setPlayingUI(false);
        dom.gameCaption && (dom.gameCaption.textContent = "Auto stopped on loss");
        return;
      }

      state.autoRemaining -= 1;
      startSingleRound();

      state.autoLoopTimer = setTimeout(loop, 1850);
    };

    setPlayingUI(true);
    loop();
  }

  function endRound({ win = false, payout = 0, multiplier = 1, caption = "" } = {}) {
    const bet = getBet();

    if (win && payout > 0) {
      state.balanceBX += payout;
      playSound("win");
      flashEngine("win");
      pulseMultiplier();
      pushBigWinRow(GAMES[state.currentGame]?.name || "Game", payout, multiplier);
    } else {
      playSound("lose");
      flashEngine("lose");
      shakeEngine();
    }

    pushPlayerRow(multiplier, bet);
    syncTopStats();

    if (dom.gameCaption && caption) dom.gameCaption.textContent = caption;
    dom.multiplier.textContent = formatMult(multiplier);

    state.playing = false;
    state.canCashout = false;
    setPlayingUI(false);
  }

  /* =========================================================
     ENGINES LOGIC
  ========================================================= */
  function runGameEngine(gameKey, bet) {
    switch (gameKey) {
      case "coinflip":
        return runCoinflip(bet);
      case "limbo":
        return runLimbo(bet);
      case "dice":
        return runDice(bet);
      case "crash":
        return runCrashLike(bet, "crash");
      case "plinko":
        return runPlinko(bet);
      case "blackjack":
        return runBlackjack(bet);
      case "hilo":
        return runHiLo(bet);
      case "birdsparty":
        return runBirdsParty(bet);
      case "airboss":
        return runCrashLike(bet, "airboss");
      case "slot":
        return runSlot(bet, "classic");
      case "fruitparty":
        return runSlot(bet, "fruit");
      case "bananafarm":
        return runSlot(bet, "banana");
      default:
        return endRound({ win: false, payout: 0, multiplier: 0, caption: "Unknown game" });
    }
  }

  /* ---------- Coin Flip ---------- */
  function runCoinflip(bet) {
    const el = $("coinFlipVisual");
    const selected = document.querySelector('[data-side].active')?.dataset.side || "heads";
    const landed = Math.random() > 0.5 ? "heads" : "tails";
    const win = selected === landed;
    const mult = win ? 1.96 : 0;
    const payout = win ? bet * mult : 0;

    el?.animate(
      [
        { transform: "rotateY(0deg)" },
        { transform: "rotateY(360deg)" },
        { transform: "rotateY(720deg)" }
      ],
      { duration: 850, easing: "ease-in-out" }
    );

    setTimeout(() => {
      if (el) el.textContent = landed === "heads" ? "🪙" : "🥈";
      endRound({
        win,
        payout,
        multiplier: mult,
        caption: win ? `You hit ${landed}` : `Missed — landed ${landed}`
      });
    }, 900);
  }

  /* ---------- Limbo ---------- */
  function runLimbo(bet) {
    const target = Number($("limboTarget")?.value || 2);
    const rolled = rand(1.01, 12.5);
    let current = 1.0;

    const loop = setInterval(() => {
      current += 0.12;
      dom.multiplier.textContent = formatMult(current);

      if (current >= rolled) {
        clearInterval(loop);
        const win = rolled >= target;
        const payout = win ? bet * target : 0;

        endRound({
          win,
          payout,
          multiplier: win ? target : rolled,
          caption: win
            ? `Target hit at ${rolled.toFixed(2)}×`
            : `Busted at ${rolled.toFixed(2)}×`
        });
      }
    }, 40);
  }

  /* ---------- Dice ---------- */
  function runDice(bet) {
    const chance = Number($("diceChance")?.value || 50);
    const mode = document.querySelector('[data-rollmode].active')?.dataset.rollmode || "under";
    const roll = rand(0, 100);
    const win = mode === "under" ? roll < chance : roll > 100 - chance;
    const mult = Number((99 / chance).toFixed(2));
    const payout = win ? bet * mult : 0;

    const dice = $("diceVisual");
    dice?.animate(
      [
        { transform: "rotate(0deg) scale(1)" },
        { transform: "rotate(180deg) scale(1.15)" },
        { transform: "rotate(360deg) scale(1)" }
      ],
      { duration: 720, easing: "ease-in-out" }
    );

    setTimeout(() => {
      dom.multiplier.textContent = `${roll.toFixed(2)}`;
      endRound({
        win,
        payout,
        multiplier: win ? mult : 0,
        caption: win ? `Roll ${roll.toFixed(2)} • Win` : `Roll ${roll.toFixed(2)} • Lose`
      });
    }, 780);
  }

  /* ---------- Crash / AirBoss ---------- */
  function runCrashLike(bet, type = "crash") {
    const autoCashout = Number($("autoCashout")?.value || 2);
    let current = 1.0;
    let speed = type === "airboss" ? 0.035 : 0.028;
    const bustPoint = rand(1.08, type === "airboss" ? 12 : 18);

    state.canCashout = true;
    setPlayingUI(true);
    dom.gameCaption && (dom.gameCaption.textContent = "Round live — cash out before crash");

    state.gameLoopTimer = setInterval(() => {
      speed += type === "airboss" ? 0.006 : 0.004;
      current += speed;
      dom.multiplier.textContent = formatMult(current);

      if (state.currentModeTab === "auto" || state.currentSettingsTab === "auto") {
        if (current >= autoCashout && state.canCashout) {
          cashoutCrashLike();
          return;
        }
      }

      if (current >= bustPoint) {
        clearInterval(state.gameLoopTimer);
        state.gameLoopTimer = null;
        state.canCashout = false;
        dom.multiplier.textContent = `💥 ${current.toFixed(2)}×`;
        endRound({
          win: false,
          payout: 0,
          multiplier: current,
          caption: type === "airboss" ? "Air Boss exploded" : "Crash exploded"
        });
      }
    }, 70);
  }

  function cashoutCrashLike() {
    if (!state.playing || !state.canCashout) return;

    const current = parseFloat(dom.multiplier.textContent) || 1;
    const bet = getBet();
    const payout = bet * current;

    state.canCashout = false;
    if (state.gameLoopTimer) clearInterval(state.gameLoopTimer);
    state.gameLoopTimer = null;

    endRound({
      win: true,
      payout,
      multiplier: current,
      caption: `Cashed out at ${current.toFixed(2)}×`
    });
  }

  /* ---------- Plinko ---------- */
  function runPlinko(bet) {
    const risk = document.querySelector('[data-risk].active')?.dataset.risk || "medium";
    const rows = Number($("plinkoRows")?.value || 12);
    const ball = $("plinkoBall");
    let y = 0;

    const riskTable = {
      low: [0.5, 0.8, 1, 1.2, 1.5, 2],
      medium: [0.2, 0.5, 1, 1.5, 3, 5],
      high: [0.1, 0.3, 0.7, 2, 8, 16]
    };

    const possible = riskTable[risk] || riskTable.medium;

    const loop = setInterval(() => {
      y += rows > 12 ? 12 : 15;
      const x = Math.random() > 0.5 ? 14 : -14;
      if (ball) ball.style.transform = `translate(${x}px, ${y}px)`;

      if (y >= 180) {
        clearInterval(loop);
        const mult = possible[randInt(0, possible.length - 1)];
        const win = mult >= 1;
        const payout = bet * mult;

        endRound({
          win,
          payout: win ? payout : 0,
          multiplier: mult,
          caption: `Plinko landed at ${mult.toFixed(2)}×`
        });
      }
    }, 65);
  }

  /* ---------- Blackjack ---------- */
  function drawCardValue() {
    const deck = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11];
    return deck[randInt(0, deck.length - 1)];
  }

  function runBlackjack(bet) {
    let player = drawCardValue() + drawCardValue();
    let dealer = drawCardValue() + drawCardValue();

    while (player < 16) player += drawCardValue();
    while (dealer < 17) dealer += drawCardValue();

    const win = (player <= 21 && dealer > 21) || (player <= 21 && player > dealer);
    const blackjack = player === 21;
    const mult = blackjack ? 1.5 : win ? 2 : 0;
    const payout = win ? bet * mult : 0;

    dom.engineBody.innerHTML = `
      <div class="game-visual">
        <div style="font-size:22px;font-weight:900;">You: ${player}</div>
        <div style="font-size:22px;font-weight:900;margin-top:10px;">Dealer: ${dealer}</div>
      </div>
    `;

    setTimeout(() => {
      endRound({
        win,
        payout,
        multiplier: mult,
        caption: win ? `You ${blackjack ? "Blackjack" : "win"} (${player} vs ${dealer})` : `Dealer wins (${dealer} vs ${player})`
      });
    }, 900);
  }

  /* ---------- HiLo ---------- */
  function runHiLo(bet) {
    const choice = document.querySelector('[data-hilo].active')?.dataset.hilo || "higher";
    const current = randInt(2, 13);
    const next = randInt(1, 13);
    const win = choice === "higher" ? next > current : next < current;
    const mult = win ? 2 : 0;
    const payout = win ? bet * mult : 0;

    dom.engineBody.innerHTML = `
      <div class="game-visual">
        <div style="font-size:58px;">${current}</div>
      </div>
    `;

    setTimeout(() => {
      dom.engineBody.innerHTML = `
        <div class="game-visual">
          <div style="font-size:58px;">${next}</div>
        </div>
      `;

      endRound({
        win,
        payout,
        multiplier: mult,
        caption: win ? `Correct — ${next}` : `Wrong — ${next}`
      });
    }, 850);
  }

  /* ---------- Birds Party ---------- */
  function runBirdsParty(bet) {
    dom.gameCaption && (dom.gameCaption.textContent = "Pick safe birds. Avoid bombs.");
    dom.multiplier.textContent = "1.00×";
    state.playing = false;
    setPlayingUI(false);
    playSound("click");
  }

  /* ---------- Slots ---------- */
  function runSlot(bet, kind = "classic") {
    const reelsMap = {
      classic: ["🍒", "🍋", "⭐", "7️⃣", "💎"],
      fruit: ["🍓", "🍊", "🍉", "🍍", "🍇"],
      banana: ["🍌", "🥭", "🍍", "🌴", "💰"]
    };

    const reels = reelsMap[kind] || reelsMap.classic;
    const targetId =
      kind === "classic" ? "slotReels" : kind === "fruit" ? "fruitReels" : "bananaFarmCounter";

    const el = $(targetId) || dom.engineBody;
    let spins = 12;

    playSound("spin");

    const loop = setInterval(() => {
      const result = Array.from({ length: 3 }).map(
        () => reels[randInt(0, reels.length - 1)]
      );
      if (el) el.textContent = result.join(" ");
      spins--;

      if (spins <= 0) {
        clearInterval(loop);

        const same2 = result[0] === result[1] || result[1] === result[2] || result[0] === result[2];
        const same3 = result[0] === result[1] && result[1] === result[2];

        let mult = 0;
        if (same3) mult = kind === "banana" ? 6 : kind === "fruit" ? 5 : 7;
        else if (same2) mult = kind === "banana" ? 1.8 : kind === "fruit" ? 2 : 2.5;
        else mult = 0;

        const win = mult > 0;
        const payout = win ? bet * mult : 0;

        endRound({
          win,
          payout,
          multiplier: mult,
          caption: win ? `Combo hit • ${mult.toFixed(2)}×` : "No combo"
        });
      }
    }, 90);
  }

  /* =========================================================
     EVENTS
  ========================================================= */
  function bindGameGrid() {
    gameCards.forEach((card) => {
      card.addEventListener("click", () => {
        const key = card.dataset.game;
        openGame(key);
      });
    });
  }

  function bindFilters() {
    dom.filterTabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        playSound("click");
        applyFilter(btn.dataset.filter || "all");
      });
    });
  }

  function bindButtons() {
    dom.refreshBtn?.addEventListener("click", () => {
      playSound("click");
      bootstrapFeeds();
      syncTopStats();
    });

    dom.backBtn?.addEventListener("click", closeGame);
    dom.playBtn?.addEventListener("click", handlePlayClick);

    dom.newSeedBtn?.addEventListener("click", () => {
      playSound("click");
      regenerateSeeds();
    });
  }

  /* =========================================================
     INIT
  ========================================================= */
  function init() {
    regenerateSeeds();
    syncTopStats();
    bootstrapFeeds();
    applyFilter("all");

    bindGameGrid();
    bindFilters();
    bindButtons();
    bindBetActions();
    bindTabs();

    setBet(state.bet);
    startBackgroundLoops();
    showLobby();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
