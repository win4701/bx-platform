/* =========================================================
   BLOXIO CASINO ENGINE — GENERAL PRO SYSTEM FINAL
   1:1 Compatible with current HTML + CSS
========================================================= */

(() => {
  "use strict";

  /* =========================================================
     SAFE GUARDS
  ========================================================= */
  const root = document.getElementById("casino");
  if (!root) return;

  /* =========================================================
     DOM
  ========================================================= */
  const dom = {
    // views
    lobby: document.getElementById("casinoLobby"),
    gameView: document.getElementById("casinoGameView"),

    // lobby
    gamesGrid: document.getElementById("casinoGamesGrid"),
    refreshBtn: document.getElementById("casinoRefreshBtn"),
    filterTabs: [...document.querySelectorAll(".casino-filter-tab")],
    tickerPulse: document.getElementById("tickerPulse"),
    bigWinsList: document.getElementById("bigWinsList"),

    // top stats
    balanceTop: document.getElementById("casinoBalanceTop"),
    liveBetsCount: document.getElementById("casinoLiveBetsCount"),
    volumeToday: document.getElementById("casinoVolumeToday"),

    // game shell
    backBtn: document.getElementById("casinoBackBtn"),
    gameCaption: document.getElementById("gameEngineCaption"),
    multiplier: document.getElementById("gameMultiplierDisplay"),
    engineBody: document.getElementById("gameEngineBody"),

    // game tabs
    modeTabs: [...document.querySelectorAll(".game-header-tab")],
    settingsTabs: [...document.querySelectorAll(".settings-tab")],
    toolBtns: [...document.querySelectorAll(".settings-tool-btn")],

    // betting
    betInput: document.getElementById("betAmountInput"),
    dynamicBetControls: document.getElementById("dynamicBetControls"),
    playBtn: document.getElementById("casinoPlayBtn"),
    betActionBtns: [...document.querySelectorAll("[data-bet-action]")],

    // fairness
    serverSeedText: document.getElementById("serverSeedText"),
    clientSeedText: document.getElementById("clientSeedText"),
    nonceText: document.getElementById("nonceText"),
    newSeedBtn: document.getElementById("newSeedBtn"),

    // players
    playersCountText: document.getElementById("playersCountText"),
    playersVolumeText: document.getElementById("playersVolumeText"),
    playersTableBody: document.getElementById("playersTableBody"),

    // sounds
    sndClick: document.getElementById("snd-click"),
    sndWin: document.getElementById("snd-win"),
    sndLose: document.getElementById("snd-lose"),
    sndSpin: document.getElementById("snd-spin"),
  };

  /* =========================================================
     CONFIG
  ========================================================= */
  const GAMES = {
    coinflip:   { name: "Coin Flip", type: "instant",   supportsCashout: false, caption: "Choose side and flip." },
    limbo:      { name: "Limbo",     type: "provably",  supportsCashout: false, caption: "Target a multiplier and pray." },
    dice:       { name: "Dice",      type: "provably",  supportsCashout: false, caption: "Roll under / over." },
    crash:      { name: "Crash",     type: "provably",  supportsCashout: true,  caption: "Cash out before the crash." },
    plinko:     { name: "Plinko",    type: "provably",  supportsCashout: false, caption: "Drop the ball through risk lanes." },
    blackjack:  { name: "Blackjack", type: "instant",   supportsCashout: false, caption: "Hit, stand and beat the dealer." },
    hilo:       { name: "HiLo",      type: "instant",   supportsCashout: false, caption: "Predict higher or lower." },
    birdsparty: { name: "Birds Party", type: "instant", supportsCashout: false, caption: "Pick the lucky bird." },
    airboss:    { name: "Air Boss",  type: "provably",  supportsCashout: true,  caption: "Pilot your cashout timing." },
    slot:       { name: "Seven Classic Slot", type: "slots", supportsCashout: false, caption: "Spin classic slot reels." },
    fruitparty: { name: "Fruit Party", type: "slots", supportsCashout: false, caption: "Fruit chaos and multipliers." },
    bananafarm: { name: "Banana Farm", type: "slots", supportsCashout: false, caption: "Banana harvest bonus reels." },
  };

  const BOT_NAMES = [
    "Lynx", "Ghost", "Nova", "Ares", "Milo", "Hex", "Kiro", "Blaze",
    "Orion", "Jett", "Mika", "Rogue", "Pixel", "Bunny", "Mamba", "Vega"
  ];

  /* =========================================================
     STATE
  ========================================================= */
  const state = {
    balanceBX: 250.00,
    liveBets: 8421,
    volumeToday: 124980,

    currentGame: null,
    currentFilter: "all",
    currentModeTab: "classic",
    currentSettingsTab: "manual",
    currentTool: "Basic",

    playing: false,
    canCashout: false,

    autoPlay: false,
    autoRemaining: 0,
    autoLoopTimer: null,
    gameLoopTimer: null,
    uiPulseTimer: null,
    feedTimer: null,
    playersTimer: null,

    nonce: 0,
    serverSeed: "",
    clientSeed: "",

    currentMultiplier: 1.00,
    lastPayout: 0,

    // dynamic values
    limboTarget: 2.00,
    diceChance: 49.50,
    diceMode: "under",
    plinkoRisk: "medium",
    blackjackStandOn: 17,
    hiloGuess: "higher",
    birdPick: 2,
    autoRounds: 10,
    slotVolatility: "normal",
  };

  /* =========================================================
     HELPERS
  ========================================================= */
  const $ = (sel, parent = document) => parent.querySelector(sel);

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function rnd(min, max, fixed = 2) {
    return +(Math.random() * (max - min) + min).toFixed(fixed);
  }

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shortHash(len = 16) {
    const chars = "abcdef0123456789";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  function fmtBX(n) {
    return `${Number(n || 0).toFixed(2)} BX`;
  }

  function fmtUSD(n) {
    return `${Number(n || 0).toFixed(2)} $US`;
  }

  function escapeHTML(str = "") {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function getBet() {
    const v = parseFloat(dom.betInput?.value || "0");
    return isNaN(v) ? 0 : Math.max(0, v);
  }

  function setBet(v) {
    if (!dom.betInput) return;
    dom.betInput.value = Number(v).toFixed(2);
  }

  function stopTimer(key) {
    if (!state[key]) return;
    clearTimeout(state[key]);
    clearInterval(state[key]);
    state[key] = null;
  }

  function stopAllGameTimers() {
    stopTimer("gameLoopTimer");
    stopTimer("autoLoopTimer");
  }

  function playSound(type) {
    try {
      const map = {
        click: dom.sndClick,
        win: dom.sndWin,
        lose: dom.sndLose,
        spin: dom.sndSpin
      };
      const audio = map[type];
      if (!audio) return;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch (_) {}
  }

  function setEngineHTML(html) {
    if (!dom.engineBody) return;
    dom.engineBody.innerHTML = html;
  }

  function setCaption(text) {
    if (dom.gameCaption) dom.gameCaption.textContent = text || "Le résultat du jeu sera affiché";
  }

  function setMultiplier(v) {
    state.currentMultiplier = Number(v || 1);
    if (dom.multiplier) dom.multiplier.textContent = `${state.currentMultiplier.toFixed(2)}×`;
  }

  function flashEngine(type = "win") {
    if (!dom.engineBody) return;
    dom.engineBody.classList.remove("win", "lose");
    void dom.engineBody.offsetWidth;
    dom.engineBody.classList.add(type === "win" ? "win" : "lose");
    setTimeout(() => dom.engineBody?.classList.remove("win", "lose"), 700);
  }

  function syncTopStats() {
    if (dom.balanceTop) dom.balanceTop.textContent = fmtBX(state.balanceBX);
    if (dom.liveBetsCount) dom.liveBetsCount.textContent = state.liveBets.toLocaleString();
    if (dom.volumeToday) dom.volumeToday.textContent = fmtBX(state.volumeToday);
  }

  function syncFairnessUI() {
    if (dom.serverSeedText) dom.serverSeedText.textContent = state.serverSeed;
    if (dom.clientSeedText) dom.clientSeedText.textContent = state.clientSeed;
    if (dom.nonceText) dom.nonceText.textContent = String(state.nonce);
  }

  function regenerateSeeds() {
    state.serverSeed = shortHash(20);
    state.clientSeed = shortHash(12);
    syncFairnessUI();
  }

  function syncPlayButton(label = "Play", mode = "idle") {
    if (!dom.playBtn) return;

    dom.playBtn.dataset.state = mode;
    dom.playBtn.disabled = false;

    dom.playBtn.classList.remove("is-idle", "is-stop", "is-cashout");

    if (mode === "cashout") {
      dom.playBtn.classList.add("is-cashout");
    } else if (mode === "stop" || mode === "running") {
      dom.playBtn.classList.add("is-stop");
    } else {
      dom.playBtn.classList.add("is-idle");
    }

    dom.playBtn.textContent = label;
  }

  function setPlayingUI(on) {
    state.playing = !!on;

    if (!state.currentGame) {
      syncPlayButton("Play", "idle");
      return;
    }

    const game = GAMES[state.currentGame];
    const isAuto = state.currentSettingsTab === "auto";

    if (game?.supportsCashout && state.playing && state.canCashout) {
      syncPlayButton("Cash Out", "cashout");
      return;
    }

    if (isAuto && (state.playing || state.autoPlay || state.autoRemaining > 0)) {
      syncPlayButton("Stop", "stop");
      return;
    }

    if (state.playing) {
      syncPlayButton("Stop", "stop");
      return;
    }

    syncPlayButton("Play", "idle");
  }

  function updatePulseStrip() {
    const strip = $(".game-pulse-strip", root);
    if (!strip) return;

    const items = [];
    for (let i = 0; i < 10; i++) {
      const mult = rnd(1.01, 9.99, 2);
      const cls = mult >= 2 ? "up" : "down";
      items.push(`<span class="pulse-pill ${cls}">${mult.toFixed(2)}×</span>`);
    }
    strip.innerHTML = items.join("");
  }

  /* =========================================================
     FEEDS
  ========================================================= */
  function pushTickerRow() {
    if (!dom.tickerPulse) return;

    const bot = BOT_NAMES[randInt(0, BOT_NAMES.length - 1)];
    const gameKeys = Object.keys(GAMES);
    const g = GAMES[gameKeys[randInt(0, gameKeys.length - 1)]];
    const bet = rnd(2, 80, 2);
    const won = Math.random() > 0.45;
    const mult = won ? rnd(1.20, 8.50, 2) : rnd(0.00, 0.99, 2);
    const payout = won ? bet * mult : 0;

    const row = document.createElement("div");
    row.className = `ticker-pulse-item ${won ? "win" : "loss"}`;
    row.textContent = `${bot} • ${g.name} • ${won ? "+" + payout.toFixed(2) + " BX" : "-" + bet.toFixed(2) + " BX"} • ${mult.toFixed(2)}×`;

    dom.tickerPulse.prepend(row);
    while (dom.tickerPulse.children.length > 5) {
      dom.tickerPulse.removeChild(dom.tickerPulse.lastElementChild);
    }
  }

  function pushBigWinRow(gameName, amount, mult, user = null) {
    if (!dom.bigWinsList) return;
    const name = user || BOT_NAMES[randInt(0, BOT_NAMES.length - 1)];
    const row = document.createElement("div");
    row.className = "big-win-row";
    row.innerHTML = `
      <span class="user">${escapeHTML(name)}</span>
      <span class="game">${escapeHTML(gameName)}</span>
      <span class="amount">+${Number(amount).toFixed(2)} BX • ${Number(mult).toFixed(2)}×</span>
    `;
    dom.bigWinsList.prepend(row);
    while (dom.bigWinsList.children.length > 12) {
      dom.bigWinsList.removeChild(dom.bigWinsList.lastElementChild);
    }
  }

  function renderPlayersFeed(rows = []) {
    if (!dom.playersTableBody) return;

    if (!rows.length) {
      dom.playersTableBody.innerHTML = `<div class="player-row empty">No live players</div>`;
      if (dom.playersCountText) dom.playersCountText.textContent = "0/0 Joueurs";
      if (dom.playersVolumeText) dom.playersVolumeText.textContent = "0.00 $US";
      return;
    }

    let total = 0;
    dom.playersTableBody.innerHTML = rows.map(r => {
      total += r.amount;
      return `
        <div class="player-row">
          <span>${escapeHTML(r.name)}</span>
          <span>${r.cashout.toFixed(2)}×</span>
          <span>${r.amount.toFixed(2)} BX</span>
        </div>
      `;
    }).join("");

    if (dom.playersCountText) dom.playersCountText.textContent = `${rows.length}/${rows.length} Joueurs`;
    if (dom.playersVolumeText) dom.playersVolumeText.textContent = fmtUSD(total);
  }

  function seedPlayersFeed() {
    const rows = Array.from({ length: randInt(4, 9) }, () => ({
      name: BOT_NAMES[randInt(0, BOT_NAMES.length - 1)],
      cashout: rnd(1.10, 6.50, 2),
      amount: rnd(2, 50, 2)
    }));
    renderPlayersFeed(rows);
  }

  function bootstrapFeeds() {
    for (let i = 0; i < 4; i++) pushTickerRow();
    for (let i = 0; i < 6; i++) {
      const gk = Object.keys(GAMES)[randInt(0, Object.keys(GAMES).length - 1)];
      pushBigWinRow(GAMES[gk].name, rnd(25, 480, 2), rnd(1.4, 12.0, 2));
    }
    seedPlayersFeed();
  }

  function startBackgroundLoops() {
    stopTimer("feedTimer");
    stopTimer("playersTimer");
    stopTimer("uiPulseTimer");

    state.feedTimer = setInterval(() => {
      pushTickerRow();
      state.liveBets += randInt(1, 4);
      state.volumeToday += rnd(5, 45, 2);
      syncTopStats();
    }, 2800);

    state.playersTimer = setInterval(() => {
      seedPlayersFeed();
    }, 4200);

    state.uiPulseTimer = setInterval(() => {
      if (!state.currentGame) return;
      updatePulseStrip();
    }, 2500);
  }

  /* =========================================================
     VIEW CONTROL
  ========================================================= */
  function openLobby() {
    stopAllGameTimers();
    state.playing = false;
    state.canCashout = false;
    state.autoPlay = false;
    state.autoRemaining = 0;

    dom.lobby?.classList.remove("hidden");
    dom.gameView?.classList.add("hidden");

    setPlayingUI(false);
  }

  function openGame(gameKey) {
    const game = GAMES[gameKey];
    if (!game) return;

    state.currentGame = gameKey;
    state.playing = false;
    state.canCashout = false;
    state.autoPlay = false;
    state.autoRemaining = 0;
    stopAllGameTimers();

    dom.lobby?.classList.add("hidden");
    dom.gameView?.classList.remove("hidden");

    setCaption(game.caption);
    setMultiplier(1.00);
    buildDynamicControls(gameKey);
    renderGameShell(gameKey);
    seedPlayersFeed();
    setPlayingUI(false);

    [...dom.gamesGrid.querySelectorAll(".casino-game-card")].forEach(card => {
      card.classList.toggle("active", card.dataset.game === gameKey);
    });
  }

  /* =========================================================
     FILTERS
  ========================================================= */
  function applyFilter(filter = "all") {
    state.currentFilter = filter;

    dom.filterTabs.forEach(btn => {
      btn.classList.toggle("active", btn.dataset.filter === filter);
    });

    const cards = [...dom.gamesGrid.querySelectorAll(".casino-game-card")];
    cards.forEach(card => {
      const mode = card.dataset.mode || "all";
      const show = filter === "all" || mode === filter;
      card.style.display = show ? "" : "none";
    });
  }

  /* =========================================================
     DYNAMIC CONTROLS
  ========================================================= */
  function buildDynamicControls(gameKey) {
    if (!dom.dynamicBetControls) return;

    let html = "";

    switch (gameKey) {
      case "coinflip":
        html = `
          <div class="dyn-row">
            <label>Pick Side</label>
            <div class="dyn-pills">
              <button class="dyn-btn active" data-coin-side="heads" type="button">Heads</button>
              <button class="dyn-btn" data-coin-side="tails" type="button">Tails</button>
            </div>
          </div>
        `;
        break;

      case "limbo":
        html = `
          <div class="dyn-row">
            <label>Target Multiplier</label>
            <input id="limboTargetInput" type="number" min="1.01" step="0.01" value="${state.limboTarget.toFixed(2)}">
          </div>
        `;
        break;

      case "dice":
        html = `
          <div class="dyn-row">
            <label>Chance %</label>
            <input id="diceChanceInput" type="number" min="1" max="95" step="0.01" value="${state.diceChance.toFixed(2)}">
          </div>
          <div class="dyn-row">
            <label>Mode</label>
            <div class="dyn-pills">
              <button class="dyn-btn ${state.diceMode === "under" ? "active" : ""}" data-dice-mode="under" type="button">Under</button>
              <button class="dyn-btn ${state.diceMode === "over" ? "active" : ""}" data-dice-mode="over" type="button">Over</button>
            </div>
          </div>
        `;
        break;

      case "plinko":
        html = `
          <div class="dyn-row">
            <label>Risk</label>
            <div class="dyn-pills">
              <button class="dyn-btn ${state.plinkoRisk === "low" ? "active" : ""}" data-plinko-risk="low" type="button">Low</button>
              <button class="dyn-btn ${state.plinkoRisk === "medium" ? "active" : ""}" data-plinko-risk="medium" type="button">Medium</button>
              <button class="dyn-btn ${state.plinkoRisk === "high" ? "active" : ""}" data-plinko-risk="high" type="button">High</button>
            </div>
          </div>
        `;
        break;

      case "blackjack":
        html = `
          <div class="dyn-row">
            <label>Dealer Stand On</label>
            <input id="blackjackStandInput" type="number" min="16" max="19" step="1" value="${state.blackjackStandOn}">
          </div>
        `;
        break;

      case "hilo":
        html = `
          <div class="dyn-row">
            <label>Guess</label>
            <div class="dyn-pills">
              <button class="dyn-btn ${state.hiloGuess === "higher" ? "active" : ""}" data-hilo="higher" type="button">Higher</button>
              <button class="dyn-btn ${state.hiloGuess === "lower" ? "active" : ""}" data-hilo="lower" type="button">Lower</button>
            </div>
          </div>
        `;
        break;

      case "birdsparty":
        html = `
          <div class="dyn-row">
            <label>Pick Bird</label>
            <div class="dyn-pills">
              <button class="dyn-btn ${state.birdPick === 1 ? "active" : ""}" data-bird="1" type="button">1</button>
              <button class="dyn-btn ${state.birdPick === 2 ? "active" : ""}" data-bird="2" type="button">2</button>
              <button class="dyn-btn ${state.birdPick === 3 ? "active" : ""}" data-bird="3" type="button">3</button>
            </div>
          </div>
        `;
        break;

      case "slot":
      case "fruitparty":
      case "bananafarm":
        html = `
          <div class="dyn-row">
            <label>Volatility</label>
            <div class="dyn-pills">
              <button class="dyn-btn ${state.slotVolatility === "low" ? "active" : ""}" data-slot-vol="low" type="button">Low</button>
              <button class="dyn-btn ${state.slotVolatility === "normal" ? "active" : ""}" data-slot-vol="normal" type="button">Normal</button>
              <button class="dyn-btn ${state.slotVolatility === "high" ? "active" : ""}" data-slot-vol="high" type="button">High</button>
            </div>
          </div>
        `;
        break;

      default:
        html = `<div class="dyn-row"><small>Game ready. Default settings applied.</small></div>`;
    }

    if (state.currentSettingsTab === "auto") {
      html += `
        <div class="dyn-row">
          <label>Auto Rounds</label>
          <input id="autoRoundsInput" type="number" min="1" max="100" step="1" value="${state.autoRounds}">
        </div>
      `;
    }

    dom.dynamicBetControls.innerHTML = html;
    bindDynamicControls();
  }

  function bindDynamicControls() {
    // Coinflip
    dom.dynamicBetControls.querySelectorAll("[data-coin-side]").forEach(btn => {
      btn.onclick = () => {
        dom.dynamicBetControls.querySelectorAll("[data-coin-side]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      };
    });

    // Dice
    dom.dynamicBetControls.querySelectorAll("[data-dice-mode]").forEach(btn => {
      btn.onclick = () => {
        state.diceMode = btn.dataset.diceMode;
        dom.dynamicBetControls.querySelectorAll("[data-dice-mode]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      };
    });

    // Plinko
    dom.dynamicBetControls.querySelectorAll("[data-plinko-risk]").forEach(btn => {
      btn.onclick = () => {
        state.plinkoRisk = btn.dataset.plinkoRisk;
        dom.dynamicBetControls.querySelectorAll("[data-plinko-risk]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      };
    });

    // HiLo
    dom.dynamicBetControls.querySelectorAll("[data-hilo]").forEach(btn => {
      btn.onclick = () => {
        state.hiloGuess = btn.dataset.hilo;
        dom.dynamicBetControls.querySelectorAll("[data-hilo]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      };
    });

    // Birds
    dom.dynamicBetControls.querySelectorAll("[data-bird]").forEach(btn => {
      btn.onclick = () => {
        state.birdPick = Number(btn.dataset.bird);
        dom.dynamicBetControls.querySelectorAll("[data-bird]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      };
    });

    // Slots
    dom.dynamicBetControls.querySelectorAll("[data-slot-vol]").forEach(btn => {
      btn.onclick = () => {
        state.slotVolatility = btn.dataset.slotVol;
        dom.dynamicBetControls.querySelectorAll("[data-slot-vol]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      };
    });

    $("#limboTargetInput", dom.dynamicBetControls)?.addEventListener("input", (e) => {
      state.limboTarget = clamp(parseFloat(e.target.value || "2") || 2, 1.01, 1000);
    });

    $("#diceChanceInput", dom.dynamicBetControls)?.addEventListener("input", (e) => {
      state.diceChance = clamp(parseFloat(e.target.value || "49.5") || 49.5, 1, 95);
    });

    $("#blackjackStandInput", dom.dynamicBetControls)?.addEventListener("input", (e) => {
      state.blackjackStandOn = clamp(parseInt(e.target.value || "17", 10) || 17, 16, 19);
    });

    $("#autoRoundsInput", dom.dynamicBetControls)?.addEventListener("input", (e) => {
      state.autoRounds = clamp(parseInt(e.target.value || "10", 10) || 10, 1, 100);
    });
  }

  /* =========================================================
     ENGINE VIEWS
  ========================================================= */
  function renderGameShell(gameKey) {
    switch (gameKey) {
      case "coinflip":
        return setEngineHTML(`
          <div class="engine engine-coinflip">
            <div class="engine-center">🪙</div>
            <div class="engine-note">Heads or Tails</div>
          </div>
        `);

      case "limbo":
        return setEngineHTML(`
          <div class="engine engine-limbo">
            <div class="engine-center" id="limboResultLabel">Target ${state.limboTarget.toFixed(2)}×</div>
            <div class="engine-note">Limbo Result Ready</div>
          </div>
        `);

      case "dice":
        return setEngineHTML(`
          <div class="engine engine-dice">
            <div class="engine-center" id="diceRollLabel">--</div>
            <div class="engine-note">Waiting for roll</div>
          </div>
        `);

      case "crash":
        return setEngineHTML(`
          <div class="engine engine-crash">
            <div class="engine-center" id="crashStatusLabel">Ready for takeoff</div>
            <div class="engine-note">Cash out before explosion</div>
          </div>
        `);

      case "plinko":
        return setEngineHTML(`
          <div class="engine engine-plinko">
            <div class="engine-center" id="plinkoResultLabel">Drop Ready</div>
            <div class="engine-note">Risk: ${state.plinkoRisk}</div>
          </div>
        `);

      case "blackjack":
        return setEngineHTML(`
          <div class="engine engine-blackjack">
            <div class="engine-center" id="blackjackScoreLabel">Player 0 • Dealer 0</div>
            <div class="engine-note">21 wins</div>
          </div>
        `);

      case "hilo":
        return setEngineHTML(`
          <div class="engine engine-hilo">
            <div class="engine-center" id="hiloCardLabel">?</div>
            <div class="engine-note">Guess ${state.hiloGuess}</div>
          </div>
        `);

      case "birdsparty":
        return setEngineHTML(`
          <div class="engine engine-birds">
            <div class="engine-center" id="birdsLabel">🐦 🐦 🐦</div>
            <div class="engine-note">Pick a lucky bird</div>
          </div>
        `);

      case "airboss":
        return setEngineHTML(`
          <div class="engine engine-airboss">
            <div class="engine-center" id="airbossStatusLabel">Runway clear</div>
            <div class="engine-note">Cash out before drop</div>
          </div>
        `);

      case "slot":
      case "fruitparty":
      case "bananafarm":
        return setEngineHTML(`
          <div class="engine engine-slots">
            <div class="engine-center slot-reels" id="slotReelsLabel">🍒 • 🍋 • ⭐</div>
            <div class="engine-note">Spin the reels</div>
          </div>
        `);

      default:
        return setEngineHTML(`<div class="engine"><div class="engine-center">Game Ready</div></div>`);
    }
  }

  /* =========================================================
     PLAY FLOW
  ========================================================= */
  function startCurrentGameFlow() {
    if (!state.currentGame) return;

    const bet = getBet();
    if (!bet || bet <= 0) return;
    if (bet > state.balanceBX) return;

    state.balanceBX -= bet;
    state.liveBets += 1;
    state.volumeToday += bet;
    state.nonce += 1;

    syncTopStats();
    syncFairnessUI();
    updatePulseStrip();

    setPlayingUI(true);
    runGameByKey(state.currentGame, bet);
  }

  function stopCurrentGameFlow() {
    stopAllGameTimers();
    state.playing = false;
    state.canCashout = false;
    state.autoPlay = false;
    state.autoRemaining = 0;

    flashEngine("lose");
    setPlayingUI(false);
  }

  function handleCashout() {
    if (!state.currentGame) return;
    if (!GAMES[state.currentGame]?.supportsCashout) return;
    if (!state.canCashout) return;

    const bet = getBet();
    const payout = bet * state.currentMultiplier;

    state.balanceBX += payout;
    state.lastPayout = payout;
    state.canCashout = false;
    state.playing = false;

    syncTopStats();
    pushBigWinRow(GAMES[state.currentGame].name, payout, state.currentMultiplier, "You");
    flashEngine("win");
    playSound("win");

    setCaption(`Cashed out at ${state.currentMultiplier.toFixed(2)}× • +${payout.toFixed(2)} BX`);
    setPlayingUI(false);
    maybeContinueAuto();
  }

  function resolveRound(win, mult, bet, extraText = "") {
    stopAllGameTimers();

    const payout = win ? bet * mult : 0;
    state.lastPayout = payout;
    state.playing = false;
    state.canCashout = false;
    setMultiplier(mult);

    if (win) {
      state.balanceBX += payout;
      pushBigWinRow(GAMES[state.currentGame].name, payout, mult, "You");
      flashEngine("win");
      playSound("win");
      setCaption(`${extraText || "You won"} • ${mult.toFixed(2)}× • +${payout.toFixed(2)} BX`);
    } else {
      flashEngine("lose");
      playSound("lose");
      setCaption(`${extraText || "You lost"} • ${mult.toFixed(2)}×`);
    }

    syncTopStats();
    setPlayingUI(false);
    maybeContinueAuto();
  }

  function maybeContinueAuto() {
    if (state.currentSettingsTab !== "auto") return;
    if (state.autoRemaining <= 0) return;

    state.autoRemaining -= 1;
    if (state.autoRemaining <= 0) {
      state.autoPlay = false;
      setPlayingUI(false);
      return;
    }

    state.autoPlay = true;
    state.autoLoopTimer = setTimeout(() => {
      startCurrentGameFlow();
    }, 900);
  }

  function runGameByKey(gameKey, bet) {
    switch (gameKey) {
      case "coinflip":   return runCoinflipGame(bet);
      case "limbo":      return runLimboGame(bet);
      case "dice":       return runDiceGame(bet);
      case "crash":      return runCrashGame(bet);
      case "plinko":     return runPlinkoGame(bet);
      case "blackjack":  return runBlackjackGame(bet);
      case "hilo":       return runHiLoGame(bet);
      case "birdsparty": return runBirdsPartyGame(bet);
      case "airboss":    return runAirBossGame(bet);
      case "slot":       return runSlotGame(bet);
      case "fruitparty": return runFruitPartyGame(bet);
      case "bananafarm": return runBananaFarmGame(bet);
      default:
        state.playing = false;
        setPlayingUI(false);
    }
  }

  /* =========================================================
     GAME ENGINES
  ========================================================= */
  function runCoinflipGame(bet) {
    playSound("spin");
    setCaption("Flipping coin...");
    const coin = $(".engine-center", dom.engineBody);
    if (coin) coin.textContent = "🪙";

    const sideBtn = $(".dyn-btn.active[data-coin-side]", dom.dynamicBetControls);
    const pick = sideBtn?.dataset.coinSide || "heads";
    const result = Math.random() > 0.5 ? "heads" : "tails";
    const win = pick === result;

    state.gameLoopTimer = setTimeout(() => {
      if (coin) coin.textContent = result === "heads" ? "🙂 Heads" : "🦅 Tails";
      resolveRound(win, win ? 1.96 : 0.00, bet, `Coin: ${result}`);
    }, 1100);
  }

  function runLimboGame(bet) {
    playSound("spin");
    const target = clamp(state.limboTarget, 1.01, 1000);
    const result = rnd(1.00, 25.00, 2);
    $("#limboResultLabel", dom.engineBody)?.replaceChildren(document.createTextNode(`${result.toFixed(2)}×`));
    state.gameLoopTimer = setTimeout(() => {
      resolveRound(result >= target, result >= target ? target : result, bet, `Target ${target.toFixed(2)}×`);
    }, 900);
  }

  function runDiceGame(bet) {
    playSound("spin");
    const roll = rnd(0.00, 99.99, 2);
    const chance = clamp(state.diceChance, 1, 95);
    const win = state.diceMode === "under" ? roll < chance : roll > (100 - chance);
    const mult = +(99 / chance).toFixed(2);

    const el = $("#diceRollLabel", dom.engineBody);
    if (el) el.textContent = roll.toFixed(2);

    state.gameLoopTimer = setTimeout(() => {
      resolveRound(win, win ? mult : 0.00, bet, `Roll ${roll.toFixed(2)} • ${state.diceMode} ${chance.toFixed(2)}`);
    }, 1000);
  }

  function runCrashGame(bet) {
    playSound("spin");
    state.canCashout = true;
    state.playing = true;
    setPlayingUI(true);

    const status = $("#crashStatusLabel", dom.engineBody);
    let mult = 1.00;
    const crashAt = rnd(1.20, 9.50, 2);

    if (status) status.textContent = "Ascending...";

    state.gameLoopTimer = setInterval(() => {
      mult += rnd(0.05, 0.18, 2);
      setMultiplier(mult);

      if (status) status.textContent = `Live • Crash at ?`;

      if (mult >= crashAt) {
        stopAllGameTimers();
        state.canCashout = false;
        state.playing = false;
        if (status) status.textContent = `Crashed at ${crashAt.toFixed(2)}×`;
        resolveRound(false, crashAt, bet, `Crash at ${crashAt.toFixed(2)}×`);
      }
    }, 220);
  }

  function runPlinkoGame(bet) {
    playSound("spin");
    const map = {
      low: [0.5, 0.7, 1.0, 1.2, 1.6],
      medium: [0.3, 0.8, 1.0, 1.8, 3.0],
      high: [0.2, 0.4, 1.0, 3.0, 8.0]
    };
    const bag = map[state.plinkoRisk] || map.medium;
    const mult = bag[randInt(0, bag.length - 1)];
    const win = mult >= 1;

    $("#plinkoResultLabel", dom.engineBody)?.replaceChildren(document.createTextNode(`Risk: ${state.plinkoRisk}`));

    state.gameLoopTimer = setTimeout(() => {
      $("#plinkoResultLabel", dom.engineBody)?.replaceChildren(document.createTextNode(`${mult.toFixed(2)}×`));
      resolveRound(win, mult, bet, `Plinko ${state.plinkoRisk}`);
    }, 1200);
  }

  function runBlackjackGame(bet) {
    playSound("spin");
    const player = randInt(12, 21);
    const dealer = randInt(14, 23);
    const el = $("#blackjackScoreLabel", dom.engineBody);
    if (el) el.textContent = `Player ${player} • Dealer ${dealer}`;

    const win = (player <= 21 && (dealer > 21 || player > dealer));
    const mult = player === 21 ? 2.50 : 2.00;

    state.gameLoopTimer = setTimeout(() => {
      resolveRound(win, win ? mult : 0.00, bet, `BJ ${player} vs ${dealer}`);
    }, 1000);
  }

  function runHiLoGame(bet) {
    playSound("spin");
    const current = randInt(2, 14);
    const next = randInt(2, 14);
    const win = state.hiloGuess === "higher" ? next > current : next < current;

    const el = $("#hiloCardLabel", dom.engineBody);
    if (el) el.textContent = `${current} → ?`;

    state.gameLoopTimer = setTimeout(() => {
      if (el) el.textContent = `${current} → ${next}`;
      resolveRound(win, win ? 1.92 : 0.00, bet, `HiLo ${state.hiloGuess}`);
    }, 1000);
  }

  function runBirdsPartyGame(bet) {
    playSound("spin");
    const winner = randInt(1, 3);
    const win = state.birdPick === winner;
    const el = $("#birdsLabel", dom.engineBody);
    if (el) el.textContent = "🐦 🐦 🐦";

    state.gameLoopTimer = setTimeout(() => {
      if (el) el.textContent = `Winner Bird: ${winner}`;
      resolveRound(win, win ? 3.00 : 0.00, bet, `Bird #${winner}`);
    }, 1100);
  }

  function runAirBossGame(bet) {
    playSound("spin");
    state.canCashout = true;
    state.playing = true;
    setPlayingUI(true);

    const status = $("#airbossStatusLabel", dom.engineBody);
    let mult = 1.00;
    const failAt = rnd(1.30, 12.00, 2);

    if (status) status.textContent = "Flight started";

    state.gameLoopTimer = setInterval(() => {
      mult += rnd(0.04, 0.15, 2);
      setMultiplier(mult);

      if (status) status.textContent = "In air...";

      if (mult >= failAt) {
        stopAllGameTimers();
        state.canCashout = false;
        state.playing = false;
        if (status) status.textContent = `Dropped at ${failAt.toFixed(2)}×`;
        resolveRound(false, failAt, bet, `AirBoss fail ${failAt.toFixed(2)}×`);
      }
    }, 240);
  }

  function runSlotLikeGame(bet, title = "Slots") {
    playSound("spin");
    const symbols = ["🍒", "🍋", "⭐", "7️⃣", "🍌", "🍉"];
    const pick = () => symbols[randInt(0, symbols.length - 1)];
    const a = pick(), b = pick(), c = pick();
    const reels = $("#slotReelsLabel", dom.engineBody);
    if (reels) reels.textContent = `${a} • ${b} • ${c}`;

    let mult = 0.00;
    if (a === b && b === c) mult = a === "7️⃣" ? 12.00 : 5.00;
    else if (a === b || b === c || a === c) mult = 1.80;

    const win = mult >= 1;

    state.gameLoopTimer = setTimeout(() => {
      resolveRound(win, mult, bet, `${title} spin`);
    }, 1200);
  }

  function runSlotGame(bet) {
    runSlotLikeGame(bet, "Seven Classic Slot");
  }

  function runFruitPartyGame(bet) {
    runSlotLikeGame(bet, "Fruit Party");
  }

  function runBananaFarmGame(bet) {
    runSlotLikeGame(bet, "Banana Farm");
  }

  /* =========================================================
     EVENTS
  ========================================================= */
  function bindLobby() {
    dom.gamesGrid?.addEventListener("click", (e) => {
      const card = e.target.closest(".casino-game-card");
      if (!card) return;
      playSound("click");
      openGame(card.dataset.game);
    });

    dom.filterTabs.forEach(btn => {
      btn.addEventListener("click", () => {
        playSound("click");
        applyFilter(btn.dataset.filter || "all");
      });
    });

    dom.refreshBtn?.addEventListener("click", () => {
      playSound("click");
      pushTickerRow();
      seedPlayersFeed();
      state.liveBets += randInt(2, 8);
      state.volumeToday += rnd(10, 60, 2);
      syncTopStats();
    });
  }

  function bindGameShell() {
    dom.backBtn?.addEventListener("click", () => {
      playSound("click");
      openLobby();
    });

    dom.modeTabs.forEach(btn => {
      btn.addEventListener("click", () => {
        playSound("click");
        dom.modeTabs.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.currentModeTab = btn.dataset.modeTab || "classic";
      });
    });

    dom.settingsTabs.forEach(btn => {
      btn.addEventListener("click", () => {
        playSound("click");
        dom.settingsTabs.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.currentSettingsTab = btn.dataset.settingsTab || "manual";
        if (state.currentGame) buildDynamicControls(state.currentGame);
      });
    });

    dom.toolBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        playSound("click");
        dom.toolBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        state.currentTool = btn.textContent.trim();
      });
    });

    dom.betActionBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        playSound("click");
        const act = btn.dataset.betAction;
        const current = getBet();

        if (act === "half") setBet(Math.max(0.01, current / 2));
        else if (act === "double") setBet(current * 2);
        else if (act === "up") setBet(current + 1);
      });
    });

    dom.newSeedBtn?.addEventListener("click", () => {
      playSound("click");
      regenerateSeeds();
    });

    dom.playBtn?.addEventListener("click", () => {
      if (!state.currentGame) return;
      playSound("click");

      const btnState = dom.playBtn.dataset.state || "idle";

      if (btnState === "cashout") {
        handleCashout();
        return;
      }

      if (btnState === "stop" || btnState === "running") {
        stopCurrentGameFlow();
        return;
      }

      if (state.currentSettingsTab === "auto") {
        state.autoRemaining = clamp(parseInt($("#autoRoundsInput", dom.dynamicBetControls)?.value || state.autoRounds, 10) || 10, 1, 100);
        state.autoPlay = true;
      }

      startCurrentGameFlow();
    });
  }

  /* =========================================================
     INIT
  ========================================================= */
  function init() {
    regenerateSeeds();
    syncTopStats();
    syncFairnessUI();
    updatePulseStrip();
    bootstrapFeeds();

    setBet(10);
    applyFilter("all");
    bindLobby();
    bindGameShell();
    startBackgroundLoops();
    openLobby();

    // public bridge (optional)
    window.BLOXIO_CASINO = {
      openGame,
      openLobby,
      state,
      pushBigWinRow,
      pushTickerRow
    };
  }

  init();
})();
