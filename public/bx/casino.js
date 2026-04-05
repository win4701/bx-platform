/* =========================================================
   CASINO MASTER CONSOLIDATED — FINAL
   BLOXIO x BC.GAME STYLE ENGINE 
========================================================= */

(() => {
  "use strict";

  /* =========================================================
     SAFE HELPERS
  ========================================================= */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const chance = (p) => Math.random() < p;
  const uid = () => Math.random().toString(36).slice(2, 10);

  const formatMoney = (n) => {
    const num = Number(n || 0);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: num < 100 ? 2 : 0,
      maximumFractionDigits: 2
    });
  };

  const shortHash = (len = 16) =>
    [...Array(len)].map(() => "abcdef0123456789"[randInt(0, 15)]).join("");

  const toast = (msg) => {
    console.log("[CASINO]", msg);
    if (window.showToast) return window.showToast(msg);

    let t = document.getElementById("casinoToast");
    if (!t) {
      t = document.createElement("div");
      t.id = "casinoToast";
      Object.assign(t.style, {
        position: "fixed",
        left: "50%",
        bottom: "100px",
        transform: "translateX(-50%)",
        background: "rgba(15,23,42,.95)",
        color: "#fff",
        padding: "12px 16px",
        borderRadius: "14px",
        fontSize: "13px",
        fontWeight: "800",
        zIndex: 999999,
        boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        opacity: "0",
        transition: ".25s"
      });
      document.body.appendChild(t);
    }

    t.textContent = msg;
    t.style.opacity = "1";
    clearTimeout(t._hide);
    t._hide = setTimeout(() => {
      t.style.opacity = "0";
    }, 1800);
  };

  /* =========================================================
     STORAGE KEYS
  ========================================================= */
  const STORAGE_KEYS = {
    WALLET: "casino_wallet_balance",
    HISTORY: "casino_bet_history",
    FAIRNESS: "casino_fairness_state",
    LAST_GAME: "casino_last_game",
    BIGWINS: "casino_bigwins_feed"
  };

  /* =========================================================
     ROOT APP
  ========================================================= */
  const CASINO = {
    root: null,
    lobby: null,
    gameView: null,

    state: {
      wallet: 2500,
      currentGame: null,
      currentTab: "all",
      autoMode: false,
      isPlaying: false,
      isCashedOut: false,
      gameLoop: null,
      history: [],
      bigWins: [],
      players: [],
      fairness: {
        serverSeed: shortHash(32),
        clientSeed: shortHash(16),
        nonce: 1
      },
      betAmount: 10,
      activeEngine: null,
      mountedGameId: null,
      stats: {
        online: 1284,
        payout: 97.4,
        volume: 348921
      }
    },

    games: [
  {
    id: "coinflip",
    name: "Coinflip",
    type: "Classic",
    icon: "🪙",
    image: "assets/casino/coinflip.png",
    color: "#f59e0b"
  },
  {
    id: "limbo",
    name: "Limbo",
    type: "Instant",
    icon: "🎯",
    image: "assets/casino/limbo.png",
    color: "#14b8a6"
  },
  {
    id: "dice",
    name: "Dice",
    type: "Classic",
    icon: "🎲",
    image: "assets/casino/dice.png",
    color: "#3b82f6"
  },
  {
    id: "crash",
    name: "Crash",
    type: "Popular",
    icon: "📈",
    image: "assets/casino/crash.png",
    color: "#22c55e"
  },
  {
    id: "plinko",
    name: "Plinko",
    type: "Popular",
    icon: "🔻",
    image: "assets/casino/plinko.png",
    color: "#8b5cf6"
  },
  {
    id: "blackjack",
    name: "Blackjack",
    type: "Cards",
    icon: "🃏",
    image: "assets/casino/blackjack.png",
    color: "#f97316"
  },
  {
    id: "hilo",
    name: "Hi-Lo",
    type: "Cards",
    icon: "⬆️",
    image: "assets/casino/hilo.png",
    color: "#06b6d4"
  },
  {
    id: "slots",
    name: "Slots",
    type: "Slots",
    icon: "🎰",
    image: "assets/casino/slot.png",
    color: "#ec4899"
  },
  {
    id: "mines",
    name: "Mines",
    type: "Strategy",
    icon: "💣",
    image: "assets/casino/mines.png",
    color: "#ef4444"
  },
  {
    id: "fruitparty",
    name: "FruitParty",
    type: "Slots",
    icon: "🍉",
    image: "assets/casino/fruitparty.png",
    color: "#84cc16"
  },
  {
    id: "bananafarm",
    name: "BananaFarm",
    type: "Slots",
    icon: "🍌",
    image: "assets/casino/bananafarm.png",
    color: "#eab308"
  },
  {
    id: "airboss",
    name: "AirBoss",
    type: "Popular",
    icon: "✈️",
    image: "assets/casino/airboss.png",
    color: "#0ea5e9"
  }
],  

/* =========================================================
       INIT
    ========================================================= */
    init() {
      this.root = document.getElementById("casino");
      if (!this.root) return;

      this.ensureShell();
      this.loadState();
      this.renderLobby();
      this.bindGlobal();
      this.startAmbientFeeds();

      const last = localStorage.getItem(STORAGE_KEYS.LAST_GAME);
      if (last && this.games.find(g => g.id === last)) {
        // Optional auto-restore disabled by default
      }
    },

    ensureShell() {
      if (!document.getElementById("casinoLobby")) {
        const lobby = document.createElement("div");
        lobby.id = "casinoLobby";
        this.root.appendChild(lobby);
      }

      if (!document.getElementById("casinoGameView")) {
        const gameView = document.createElement("div");
        gameView.id = "casinoGameView";
        gameView.className = "hidden";
        this.root.appendChild(gameView);
      }

      this.lobby = document.getElementById("casinoLobby");
      this.gameView = document.getElementById("casinoGameView");
    },

    loadState() {
      const wallet = localStorage.getItem(STORAGE_KEYS.WALLET);
      if (wallet !== null) this.state.wallet = Number(wallet) || this.state.wallet;

      const hist = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (hist) {
        try { this.state.history = JSON.parse(hist) || []; } catch {}
      }

      const fairness = localStorage.getItem(STORAGE_KEYS.FAIRNESS);
      if (fairness) {
        try {
          this.state.fairness = {
            ...this.state.fairness,
            ...JSON.parse(fairness)
          };
        } catch {}
      }

      const bigWins = localStorage.getItem(STORAGE_KEYS.BIGWINS);
      if (bigWins) {
        try { this.state.bigWins = JSON.parse(bigWins) || []; } catch {}
      }

      if (!this.state.bigWins.length) {
        this.seedBigWins();
      }
    },

    saveState() {
      localStorage.setItem(STORAGE_KEYS.WALLET, String(this.state.wallet));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(this.state.history.slice(0, 60)));
      localStorage.setItem(STORAGE_KEYS.FAIRNESS, JSON.stringify(this.state.fairness));
      localStorage.setItem(STORAGE_KEYS.BIGWINS, JSON.stringify(this.state.bigWins.slice(0, 50)));
      if (this.state.currentGame) {
        localStorage.setItem(STORAGE_KEYS.LAST_GAME, this.state.currentGame.id);
      }
    },

    /* =========================================================
       LOBBY
    ========================================================= */
    renderLobby() {
      const tabs = ["all", "popular", "classic", "slots", "strategy", "cards", "instant"];
      const filtered = this.getFilteredGames();

      this.lobby.innerHTML = `
        <div class="casino-topbar">
          <div class="casino-brand-wrap">
            <div class="casino-brand-badge">🎰</div>
            <div>
              <h2 class="casino-title">Casino</h2>
              <p class="casino-subtitle">Provably fair • Instant games • Live feed</p>
            </div>
          </div>
          <button class="casino-icon-btn" id="casinoRefreshBtn">⟳</button>
        </div>

        <div class="casino-stats-strip">
          <div class="casino-stat-card">
            <span class="casino-stat-label">Wallet</span>
            <strong id="casinoWalletText">${formatMoney(this.state.wallet)} BX</strong>
          </div>
          <div class="casino-stat-card">
            <span class="casino-stat-label">Players Online</span>
            <strong id="casinoOnlineText">${this.state.stats.online.toLocaleString()}</strong>
          </div>
          <div class="casino-stat-card">
            <span class="casino-stat-label">24H Volume</span>
            <strong id="casinoVolumeText">${formatMoney(this.state.stats.volume)} BX</strong>
          </div>
        </div>

        <div class="ticker-pulse-wrap">
          <div class="ticker-pulse-label">LIVE FEED</div>
          <div class="ticker-pulse-track" id="casinoTickerTrack"></div>
        </div>

        <div class="casino-filter-tabs" id="casinoFilterTabs">
          ${tabs.map(tab => `
            <button class="casino-filter-tab ${this.state.currentTab === tab ? "active" : ""}" data-tab="${tab}">
              ${tab[0].toUpperCase() + tab.slice(1)}
            </button>
          `).join("")}
        </div>

        <div id="casinoGamesGrid">
          ${filtered.map(game => this.renderGameCard(game)).join("")}
        </div>

        <div class="big-wins">
          <div class="big-wins-title">Big Wins</div>
          <div class="big-wins-track" id="bigWinsTrack">
            ${this.state.bigWins.slice(0, 14).map(this.renderBigWinRow).join("")}
          </div>
        </div>
      `;

      this.bindLobby();
      this.renderTicker();
    },

    renderGameCard(game) {
      return `
        <button class="casino-game-card" data-game="${game.id}">
          <div class="casino-game-thumb">
            <img src="${game.image}" alt="${game.name}">
          </div>
          <div class="casino-game-meta">
            <div class="casino-game-name">${game.icon} ${game.name}</div>
            <div class="casino-game-type">${game.type}</div>
          </div>
        </button>
      `;
    },

    getFilteredGames() {
      const tab = this.state.currentTab;
      if (tab === "all") return this.games;
      return this.games.filter(g => g.type.toLowerCase() === tab);
    },

    bindLobby() {
      $$("#casinoFilterTabs .casino-filter-tab", this.lobby).forEach(btn => {
        btn.onclick = () => {
          this.state.currentTab = btn.dataset.tab;
          this.renderLobby();
        };
      });

      $$("#casinoGamesGrid .casino-game-card", this.lobby).forEach(card => {
        card.onclick = () => {
          const id = card.dataset.game;
          this.openGame(id);
        };
      });

      const refreshBtn = $("#casinoRefreshBtn", this.lobby);
      if (refreshBtn) {
        refreshBtn.onclick = () => {
          this.state.stats.online += randInt(-12, 25);
          this.state.stats.volume += randInt(1000, 12000);
          this.pushRandomBigWin();
          this.renderLobby();
          toast("Casino refreshed");
        };
      }
    },

    /* =========================================================
       GAME VIEW
    ========================================================= */
    openGame(gameId) {
      const game = this.games.find(g => g.id === gameId);
      if (!game) return;

      this.cleanupCurrentGame();

      this.state.currentGame = game;
      this.state.mountedGameId = game.id;
      this.state.isPlaying = false;
      this.state.isCashedOut = false;
      this.state.betAmount = 10;

      this.lobby.classList.add("hidden");
      this.gameView.classList.remove("hidden");

      this.renderGameShell(game);
      this.mountGame(game);
      this.saveState();
    },

    closeGame() {
      this.cleanupCurrentGame();
      this.state.currentGame = null;
      this.state.mountedGameId = null;
      this.gameView.classList.add("hidden");
      this.lobby.classList.remove("hidden");
      this.renderLobby();
    },

    renderGameShell(game) {
      this.gameView.innerHTML = `
        <div class="game-shell-topbar">
          <div class="game-shell-title-wrap">
            <button class="game-back-btn" id="casinoBackBtn">←</button>
            <div>
              <h2 class="game-shell-title">${game.icon} ${game.name}</h2>
              <p class="game-shell-subtitle">Provably fair • ${game.type} • Instant settle</p>
            </div>
          </div>
          <button class="casino-icon-btn" id="casinoSeedRefreshBtn">⚙</button>
        </div>

        <div class="game-header-tabs">
          <button class="game-header-tab active" data-headtab="game">Game</button>
          <button class="game-header-tab" data-headtab="fairness">Fair</button>
          <button class="game-header-tab" data-headtab="players">Players</button>
        </div>

        <div class="game-pulse-strip" id="gamePulseStrip">
          <div class="pulse-pill green">Wallet: ${formatMoney(this.state.wallet)} BX</div>
          <div class="pulse-pill">Bet: <span id="liveBetText">${formatMoney(this.state.betAmount)}</span></div>
          <div class="pulse-pill orange" id="liveStateText">Ready</div>
        </div>

        <div id="casinoHeadPanels">
          <div class="game-shell-card" data-panel="game">
            <div id="casinoGameStage" class="game-engine-stage">
              <div id="gameMultiplierDisplay">1.00x</div>
              <div id="gameEngineBody">Loading ${game.name}...</div>
            </div>
          </div>

          <div class="bet-panel" data-panel="game">
            <div class="settings-tabs">
              <button class="settings-tab active" data-mode="manual">Manual</button>
              <button class="settings-tab" data-mode="auto">Auto</button>
            </div>

            <div class="bet-input-group">
              <div class="bet-amount-box">
                <span>Bet</span>
                <input type="number" id="betAmountInput" min="1" step="0.01" value="${this.state.betAmount}">
              </div>

              <div class="bet-quick-row">
                <button data-betquick="1">1</button>
                <button data-betquick="5">5</button>
                <button data-betquick="25">25</button>
                <button data-betquick="100">100</button>
              </div>
            </div>

            <div id="dynamicBetControls"></div>

            <button id="casinoPlayBtn">Play</button>
            <button id="casinoStopBtn" class="hidden">Stop</button>
            <button id="casinoCashoutBtn" class="hidden">Cashout</button>
          </div>

          <div class="fairness-card hidden" data-panel="fairness">
            <div class="panel-title">Provably Fair</div>
            <div class="fairness-row">
              <div class="fairness-item">
                <span>Server Seed</span>
                <strong id="serverSeedText">${this.state.fairness.serverSeed}</strong>
              </div>
              <div class="fairness-item">
                <span>Client Seed</span>
                <strong id="clientSeedText">${this.state.fairness.clientSeed}</strong>
              </div>
              <div class="fairness-item">
                <span>Nonce</span>
                <strong id="nonceText">${this.state.fairness.nonce}</strong>
              </div>
            </div>
            <button id="newSeedBtn">Generate New Seeds</button>
          </div>

          <div class="players-card hidden" data-panel="players">
            <div class="players-head">
              <div class="panel-title">Live Players</div>
              <div>
                <span id="playersCountText">0 players</span> •
                <span id="playersVolumeText">0 BX</span>
              </div>
            </div>
            <div id="playersTableBody"></div>
          </div>
        </div>
      `;

      this.bindGameShell();
      this.renderPlayers();
    },

    bindGameShell() {
      $("#casinoBackBtn", this.gameView).onclick = () => this.closeGame();

      $("#casinoSeedRefreshBtn", this.gameView).onclick = () => {
        this.regenerateSeeds();
        toast("Seeds refreshed");
      };

      $$(".game-header-tab", this.gameView).forEach(tab => {
        tab.onclick = () => {
          $$(".game-header-tab", this.gameView).forEach(t => t.classList.remove("active"));
          tab.classList.add("active");

          const active = tab.dataset.headtab;
          $$("[data-panel]", this.gameView).forEach(panel => {
            panel.classList.toggle("hidden", panel.dataset.panel !== active);
          });
        };
      });

      $$(".settings-tab", this.gameView).forEach(tab => {
        tab.onclick = () => {
          $$(".settings-tab", this.gameView).forEach(t => t.classList.remove("active"));
          tab.classList.add("active");
          this.state.autoMode = tab.dataset.mode === "auto";
          toast(this.state.autoMode ? "Auto mode enabled" : "Manual mode enabled");
        };
      });

      const betInput = $("#betAmountInput", this.gameView);
      betInput.oninput = () => {
        const val = clamp(Number(betInput.value || 0), 0, 1e9);
        this.state.betAmount = val;
        this.updateLiveBet();
      };

      $$("[data-betquick]", this.gameView).forEach(btn => {
        btn.onclick = () => {
          const value = Number(btn.dataset.betquick);
          this.state.betAmount = value;
          $("#betAmountInput", this.gameView).value = value;
          this.updateLiveBet();
        };
      });

      $("#casinoPlayBtn", this.gameView).onclick = () => this.playCurrentGame();
      $("#casinoStopBtn", this.gameView).onclick = () => this.stopCurrentGame();
      $("#casinoCashoutBtn", this.gameView).onclick = () => this.cashoutCurrentGame();

      $("#newSeedBtn", this.gameView).onclick = () => {
        this.regenerateSeeds();
        toast("New provably fair seeds generated");
      };
    },

    updateLiveBet() {
      const el = $("#liveBetText", this.gameView);
      if (el) el.textContent = formatMoney(this.state.betAmount);
    },

    updateLiveState(text) {
      const el = $("#liveStateText", this.gameView);
      if (el) el.textContent = text;
    },

    /* =========================================================
       FAIRNESS
    ========================================================= */
    regenerateSeeds() {
      this.state.fairness.serverSeed = shortHash(32);
      this.state.fairness.clientSeed = shortHash(16);
      this.state.fairness.nonce = 1;
      this.syncFairnessUI();
      this.saveState();
    },

    useNonce() {
      this.state.fairness.nonce += 1;
      this.syncFairnessUI();
      this.saveState();
    },

    syncFairnessUI() {
      const server = $("#serverSeedText", this.gameView);
      const client = $("#clientSeedText", this.gameView);
      const nonce = $("#nonceText", this.gameView);

      if (server) server.textContent = this.state.fairness.serverSeed;
      if (client) client.textContent = this.state.fairness.clientSeed;
      if (nonce) nonce.textContent = this.state.fairness.nonce;
    },

    /* =========================================================
       WALLET
    ========================================================= */
    canAfford(amount) {
      return this.state.wallet >= amount;
    },

    debit(amount) {
      this.state.wallet = Math.max(0, this.state.wallet - amount);
      this.syncWalletUI();
      this.saveState();
    },

    credit(amount) {
      this.state.wallet += amount;
      this.syncWalletUI();
      this.saveState();
    },

    syncWalletUI() {
      const walletText = $("#casinoWalletText", this.lobby);
      if (walletText) walletText.textContent = `${formatMoney(this.state.wallet)} BX`;

      const pulse = $("#gamePulseStrip .pulse-pill.green", this.gameView);
      if (pulse) pulse.textContent = `Wallet: ${formatMoney(this.state.wallet)} BX`;
    },

    /* =========================================================
       PLAY CORE
    ========================================================= */
    playCurrentGame() {
      if (!this.state.currentGame) return;
      if (this.state.isPlaying) return;

      const amount = clamp(Number(this.state.betAmount || 0), 0, 1e9);
      if (!amount || amount <= 0) return toast("Enter valid bet amount");
      if (!this.canAfford(amount)) return toast("Insufficient balance");

      this.debit(amount);
      this.state.isPlaying = true;
      this.state.isCashedOut = false;
      this.updateLiveState("Running");

      this.toggleActionButtons({
        play: false,
        stop: true,
        cashout: ["crash", "mines", "hilo"].includes(this.state.currentGame.id)
      });

      this.useNonce();

      if (this.state.activeEngine?.play) {
        this.state.activeEngine.play(amount);
      }
    },

    stopCurrentGame() {
      if (!this.state.isPlaying) return;

      if (this.state.activeEngine?.stop) {
        this.state.activeEngine.stop();
      }

      this.finishRound({
        win: false,
        payout: 0,
        multiplier: 0
      });
    },

    cashoutCurrentGame() {
      if (!this.state.isPlaying || this.state.isCashedOut) return;
      if (this.state.activeEngine?.cashout) {
        this.state.activeEngine.cashout();
      }
    },

    finishRound({ win, payout = 0, multiplier = 1, meta = {} }) {
      const game = this.state.currentGame;
      const bet = Number(this.state.betAmount || 0);

      this.state.isPlaying = false;
      this.state.isCashedOut = true;

      this.toggleActionButtons({
        play: true,
        stop: false,
        cashout: false
      });

      if (payout > 0) {
        this.credit(payout);
      }

      this.updateLiveState(win ? "Win" : "Loss");

      const entry = {
        id: uid(),
        game: game?.name || "Unknown",
        gameId: game?.id || "unknown",
        bet,
        payout,
        profit: payout - bet,
        multiplier,
        ts: Date.now(),
        ...meta
      };

      this.state.history.unshift(entry);

      if (entry.profit >= bet * 1.5) {
        this.state.bigWins.unshift({
          user: this.fakeName(),
          game: game?.name || "Game",
          amount: entry.profit,
          multi: multiplier
        });
      }

      this.state.bigWins = this.state.bigWins.slice(0, 30);
      this.saveState();
      this.syncWalletUI();

      if (entry.profit > 0) {
        toast(`Won ${formatMoney(entry.profit)} BX`);
      } else {
        toast(`Lost ${formatMoney(bet)} BX`);
      }

      this.renderPlayers();
    },

    toggleActionButtons({ play, stop, cashout }) {
      const playBtn = $("#casinoPlayBtn", this.gameView);
      const stopBtn = $("#casinoStopBtn", this.gameView);
      const cashoutBtn = $("#casinoCashoutBtn", this.gameView);

      if (playBtn) playBtn.classList.toggle("hidden", !play);
      if (stopBtn) stopBtn.classList.toggle("hidden", !stop);
      if (cashoutBtn) cashoutBtn.classList.toggle("hidden", !cashout);
    },

    /* =========================================================
       GAME MOUNT ENGINE
    ========================================================= */
    mountGame(game) {
      const stage = $("#casinoGameStage", this.gameView);
      const body = $("#gameEngineBody", this.gameView);
      const controls = $("#dynamicBetControls", this.gameView);
      const multi = $("#gameMultiplierDisplay", this.gameView);

      if (!stage || !body || !controls || !multi) return;

      const engines = {
        crash: this.createCrashEngine(),
        dice: this.createDiceEngine(),
        coinflip: this.createCoinflipEngine(),
        slots: this.createSlotsEngine(),
        mines: this.createMinesEngine(),
        plinko: this.createPlinkoEngine(),
        limbo: this.createLimboEngine(),
        blackjack: this.createBlackjackEngine(),
        hilo: this.createHiLoEngine()
      };

      const engine = engines[game.id] || this.createFallbackEngine();
      this.state.activeEngine = engine;

      body.innerHTML = "";
      controls.innerHTML = "";
      multi.textContent = "1.00x";

      engine.mount({ body, controls, multi, stage, app: this });
    },

    cleanupCurrentGame() {
      clearInterval(this.state.gameLoop);
      this.state.gameLoop = null;

      if (this.state.activeEngine?.destroy) {
        this.state.activeEngine.destroy();
      }

      this.state.activeEngine = null;
      this.state.isPlaying = false;
      this.state.isCashedOut = false;
    },

    /* =========================================================
       ENGINES
    ========================================================= */
    createCrashEngine() {
      let interval = null;
      let multiplier = 1;
      let crashedAt = 0;
      let cashed = false;
      let multiEl = null;
      let lineEl = null;

      return {
        mount({ body, controls, multi }) {
          multiEl = multi;

          body.innerHTML = `
            <div class="engine">
              <div class="crash-graph">
                <div class="crash-line" id="crashLine"></div>
              </div>
              <div class="coinflip-result" id="crashHintText">Wait for the multiplier... then cash out.</div>
            </div>
          `;

          lineEl = $("#crashLine", body);

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Auto Cashout</div>
              <input type="number" id="crashAutoCashout" value="2.00" step="0.01" min="1.01">
            </div>
          `;
        },

        play(amount) {
          cashed = false;
          multiplier = 1;
          crashedAt = Number(rand(1.05, 8.5).toFixed(2));
          multiEl.textContent = "1.00x";

          clearInterval(interval);
          interval = setInterval(() => {
            multiplier = +(multiplier + rand(0.03, 0.14)).toFixed(2);
            multiEl.textContent = `${multiplier.toFixed(2)}x`;

            if (lineEl) lineEl.style.width = `${clamp(multiplier * 10, 10, 100)}%`;

            const auto = Number($("#crashAutoCashout", document)?.value || 0);
            if (!cashed && auto > 1 && multiplier >= auto) {
              this.cashout();
            }

            if (multiplier >= crashedAt) {
              clearInterval(interval);
              if (!cashed) {
                CASINO.finishRound({
                  win: false,
                  payout: 0,
                  multiplier: crashedAt
                });
              }
            }
          }, 180);
        },

        cashout() {
          if (cashed) return;
          cashed = true;
          clearInterval(interval);
          const bet = Number(CASINO.state.betAmount || 0);
          const payout = bet * multiplier;
          CASINO.finishRound({
            win: true,
            payout,
            multiplier
          });
        },

        stop() {
          clearInterval(interval);
        },

        destroy() {
          clearInterval(interval);
        }
      };
    },

    createDiceEngine() {
      let rollDisplay, targetInput, overUnderSelect, hitZone;

      return {
        mount({ body, controls, multi }) {
          body.innerHTML = `
            <div class="engine">
              <div class="dice-roll-display" id="diceRollDisplay">--</div>
              <div class="dice-bar">
                <div class="dice-hit-zone" id="diceHitZone" style="width:50%"></div>
              </div>
              <div class="coinflip-result">Roll against target</div>
            </div>
          `;

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Dice Config</div>
              <div class="inline-value-row">
                <span>Target</span>
                <strong id="diceTargetText">50</strong>
              </div>
              <input type="range" id="diceTargetInput" min="5" max="95" value="50">
              <div class="segmented-row">
                <button class="seg-btn active" data-dice-side="under">Roll Under</button>
                <button class="seg-btn" data-dice-side="over">Roll Over</button>
              </div>
            </div>
          `;

          rollDisplay = $("#diceRollDisplay", body);
          targetInput = $("#diceTargetInput", controls);
          hitZone = $("#diceHitZone", body);
          overUnderSelect = "under";

          const targetText = $("#diceTargetText", controls);

          const sync = () => {
            targetText.textContent = targetInput.value;
            hitZone.style.width = `${targetInput.value}%`;
          };
          sync();

          targetInput.oninput = sync;

          $$("[data-dice-side]", controls).forEach(btn => {
            btn.onclick = () => {
              $$("[data-dice-side]", controls).forEach(b => b.classList.remove("active"));
              btn.classList.add("active");
              overUnderSelect = btn.dataset.diceSide;
            };
          });

          multi.textContent = "1.98x";
        },

        play(amount) {
          const target = Number(targetInput.value);
          const roll = +(Math.random() * 100).toFixed(2);
          rollDisplay.textContent = roll.toFixed(2);

          const win = overUnderSelect === "under" ? roll < target : roll > target;
          const edge = 0.99;
          const chancePct = overUnderSelect === "under" ? target : (100 - target);
          const multiplier = +(100 / chancePct * edge).toFixed(2);
          const payout = win ? amount * multiplier : 0;

          setTimeout(() => {
            CASINO.finishRound({ win, payout, multiplier });
          }, 550);
        },

        destroy() {}
      };
    },

    createCoinflipEngine() {
      let result = "heads";
      let pick = "heads";
      let coinEl;

      return {
        mount({ body, controls, multi }) {
          body.innerHTML = `
            <div class="engine">
              <div class="coinflip-coin" id="coinflipCoin">🪙</div>
              <div class="coinflip-result" id="coinflipResultText">Choose heads or tails</div>
            </div>
          `;

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Choose Side</div>
              <div class="segmented-row">
                <button class="seg-btn active" data-coin="heads">Heads</button>
                <button class="seg-btn" data-coin="tails">Tails</button>
              </div>
            </div>
          `;

          coinEl = $("#coinflipCoin", body);
          multi.textContent = "1.96x";

          $$("[data-coin]", controls).forEach(btn => {
            btn.onclick = () => {
              $$("[data-coin]", controls).forEach(b => b.classList.remove("active"));
              btn.classList.add("active");
              pick = btn.dataset.coin;
            };
          });
        },

        play(amount) {
          result = chance(.5) ? "heads" : "tails";
          coinEl.classList.add("spinning");

          setTimeout(() => {
            coinEl.classList.remove("spinning");
            coinEl.textContent = result === "heads" ? "🙂" : "🦅";

            const win = result === pick;
            const multiplier = 1.96;
            const payout = win ? amount * multiplier : 0;
            CASINO.finishRound({ win, payout, multiplier });
          }, 900);
        },

        destroy() {}
      };
    },

    createSlotsEngine() {
      const symbols = ["🍒", "🍋", "🍇", "⭐", "7️⃣", "💎"];
      let cells = [];

      return {
        mount({ body, controls, multi }) {
          body.innerHTML = `
            <div class="engine">
              <div class="slot-reels" id="slotReels">
                <div class="slot-cell">❔</div>
                <div class="slot-cell">❔</div>
                <div class="slot-cell">❔</div>
              </div>
              <div class="slot-status" id="slotStatusText">Spin for a combo</div>
            </div>
          `;

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Slot Mode</div>
              <div class="segmented-row three">
                <button class="seg-btn active">Classic</button>
                <button class="seg-btn">Turbo</button>
                <button class="seg-btn">Max</button>
              </div>
            </div>
          `;

          cells = $$(".slot-cell", body);
          multi.textContent = "0.00x";
        },

        play(amount) {
          const result = [0,1,2].map(() => symbols[randInt(0, symbols.length - 1)]);
          cells.forEach((c, i) => c.textContent = result[i]);

          let multiplier = 0;
          if (result[0] === result[1] && result[1] === result[2]) {
            multiplier = result[0] === "💎" ? 8 : 5;
          } else if (new Set(result).size === 2) {
            multiplier = 1.8;
          }

          const payout = amount * multiplier;
          const win = multiplier > 0;

          setTimeout(() => {
            CASINO.finishRound({ win, payout, multiplier });
          }, 600);
        },

        destroy() {}
      };
    },

    createMinesEngine() {
      let selected = new Set();
      let mines = new Set();
      let boardEl;
      let mineCount = 3;
      let safeCount = 0;
      let currentMultiplier = 1;

      const buildBoard = () => {
        boardEl.innerHTML = "";
        for (let i = 0; i < 9; i++) {
          const btn = document.createElement("button");
          btn.className = "pick-card";
          btn.textContent = "❔";
          btn.dataset.index = i;
          btn.onclick = () => {
            if (!CASINO.state.isPlaying) return;
            if (selected.has(i)) return;

            selected.add(i);

            if (mines.has(i)) {
              btn.textContent = "💣";
              btn.classList.add("revealed-bad");
              CASINO.finishRound({
                win: false,
                payout: 0,
                multiplier: 0
              });
              revealAll();
            } else {
              safeCount++;
              currentMultiplier = +(1 + safeCount * (mineCount * 0.35)).toFixed(2);
              btn.textContent = "💎";
              btn.classList.add("revealed-safe");
              $("#gameMultiplierDisplay", document).textContent = `${currentMultiplier.toFixed(2)}x`;
            }
          };
          boardEl.appendChild(btn);
        }
      };

      const revealAll = () => {
        [...boardEl.children].forEach((btn, i) => {
          if (mines.has(i)) {
            btn.textContent = "💣";
            btn.classList.add("revealed-bad");
          } else {
            btn.textContent = "💎";
            btn.classList.add("revealed-safe");
          }
        });
      };

      return {
        mount({ body, controls, multi }) {
          body.innerHTML = `
            <div class="engine">
              <div class="pick-grid" id="minesBoard"></div>
              <div class="coinflip-result">Pick safe gems and cash out before a mine.</div>
            </div>
          `;

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Mines Count</div>
              <input type="range" id="minesCountInput" min="1" max="5" value="3">
              <div class="inline-value-row">
                <span>Selected Mines</span>
                <strong id="minesCountText">3</strong>
              </div>
            </div>
          `;

          boardEl = $("#minesBoard", body);
          const minesInput = $("#minesCountInput", controls);
          const minesText = $("#minesCountText", controls);

          minesInput.oninput = () => {
            mineCount = Number(minesInput.value);
            minesText.textContent = mineCount;
          };

          multi.textContent = "1.00x";
          buildBoard();
        },

        play(amount) {
          selected = new Set();
          mines = new Set();
          safeCount = 0;
          currentMultiplier = 1;

          while (mines.size < mineCount) {
            mines.add(randInt(0, 8));
          }

          $("#gameMultiplierDisplay", document).textContent = "1.00x";
          buildBoard();
        },

        cashout() {
          if (!CASINO.state.isPlaying) return;
          const bet = Number(CASINO.state.betAmount || 0);
          const payout = bet * currentMultiplier;
          CASINO.finishRound({
            win: currentMultiplier > 1,
            payout,
            multiplier: currentMultiplier
          });
        },

        destroy() {}
      };
    },

    createPlinkoEngine() {
      let risk = "medium";

      return {
        mount({ body, controls, multi }) {
          body.innerHTML = `
            <div class="engine">
              <div class="plinko-board">
                ${Array.from({ length: 24 }).map(() => `<div class="plinko-peg"></div>`).join("")}
              </div>
              <div class="plinko-slot-result" id="plinkoResultText">Drop and pray 🙃</div>
            </div>
          `;

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Risk</div>
              <div class="segmented-row three">
                <button class="seg-btn" data-risk="low">Low</button>
                <button class="seg-btn active" data-risk="medium">Medium</button>
                <button class="seg-btn" data-risk="high">High</button>
              </div>
            </div>
          `;

          $$("[data-risk]", controls).forEach(btn => {
            btn.onclick = () => {
              $$("[data-risk]", controls).forEach(b => b.classList.remove("active"));
              btn.classList.add("active");
              risk = btn.dataset.risk;
            };
          });

          multi.textContent = "0.00x";
        },

        play(amount) {
          const pool = {
            low: [0.5, 0.8, 1.2, 1.5, 2],
            medium: [0.2, 0.7, 1.5, 2.5, 5],
            high: [0, 0.3, 1.8, 4, 9]
          }[risk];

          const multiplier = pool[randInt(0, pool.length - 1)];
          const payout = amount * multiplier;
          const win = payout > amount;

          setTimeout(() => {
            CASINO.finishRound({ win, payout, multiplier });
          }, 700);
        },

        destroy() {}
      };
    },

    createLimboEngine() {
      let target = 2.00;

      return {
        mount({ body, controls, multi }) {
          body.innerHTML = `
            <div class="engine">
              <div class="limbo-target-display" id="limboDisplay">${target.toFixed(2)}x</div>
              <div class="coinflip-result">Hit above target to win</div>
            </div>
          `;

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Target Multiplier</div>
              <input type="number" id="limboTargetInput" min="1.01" step="0.01" value="2.00">
            </div>
          `;

          const input = $("#limboTargetInput", controls);
          input.oninput = () => {
            target = Math.max(1.01, Number(input.value || 2));
            $("#limboDisplay", body).textContent = `${target.toFixed(2)}x`;
          };

          multi.textContent = "Target";
        },

        play(amount) {
          const roll = +(rand(1.00, 10.00).toFixed(2));
          $("#limboDisplay", document).textContent = `${roll.toFixed(2)}x`;

          const win = roll >= target;
          const multiplier = +(target * 0.99).toFixed(2);
          const payout = win ? amount * multiplier : 0;

          setTimeout(() => {
            CASINO.finishRound({ win, payout, multiplier });
          }, 650);
        },

        destroy() {}
      };
    },

    createBlackjackEngine() {
      const drawCard = () => randInt(1, 11);
      let player = [], dealer = [];

      const sum = (arr) => arr.reduce((a, b) => a + b, 0);

      return {
        mount({ body, controls, multi }) {
          body.innerHTML = `
            <div class="engine bj-row">
              <div class="bj-hand">
                <label>Dealer</label>
                <div class="bj-cards" id="bjDealerCards"></div>
                <div class="bj-score" id="bjDealerScore">0</div>
              </div>
              <div class="bj-hand">
                <label>Player</label>
                <div class="bj-cards" id="bjPlayerCards"></div>
                <div class="bj-score" id="bjPlayerScore">0</div>
              </div>
            </div>
          `;

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Blackjack</div>
              <div class="coinflip-result">Simplified instant blackjack round</div>
            </div>
          `;

          multi.textContent = "2.00x";
        },

        play(amount) {
          player = [drawCard(), drawCard()];
          dealer = [drawCard(), drawCard()];

          const render = () => {
            $("#bjPlayerCards", document).innerHTML = player.map(v => `<div class="bj-card">${v}</div>`).join("");
            $("#bjDealerCards", document).innerHTML = dealer.map(v => `<div class="bj-card">${v}</div>`).join("");
            $("#bjPlayerScore", document).textContent = sum(player);
            $("#bjDealerScore", document).textContent = sum(dealer);
          };

          render();

          let p = sum(player);
          let d = sum(dealer);

          const win =
            (p <= 21 && d > 21) ||
            (p <= 21 && p > d) ||
            (p === 21 && d !== 21);

          const draw = p === d && p <= 21 && d <= 21;

          let payout = 0;
          let multiplier = 0;

          if (draw) {
            payout = amount;
            multiplier = 1;
          } else if (win) {
            payout = amount * 2;
            multiplier = 2;
          }

          setTimeout(() => {
            CASINO.finishRound({ win: payout > amount, payout, multiplier });
          }, 900);
        },

        destroy() {}
      };
    },

    createHiLoEngine() {
      let current = randInt(2, 14);
      let guess = "higher";

      const cardLabel = (n) => {
        const map = { 11: "J", 12: "Q", 13: "K", 14: "A" };
        return map[n] || String(n);
      };

      return {
        mount({ body, controls, multi }) {
          body.innerHTML = `
            <div class="engine">
              <div class="hilo-card" id="hiloCurrentCard">${cardLabel(current)}</div>
              <div class="hilo-multi" id="hiloMultiText">1.70x</div>
            </div>
          `;

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Choose</div>
              <div class="segmented-row">
                <button class="seg-btn active" data-hilo="higher">Higher</button>
                <button class="seg-btn" data-hilo="lower">Lower</button>
              </div>
            </div>
          `;

          $$("[data-hilo]", controls).forEach(btn => {
            btn.onclick = () => {
              $$("[data-hilo]", controls).forEach(b => b.classList.remove("active"));
              btn.classList.add("active");
              guess = btn.dataset.hilo;
            };
          });

          multi.textContent = "1.70x";
        },

        play(amount) {
          const next = randInt(2, 14);
          const win = guess === "higher" ? next > current : next < current;
          current = next;

          $("#hiloCurrentCard", document).textContent = cardLabel(current);

          const multiplier = 1.7;
          const payout = win ? amount * multiplier : 0;

          setTimeout(() => {
            CASINO.finishRound({ win, payout, multiplier });
          }, 500);
        },

        cashout() {
          // Optional future chain cashout
        },

        destroy() {}
      };
    },

    createFallbackEngine() {
      return {
        mount({ body }) {
          body.innerHTML = `<div class="game-visual">Game engine not available yet.</div>`;
        },
        play(amount) {
          const win = chance(.5);
          const multiplier = win ? 2 : 0;
          const payout = win ? amount * multiplier : 0;
          CASINO.finishRound({ win, payout, multiplier });
        },
        destroy() {}
      };
    },

    /* =========================================================
       FEEDS
    ========================================================= */
    seedBigWins() {
      const sampleGames = ["Crash", "Dice", "Slots", "Mines", "Plinko"];
      for (let i = 0; i < 10; i++) {
        this.state.bigWins.push({
          user: this.fakeName(),
          game: sampleGames[randInt(0, sampleGames.length - 1)],
          amount: randInt(40, 1200),
          multi: +(rand(1.5, 8).toFixed(2))
        });
      }
    },

    pushRandomBigWin() {
      const sampleGames = this.games.map(g => g.name);
      this.state.bigWins.unshift({
        user: this.fakeName(),
        game: sampleGames[randInt(0, sampleGames.length - 1)],
        amount: randInt(30, 1800),
        multi: +(rand(1.2, 12).toFixed(2))
      });
      this.state.bigWins = this.state.bigWins.slice(0, 20);
      this.saveState();
    },

    renderBigWinRow(item) {
      return `
        <div class="big-win-row">
          <span class="user">${item.user}</span>
          <span class="game">${item.game}</span>
          <span class="amount">+${formatMoney(item.amount)} BX</span>
        </div>
      `;
    },

    renderTicker() {
      const track = $("#casinoTickerTrack", this.lobby);
      if (!track) return;

      const latest = this.state.bigWins.slice(0, 3).map(w => `
        <div class="ticker-pulse-item win">
          ${w.user} won ${formatMoney(w.amount)} BX on ${w.game}
        </div>
      `).join("");

      track.innerHTML = latest;
    },

    fakeName() {
      const names = [
        "AlphaWolf", "BloxKing", "HashAce", "MoonRider", "SatoshiX",
        "LuckyNode", "JetRush", "BitNova", "CrashFox", "DiceGhost",
        "ZeroMint", "PixelBet", "BXHunter", "NightSpin"
      ];
      return names[randInt(0, names.length - 1)];
    },

    renderPlayers() {
      const body = $("#playersTableBody", this.gameView);
      if (!body) return;

      const players = Array.from({ length: 10 }).map(() => ({
        name: this.fakeName(),
        cashout: `${rand(1.1, 5.8).toFixed(2)}x`,
        amount: `${formatMoney(randInt(5, 550))} BX`
      }));

      this.state.players = players;

      body.innerHTML = players.map(p => `
        <div class="player-row">
          <div class="name">${p.name}</div>
          <div class="cashout">${p.cashout}</div>
          <div class="amount">${p.amount}</div>
        </div>
      `).join("");

      const countText = $("#playersCountText", this.gameView);
      const volumeText = $("#playersVolumeText", this.gameView);

      if (countText) countText.textContent = `${players.length} players`;
      if (volumeText) volumeText.textContent = `${formatMoney(randInt(500, 9000))} BX`;
    },

    startAmbientFeeds() {
      setInterval(() => {
        this.state.stats.online = Math.max(300, this.state.stats.online + randInt(-9, 16));
        this.state.stats.volume += randInt(500, 7000);

        if (chance(.65)) this.pushRandomBigWin();

        if (!this.lobby.classList.contains("hidden")) {
          this.renderLobby();
        } else {
          this.renderPlayers();
          this.syncWalletUI();
        }
      }, 12000);
    },

    bindGlobal() {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          // optional pause hooks later
        }
      });
    }
  };

  /* =========================================================
     BOOT
  ========================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    CASINO.init();
    window.CASINO = CASINO;
  });
})();
