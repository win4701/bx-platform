/* =========================================================
   BLOXIO CASINO — ROUTER SAFE PATCH FINAL
   Compatible with:
   - index.html surgical patch
   - main.js surgical patch
   - styles.css / casino css master
========================================================= */

(() => {
  "use strict";

  if (window.BX_CASINO_BOOTED) {
    console.warn("[Casino] Already booted — skipping duplicate init");
    return;
  }
  window.BX_CASINO_BOOTED = true;

  /* =========================================================
     HELPERS
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

  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const animateNumber = ({
    from = 0,
    to = 1,
    duration = 800,
    onUpdate = () => {},
    onDone = () => {}
  }) => {
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(p);
      const value = lerp(from, to, eased);
      onUpdate(value);
      if (p < 1) requestAnimationFrame(frame);
      else onDone();
    };
    requestAnimationFrame(frame);
  };

  const pulseEl = (el, cls = "is-active", ms = 280) => {
    if (!el) return;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), ms);
  };

  const shakeEl = (el) => {
    if (!el || !el.animate) return;
    el.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(-4px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(-3px)" },
        { transform: "translateX(3px)" },
        { transform: "translateX(0)" }
      ],
      { duration: 340, easing: "ease-out" }
    );
  };

  const flashStage = (stage, type = "win") => {
    if (!stage || !stage.animate) return;
    const color = type === "win"
      ? "rgba(34,197,94,.20)"
      : "rgba(239,68,68,.20)";

    stage.animate(
      [
        { boxShadow: "0 0 0 rgba(0,0,0,0)" },
        { boxShadow: `0 0 0 999px ${color} inset` },
        { boxShadow: "0 0 0 rgba(0,0,0,0)" }
      ],
      { duration: 520, easing: "ease-out" }
    );
  };

  const createFloatingText = (container, text, type = "win") => {
    if (!container) return;
    const div = document.createElement("div");
    div.textContent = text;
    Object.assign(div.style, {
      position: "absolute",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      fontSize: "22px",
      fontWeight: "1000",
      pointerEvents: "none",
      zIndex: "30",
      color: type === "win" ? "#86efac" : "#fca5a5",
      textShadow: "0 10px 24px rgba(0,0,0,.35)"
    });
    container.appendChild(div);

    if (div.animate) {
      div.animate(
        [
          { opacity: 0, transform: "translate(-50%, -42%) scale(.92)" },
          { opacity: 1, transform: "translate(-50%, -50%) scale(1)" },
          { opacity: 0, transform: "translate(-50%, -68%) scale(1.06)" }
        ],
        { duration: 950, easing: "ease-out" }
      );
    }

    setTimeout(() => div.remove(), 1000);
  };

  const toast = (msg) => {
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
     STORAGE
  ========================================================= */
  const STORAGE_KEYS = {
    WALLET: "casino_wallet_balance",
    HISTORY: "casino_bet_history",
    FAIRNESS: "casino_fairness_state",
    LAST_GAME: "casino_last_game",
    BIGWINS: "casino_bigwins_feed"
  };

  /* =========================================================
     APP
  ========================================================= */
  const CASINO = {
    booted: false,
    root: null,
    lobby: null,
    gameView: null,
    ambientTimer: null,
    boundGlobal: false,
    boundLobbyOnce: false,

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
      { id: "coinflip",  name: "Coinflip",   type: "Classic",  icon: "🪙", image: "assets/casino/coinflip.png" },
      { id: "limbo",     name: "Limbo",      type: "Instant",  icon: "🎯", image: "assets/casino/limbo.png" },
      { id: "dice",      name: "Dice",       type: "Classic",  icon: "🎲", image: "assets/casino/dice.png" },
      { id: "crash",     name: "Crash",      type: "Popular",  icon: "📈", image: "assets/casino/crash.png" },
      { id: "plinko",    name: "Plinko",     type: "Popular",  icon: "🔻", image: "assets/casino/plinko.png" },
      { id: "blackjack", name: "Blackjack",  type: "Cards",    icon: "🃏", image: "assets/casino/blackjack.png" },
      { id: "hilo",      name: "Hi-Lo",      type: "Cards",    icon: "⬆️", image: "assets/casino/hilo.png" },
      { id: "slots",     name: "Slots",      type: "Slots",    icon: "🎰", image: "assets/casino/slot.png" },
      { id: "mines",     name: "Mines",      type: "Strategy", icon: "💣", image: "assets/casino/mines.png" },
      { id: "fruitparty",name: "FruitParty", type: "Slots",    icon: "🍉", image: "assets/casino/fruitparty.png" },
      { id: "bananafarm",name: "BananaFarm", type: "Slots",    icon: "🍌", image: "assets/casino/bananafarm.png" },
      { id: "airboss",   name: "AirBoss",    type: "Popular",  icon: "✈️", image: "assets/casino/airboss.png" }
    ],

    /* =========================================================
       BOOT / MOUNT
    ========================================================= */
    init() {
      this.root = document.getElementById("casino");
      if (!this.root) return;

      this.ensureShell();
      this.loadState();

      if (!this.booted) {
        this.renderLobby();
        this.startAmbientFeeds();
        this.bindRouterHooks();
        this.bindGlobal();
        this.booted = true;
      } else {
        this.syncWalletUI();
      }

      window.CASINO = this;
      window.renderCasinoLobby = () => this.onEnterView();
      window.updateCasinoUI = () => this.syncWalletUI();
      window.syncCasinoLayout = () => this.syncLayout();
    },

    ensureShell() {
      this.lobby = document.getElementById("casinoLobby");
      this.gameView = document.getElementById("casinoGameView");

      if (!this.lobby) {
        this.lobby = document.createElement("div");
        this.lobby.id = "casinoLobby";
        this.root.appendChild(this.lobby);
      }

      if (!this.gameView) {
        this.gameView = document.createElement("div");
        this.gameView.id = "casinoGameView";
        this.gameView.className = "hidden";
        this.root.appendChild(this.gameView);
      }
    },

    onEnterView() {
      if (!this.root) return;
      this.ensureShell();
      this.syncWalletUI();

      if (!this.state.currentGame) {
        this.renderLobby();
      } else {
        // لو كان داخل لعبة و رجع للقسم casino، لا نعيد تدمير الجيم
        this.lobby.classList.add("hidden");
        this.gameView.classList.remove("hidden");
      }
    },

    syncLayout() {
      const currentGame = this.state.currentGame?.id || null;
      if (!currentGame) return;

      const stage = $("#casinoGameStage", this.gameView);
      if (!stage) return;

      // إعادة trigger بسيطة للرسم أو resize إذا احتجت لاحقًا
      stage.style.willChange = "transform";
      requestAnimationFrame(() => {
        stage.style.willChange = "auto";
      });
    },

    bindRouterHooks() {
      document.addEventListener("bloxio:viewchange", (e) => {
        const next = e.detail?.view;
        if (next === "casino") {
          this.onEnterView();
        } else {
          // عند مغادرة casino لا نكسر الحالة، فقط نوقف loops الحساسة
          if (this.state.currentGame?.id === "crash" || this.state.currentGame?.id === "airboss") {
            // ما نغلقش اللعبة، فقط نوقف التحديثات الحية إذا لزم
          }
        }
      });
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
        try { this.state.fairness = { ...this.state.fairness, ...JSON.parse(fairness) }; } catch {}
      }

      const bigWins = localStorage.getItem(STORAGE_KEYS.BIGWINS);
      if (bigWins) {
        try { this.state.bigWins = JSON.parse(bigWins) || []; } catch {}
      }

      if (!this.state.bigWins.length) this.seedBigWins();
    },

    saveState() {
      localStorage.setItem(STORAGE_KEYS.WALLET, String(this.state.wallet));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(this.state.history.slice(0, 80)));
      localStorage.setItem(STORAGE_KEYS.FAIRNESS, JSON.stringify(this.state.fairness));
      localStorage.setItem(STORAGE_KEYS.BIGWINS, JSON.stringify(this.state.bigWins.slice(0, 40)));
    },

    /* =========================================================
       LOBBY
    ========================================================= */
    renderLobby() {
      if (!this.lobby) return;

      const tabs = ["all", "popular", "classic", "slots", "strategy", "cards", "instant"];
      const filtered = this.getFilteredGames();

      this.lobby.innerHTML = `
        <div class="casino-topbar">
          <div class="casino-brand-wrap">
            <div class="casino-brand-badge">🎰</div>
            <div>
              <h2 class="casino-title">Bloxio Casino</h2>
              <p class="casino-subtitle">Provably fair • Live gameplay</p>
            </div>
          </div>
          <button class="casino-icon-btn" id="casinoRefreshBtn" type="button">⟳</button>
        </div>

        <div class="casino-stats-strip">
          <div class="casino-stat-card">
            <span class="casino-stat-label">Wallet</span>
            <strong id="casinoWalletText">${formatMoney(this.state.wallet)} BX</strong>
          </div>
          <div class="casino-stat-card">
            <span class="casino-stat-label">Players</span>
            <strong id="casinoOnlineText">${this.state.stats.online.toLocaleString()}</strong>
          </div>
          <div class="casino-stat-card">
            <span class="casino-stat-label">Volume</span>
            <strong id="casinoVolumeText">${formatMoney(this.state.stats.volume)} BX</strong>
          </div>
        </div>

        <div class="ticker-pulse-wrap">
          <div class="ticker-pulse-label">LIVE FEED</div>
          <div class="ticker-pulse-track" id="casinoTickerTrack"></div>
        </div>

        <div class="casino-filter-tabs" id="casinoFilterTabs">
          ${tabs.map(tab => `
            <button class="casino-filter-tab ${this.state.currentTab === tab ? "active" : ""}" data-tab="${tab}" type="button">
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
      this.syncWalletUI();
    },

    renderGameCard(game) {
      return `
        <button type="button" class="casino-game-card" data-game="${game.id}" data-image="${game.image}">
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
        card.onclick = () => this.openGame(card.dataset.game);
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
       ROUTER / GAME VIEW
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
            <button class="game-back-btn" id="casinoBackBtn" type="button">←</button>
            <div>
              <h2 class="game-shell-title">${game.icon} ${game.name}</h2>
              <p class="game-shell-subtitle">Provably fair • ${game.type} • Instant settle</p>
            </div>
          </div>
          <button class="casino-icon-btn" id="casinoSeedRefreshBtn" type="button">⚙</button>
        </div>

        <div class="game-header-tabs">
          <button class="game-header-tab active" data-headtab="game" type="button">Game</button>
          <button class="game-header-tab" data-headtab="fairness" type="button">Fair</button>
          <button class="game-header-tab" data-headtab="players" type="button">Players</button>
        </div>

        <div class="game-pulse-strip" id="gamePulseStrip">
          <div class="pulse-pill green">Wallet: ${formatMoney(this.state.wallet)} BX</div>
          <div class="pulse-pill">Bet: <span id="liveBetText">${formatMoney(this.state.betAmount)}</span></div>
          <div class="pulse-pill orange" id="liveStateText">Ready</div>
        </div>

        <div id="casinoHeadPanels">
          <div class="game-shell-card" data-panel="game">
            <div id="casinoGameStage" class="game-engine-stage" style="position:relative;">
              <div id="gameMultiplierDisplay">1.00x</div>
              <div id="gameEngineBody">Loading ${game.name}...</div>
            </div>
          </div>

          <div class="bet-panel" data-panel="game">
            <div class="settings-tabs">
              <button class="settings-tab active" data-mode="manual" type="button">Manual</button>
              <button class="settings-tab" data-mode="auto" type="button">Auto</button>
            </div>

            <div class="bet-input-group">
              <div class="bet-amount-box">
                <span>Bet</span>
                <input type="number" id="betAmountInput" min="1" step="0.01" value="${this.state.betAmount}">
              </div>

              <div class="bet-quick-row">
                <button data-betquick="1" type="button">1</button>
                <button data-betquick="5" type="button">5</button>
                <button data-betquick="25" type="button">25</button>
                <button data-betquick="100" type="button">100</button>
              </div>
            </div>

            <div id="dynamicBetControls"></div>

            <button id="casinoPlayBtn" type="button">Play</button>
            <button id="casinoStopBtn" class="hidden" type="button">Stop</button>
            <button id="casinoCashoutBtn" class="hidden" type="button">Cashout</button>
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
            <button id="newSeedBtn" type="button">Generate New Seeds</button>
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
      this.syncFairnessUI();
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
      const walletText = $("#casinoWalletText", this.root);
      if (walletText) walletText.textContent = `${formatMoney(this.state.wallet)} BX`;

      const pulse = $("#gamePulseStrip .pulse-pill.green", this.gameView);
      if (pulse) pulse.textContent = `Wallet: ${formatMoney(this.state.wallet)} BX`;
    },

    playCurrentGame() {
      if (!this.state.currentGame || this.state.isPlaying) return;

      const amount = clamp(Number(this.state.betAmount || 0), 0, 1e9);
      const MIN_BET = 0.1;

      if (!amount || amount < MIN_BET) {
      return toast(`Minimum bet is ${MIN_BET} BX`);}
      if (!this.canAfford(amount)) return toast("Insufficient balance");

      this.debit(amount);
      this.state.isPlaying = true;
      this.state.isCashedOut = false;
      this.updateLiveState("Running");

      const cashoutGames = ["crash", "mines", "airboss"];
      this.toggleActionButtons({
        play: false,
        stop: true,
        cashout: cashoutGames.includes(this.state.currentGame.id)
      });

      this.useNonce();
      if (this.state.activeEngine?.play) {
        this.state.activeEngine.play(amount);
      }
    },

    stopCurrentGame() {
      if (!this.state.isPlaying) return;
      if (this.state.activeEngine?.stop) this.state.activeEngine.stop();

      this.finishRound({
        win: false,
        payout: 0,
        multiplier: 0
      });
    },

    cashoutCurrentGame() {
      if (!this.state.isPlaying || this.state.isCashedOut) return;
      if (this.state.activeEngine?.cashout) this.state.activeEngine.cashout();
    },

    finishRound({ win, payout = 0, multiplier = 1, meta = {} }) {
      const game = this.state.currentGame;
      const bet = Number(this.state.betAmount || 0);
      const stage = $("#casinoGameStage", this.gameView);
      const multiEl = $("#gameMultiplierDisplay", this.gameView);

      this.state.isPlaying = false;
      this.state.isCashedOut = true;

      this.toggleActionButtons({
        play: true,
        stop: false,
        cashout: false
      });

      if (payout > 0) this.credit(payout);
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

      if (multiEl && multiplier && multiplier > 0) {
        animateNumber({
          from: 1,
          to: multiplier,
          duration: 480,
          onUpdate: (v) => {
            multiEl.textContent = `${v.toFixed(2)}x`;
          }
        });
      }

      if (win) {
        flashStage(stage, "win");
        createFloatingText(stage, `+${formatMoney(entry.profit)} BX`, "win");
        toast(`Won ${formatMoney(entry.profit)} BX`);
      } else {
        flashStage(stage, "loss");
        createFloatingText(stage, `-${formatMoney(bet)} BX`, "loss");
        shakeEl(stage);
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
        hilo: this.createHiLoEngine(),
        airboss: this.createAirBossEngine(),
        fruitparty: this.createFruitPartyEngine(),
        bananafarm: this.createBananaFarmEngine()
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
       ENGINES (مختصرة لكن كاملة)
    ========================================================= */

    createCrashEngine() {
      let interval = null;
      let multiplier = 1;
      let crashedAt = 0;
      let cashed = false;
      let multiEl = null;
      let lineEl = null;
      let hintEl = null;

      return {
        mount({ body, controls, multi }) {
          multiEl = multi;

          body.innerHTML = `
            <div class="engine">
              <div class="crash-graph" style="position:relative;height:120px;display:flex;align-items:end;">
                <div style="position:absolute;inset:0;border-radius:14px;background:linear-gradient(180deg,rgba(34,197,94,.04),transparent);"></div>
                <div class="crash-line" id="crashLine"></div>
              </div>
              <div class="coinflip-result" id="crashHintText">Wait for the multiplier... then cash out.</div>
            </div>
          `;

          lineEl = $("#crashLine", body);
          hintEl = $("#crashHintText", body);

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
          if (hintEl) hintEl.textContent = "Flying... cash out before crash";

          clearInterval(interval);
          interval = setInterval(() => {
            multiplier = +(multiplier + rand(0.03, 0.12)).toFixed(2);
            multiEl.textContent = `${multiplier.toFixed(2)}x`;

            if (lineEl) {
              lineEl.style.width = `${clamp(multiplier * 11, 10, 100)}%`;
              lineEl.style.height = `${clamp(multiplier * 3.8, 4, 100)}px`;
            }

            const auto = Number($("#crashAutoCashout", document)?.value || 0);
            if (!cashed && auto > 1 && multiplier >= auto) this.cashout();

            if (multiplier >= crashedAt) {
              clearInterval(interval);
              if (hintEl) hintEl.textContent = `Crashed at ${crashedAt.toFixed(2)}x`;

              if (!cashed) {
                CASINO.finishRound({ win: false, payout: 0, multiplier: crashedAt });
              }
            }
          }, 120);
        },

        cashout() {
          if (cashed) return;
          cashed = true;
          clearInterval(interval);
          const bet = Number(CASINO.state.betAmount || 0);
          const payout = bet * multiplier;
          if (hintEl) hintEl.textContent = `Cashed out at ${multiplier.toFixed(2)}x`;
          CASINO.finishRound({ win: true, payout, multiplier });
        },

        stop() { clearInterval(interval); },
        destroy() { clearInterval(interval); }
      };
    },

    createDiceEngine() {
      let rollDisplay, targetInput, overUnderSelect, hitZone, hintEl, multiEl;

      return {
        mount({ body, controls, multi }) {
          multiEl = multi;
          body.innerHTML = `
            <div class="engine">
              <div class="dice-roll-display" id="diceRollDisplay">--</div>
              <div class="dice-bar">
                <div class="dice-hit-zone" id="diceHitZone" style="width:50%"></div>
              </div>
              <div class="coinflip-result" id="diceHintText">Roll against target</div>
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
                <button class="seg-btn active" data-dice-side="under" type="button">Roll Under</button>
                <button class="seg-btn" data-dice-side="over" type="button">Roll Over</button>
              </div>
            </div>
          `;

          rollDisplay = $("#diceRollDisplay", body);
          targetInput = $("#diceTargetInput", controls);
          hitZone = $("#diceHitZone", body);
          hintEl = $("#diceHintText", body);
          overUnderSelect = "under";

          const targetText = $("#diceTargetText", controls);

          const sync = () => {
            targetText.textContent = targetInput.value;
            hitZone.style.width = `${targetInput.value}%`;

            const target = Number(targetInput.value);
            const chancePct = overUnderSelect === "under" ? target : (100 - target);
            const multiplier = +(100 / chancePct * 0.99).toFixed(2);
            multiEl.textContent = `${multiplier.toFixed(2)}x`;
          };
          sync();

          targetInput.oninput = sync;

          $$("[data-dice-side]", controls).forEach(btn => {
            btn.onclick = () => {
              $$("[data-dice-side]", controls).forEach(b => b.classList.remove("active"));
              btn.classList.add("active");
              overUnderSelect = btn.dataset.diceSide;
              sync();
            };
          });
        },

        play(amount) {
          const target = Number(targetInput.value);
          const finalRoll = +(Math.random() * 100).toFixed(2);

          animateNumber({
            from: 0,
            to: finalRoll,
            duration: 900,
            onUpdate: (v) => {
              rollDisplay.textContent = v.toFixed(2);
            },
            onDone: () => {
              const win = overUnderSelect === "under" ? finalRoll < target : finalRoll > target;
              const edge = 0.99;
              const chancePct = overUnderSelect === "under" ? target : (100 - target);
              const multiplier = +(100 / chancePct * edge).toFixed(2);
              const payout = win ? amount * multiplier : 0;

              if (hintEl) {
                hintEl.textContent = win
                  ? `Hit! ${finalRoll.toFixed(2)}`
                  : `Missed at ${finalRoll.toFixed(2)}`;
              }

              CASINO.finishRound({ win, payout, multiplier });
            }
          });
        },

        destroy() {}
      };
    },

    createCoinflipEngine() {
      let result = "heads";
      let pick = "heads";
      let coinEl, resultText;

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
                <button class="seg-btn active" data-coin="heads" type="button">Heads</button>
                <button class="seg-btn" data-coin="tails" type="button">Tails</button>
              </div>
            </div>
          `;

          coinEl = $("#coinflipCoin", body);
          resultText = $("#coinflipResultText", body);
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
          resultText.textContent = "Flipping...";

          setTimeout(() => {
            coinEl.classList.remove("spinning");
            coinEl.textContent = result === "heads" ? "🙂" : "🦅";

            const win = result === pick;
            const multiplier = 1.96;
            const payout = win ? amount * multiplier : 0;

            resultText.textContent = win ? `You hit ${result}` : `Landed on ${result}`;
            CASINO.finishRound({ win, payout, multiplier });
          }, 1000);
        },

        destroy() {}
      };
    },

    createSlotsEngine() {
      const symbols = ["🍒", "🍋", "🍇", "⭐", "7️⃣", "💎"];
      let cells = [];
      let statusEl;

      const randomSymbol = () => symbols[randInt(0, symbols.length - 1)];

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
                <button class="seg-btn active" type="button">Classic</button>
                <button class="seg-btn" type="button">Turbo</button>
                <button class="seg-btn" type="button">Max</button>
              </div>
            </div>
          `;

          cells = $$(".slot-cell", body);
          statusEl = $("#slotStatusText", body);
          multi.textContent = "0.00x";
        },

        play(amount) {
          let ticks = 0;
          statusEl.textContent = "Spinning...";

          const spinFx = setInterval(() => {
            cells.forEach(c => {
              c.textContent = randomSymbol();
              pulseEl(c);
            });

            ticks++;
            if (ticks >= 12) {
              clearInterval(spinFx);

              const result = [randomSymbol(), randomSymbol(), randomSymbol()];
              cells.forEach((c, i) => c.textContent = result[i]);

              let multiplier = 0;
              if (result[0] === result[1] && result[1] === result[2]) {
                multiplier = result[0] === "💎" ? 8 : 5;
              } else if (new Set(result).size === 2) {
                multiplier = 1.8;
              }

              const payout = amount * multiplier;
              const win = multiplier > 0;

              statusEl.textContent = win ? `Combo hit • ${multiplier.toFixed(2)}x` : "No combo";
              CASINO.finishRound({ win, payout, multiplier });
            }
          }, 95);
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
      let statusEl;
      let multiEl;

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

      const buildBoard = () => {
        boardEl.innerHTML = "";
        for (let i = 0; i < 9; i++) {
          const btn = document.createElement("button");
          btn.className = "pick-card";
          btn.textContent = "❔";
          btn.dataset.index = i;
          btn.type = "button";
          btn.onclick = () => {
            if (!CASINO.state.isPlaying || selected.has(i)) return;

            selected.add(i);

            if (mines.has(i)) {
              btn.textContent = "💣";
              btn.classList.add("revealed-bad");
              if (statusEl) statusEl.textContent = "Mine exploded";
              revealAll();

        finishRound({ win, payout = 0, multiplier = 1, meta = {} }) {
  const game = this.state.currentGame;
  const bet = Number(this.state.betAmount || 0);
  const stage = $("#casinoGameStage", this.gameView);
  const multiEl = $("#gameMultiplierDisplay", this.gameView);

  const HOUSE_EDGE = 0.03;
  const MIN_BET = 0.1;
  const MAX_MULTIPLIER = 50;

  // ================= SAFETY =================
  this.state.isPlaying = false;
  this.state.isCashedOut = true;

  this.toggleActionButtons({
    play: true,
    stop: false,
    cashout: false
  });

  // ================= VALIDATION =================
  if (!bet || bet < MIN_BET) {
    this.updateLiveState("Invalid Bet");
    return toast(`Minimum bet is ${MIN_BET} BX`);
  }

  // ================= ECONOMY =================

  // cap multiplier (anti exploit)
  if (multiplier > MAX_MULTIPLIER) {
    multiplier = MAX_MULTIPLIER;
  }

  // normalize payout
  if (win && payout <= 0) {
    payout = bet * multiplier;
  }

  // apply house edge
  if (payout > 0) {
    payout = payout * (1 - HOUSE_EDGE);
    this.credit(payout);
  }

  // ================= STATE =================
  this.updateLiveState(win ? "Win" : "Loss");

  const profit = payout - bet;

  const entry = {
    id: uid(),
    game: game?.name || "Unknown",
    gameId: game?.id || "unknown",
    bet,
    payout,
    profit,
    multiplier,
    ts: Date.now(),
    ...meta
  };

  this.state.history.unshift(entry);

  // big wins
  if (profit >= bet * 1.5) {
    this.state.bigWins.unshift({
      user: this.fakeName(),
      game: game?.name || "Game",
      amount: profit,
      multi: multiplier
    });
  }

  this.state.bigWins = this.state.bigWins.slice(0, 30);

  this.saveState();
  this.syncWalletUI();

  // ================= UI =================
  if (multiEl && multiplier > 0) {
    animateNumber({
      from: 1,
      to: multiplier,
      duration: 400,
      onUpdate: (v) => {
        multiEl.textContent = `${v.toFixed(2)}x`;
      }
    });
  }

  if (win) {
    flashStage(stage, "win");
    createFloatingText(stage, `+${formatMoney(profit)} BX`, "win");
    toast(`Won ${formatMoney(profit)} BX`);
  } else {
    flashStage(stage, "loss");
    createFloatingText(stage, `-${formatMoney(bet)} BX`, "loss");
    shakeEl(stage);
    toast(`Lost ${formatMoney(bet)} BX`);
  }

  this.renderPlayers();
}      
    
      return {
        mount({ body, controls, multi }) {
          multiEl = multi;

          body.innerHTML = `
            <div class="engine">
              <div class="pick-grid" id="minesBoard"></div>
              <div class="coinflip-result" id="minesStatusText">Pick safe gems and cash out before a mine.</div>
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
          statusEl = $("#minesStatusText", body);
          const minesInput = $("#minesCountInput", controls);
          const minesText = $("#minesCountText", controls);

          minesInput.oninput = () => {
            mineCount = Number(minesInput.value);
            minesText.textContent = mineCount;
          };

          multi.textContent = "1.00x";
          buildBoard();
        },

        play() {
          selected = new Set();
          mines = new Set();
          safeCount = 0;
          currentMultiplier = 1;

          while (mines.size < mineCount) mines.add(randInt(0, 8));
          if (multiEl) multiEl.textContent = "1.00x";
          if (statusEl) statusEl.textContent = "Board armed";
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
      let resultText;

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
                <button class="seg-btn" data-risk="low" type="button">Low</button>
                <button class="seg-btn active" data-risk="medium" type="button">Medium</button>
                <button class="seg-btn" data-risk="high" type="button">High</button>
              </div>
            </div>
          `;

          resultText = $("#plinkoResultText", body);

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
          resultText.textContent = "Ball dropping...";

          const pool = {
            low: [0.5, 0.8, 1.2, 1.5, 2],
            medium: [0.2, 0.7, 1.5, 2.5, 5],
            high: [0, 0.3, 1.8, 4, 9]
          }[risk];

          setTimeout(() => {
            const multiplier = pool[randInt(0, pool.length - 1)];
            const payout = amount * multiplier;
            const win = payout > amount;

            resultText.textContent = `Landed at ${multiplier.toFixed(2)}x`;
            CASINO.finishRound({ win, payout, multiplier });
          }, 900);
        },

        destroy() {}
      };
    },

    createLimboEngine() {
      let target = 2.00;
      let displayEl, hintEl;

      return {
        mount({ body, controls, multi }) {
          body.innerHTML = `
            <div class="engine">
              <div class="limbo-target-display" id="limboDisplay">${target.toFixed(2)}x</div>
              <div class="coinflip-result" id="limboHintText">Hit above target to win</div>
            </div>
          `;

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Target Multiplier</div>
              <input type="number" id="limboTargetInput" min="1.01" step="0.01" value="2.00">
            </div>
          `;

          displayEl = $("#limboDisplay", body);
          hintEl = $("#limboHintText", body);

          const input = $("#limboTargetInput", controls);
          input.oninput = () => {
            target = Math.max(1.01, Number(input.value || 2));
            displayEl.textContent = `${target.toFixed(2)}x`;
            multi.textContent = `${(target * 0.99).toFixed(2)}x`;
          };

          multi.textContent = `${(target * 0.99).toFixed(2)}x`;
        },

        play(amount) {
          const finalRoll = +(rand(1.00, 10.00).toFixed(2));
          hintEl.textContent = "Rolling...";

          animateNumber({
            from: 1,
            to: finalRoll,
            duration: 820,
            onUpdate: (v) => {
              displayEl.textContent = `${v.toFixed(2)}x`;
            },
            onDone: () => {
              const win = finalRoll >= target;
              const multiplier = +(target * 0.99).toFixed(2);
              const payout = win ? amount * multiplier : 0;

              hintEl.textContent = win
                ? `Hit ${finalRoll.toFixed(2)}x`
                : `Missed at ${finalRoll.toFixed(2)}x`;

              CASINO.finishRound({ win, payout, multiplier });
            }
          });
        },

        destroy() {}
      };
    },

    createBlackjackEngine() {
      const drawCard = () => randInt(1, 11);
      let player = [], dealer = [];
      let bodyRef;

      const sum = (arr) => arr.reduce((a, b) => a + b, 0);

      return {
        mount({ body, controls, multi }) {
          bodyRef = body;

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
              <div class="coinflip-result">Instant blackjack simulation</div>
            </div>
          `;

          multi.textContent = "2.00x";
        },

        play(amount) {
          player = [drawCard(), drawCard()];
          dealer = [drawCard(), drawCard()];

          const render = () => {
            $("#bjPlayerCards", bodyRef).innerHTML = player.map(v => `<div class="bj-card">${v}</div>`).join("");
            $("#bjDealerCards", bodyRef).innerHTML = dealer.map(v => `<div class="bj-card">${v}</div>`).join("");
            $("#bjPlayerScore", bodyRef).textContent = sum(player);
            $("#bjDealerScore", bodyRef).textContent = sum(dealer);
          };

          render();

          const p = sum(player);
          const d = sum(dealer);

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
          }, 950);
        },

        destroy() {}
      };
    },

    createHiLoEngine() {
      let current = randInt(2, 14);
      let guess = "higher";
      let cardEl, multiHint;

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
                <button class="seg-btn active" data-hilo="higher" type="button">Higher</button>
                <button class="seg-btn" data-hilo="lower" type="button">Lower</button>
              </div>
            </div>
          `;

          cardEl = $("#hiloCurrentCard", body);
          multiHint = $("#hiloMultiText", body);
          multi.textContent = "1.70x";

          $$("[data-hilo]", controls).forEach(btn => {
            btn.onclick = () => {
              $$("[data-hilo]", controls).forEach(b => b.classList.remove("active"));
              btn.classList.add("active");
              guess = btn.dataset.hilo;
            };
          });
        },

        play(amount) {
          const next = randInt(2, 14);

          setTimeout(() => {
            const win = guess === "higher" ? next > current : next < current;
            current = next;
            cardEl.textContent = cardLabel(current);

            const multiplier = 1.7;
            const payout = win ? amount * multiplier : 0;
            multiHint.textContent = win ? "Correct pick" : "Wrong pick";

            CASINO.finishRound({ win, payout, multiplier });
          }, 520);
        },

        destroy() {}
      };
    },

    createAirBossEngine() {
      let altitude = 1.00;
      let crashAt = 0;
      let interval = null;
      let cashed = false;

      let altitudeEl, planeEl, statusEl, trailEl;

      return {
        mount({ body, controls, multi }) {
          body.innerHTML = `
            <div class="engine">
              <div class="airboss-altitude" id="airbossAltitude">1.00x</div>

              <div class="game-visual" style="position:relative;overflow:hidden;min-height:180px;">
                <div style="position:absolute;inset:0;background:
                  radial-gradient(circle at 20% 20%, rgba(59,130,246,.12), transparent 30%),
                  linear-gradient(180deg, rgba(14,165,233,.08), rgba(2,6,23,.02));">
                </div>

                <div id="airbossTrail"
                  style="position:absolute;left:16%;bottom:42px;width:18%;height:3px;
                  border-radius:999px;background:linear-gradient(90deg,#22c55e,transparent);
                  opacity:.75;">
                </div>

                <div id="airbossPlane"
                  style="position:absolute;left:20%;bottom:38px;font-size:34px;
                  filter:drop-shadow(0 8px 18px rgba(0,0,0,.25));transition:transform .12s linear;">
                  ✈️
                </div>
              </div>

              <div class="coinflip-result" id="airbossStatusText">
                Take off... then cash out before engine failure.
              </div>
            </div>
          `;

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Auto Eject</div>
              <input type="number" id="airbossAutoCashout" value="2.20" min="1.01" step="0.01">
            </div>
          `;

          altitudeEl = $("#airbossAltitude", body);
          planeEl = $("#airbossPlane", body);
          statusEl = $("#airbossStatusText", body);
          trailEl = $("#airbossTrail", body);

          multi.textContent = "1.00x";
        },

        play() {
          clearInterval(interval);

          altitude = 1.00;
          cashed = false;
          crashAt = +(rand(1.15, 9.2).toFixed(2));

          altitudeEl.textContent = "1.00x";
          if (statusEl) statusEl.textContent = "Aircraft climbing...";
          if (planeEl) planeEl.style.transform = "translate(0px,0px) rotate(-6deg)";
          if (trailEl) trailEl.style.width = "18%";

          interval = setInterval(() => {
            altitude = +(altitude + rand(0.03, 0.11)).toFixed(2);
            altitudeEl.textContent = `${altitude.toFixed(2)}x`;

            if (planeEl) {
              const x = clamp((altitude - 1) * 18, 0, 140);
              const y = clamp((altitude - 1) * 10, 0, 90);
              planeEl.style.transform = `translate(${x}px, -${y}px) rotate(-12deg)`;
            }

            if (trailEl) {
              trailEl.style.width = `${clamp(18 + (altitude - 1) * 9, 18, 85)}%`;
            }

            const auto = Number($("#airbossAutoCashout", document)?.value || 0);
            if (!cashed && auto > 1 && altitude >= auto) this.cashout();

            if (altitude >= crashAt) {
              clearInterval(interval);

              if (statusEl) statusEl.textContent = `Engine failure at ${crashAt.toFixed(2)}x`;

              if (!cashed) {
                CASINO.finishRound({ win: false, payout: 0, multiplier: crashAt });
              }
            }
          }, 120);
        },

        cashout() {
          if (cashed) return;
          cashed = true;
          clearInterval(interval);

          const bet = Number(CASINO.state.betAmount || 0);
          const payout = bet * altitude;

          if (statusEl) statusEl.textContent = `Pilot ejected at ${altitude.toFixed(2)}x`;

          CASINO.finishRound({
            win: true,
            payout,
            multiplier: altitude
          });
        },

        stop() { clearInterval(interval); },
        destroy() { clearInterval(interval); }
      };
    },

    createFruitPartyEngine() {
      const fruits = ["🍉", "🍇", "🍓", "🍍", "🍒", "🥝"];
      let cells = [];
      let resultText;

      const randomFruit = () => fruits[randInt(0, fruits.length - 1)];

      return {
        mount({ body, controls, multi }) {
          body.innerHTML = `
            <div class="engine">
              <div class="fruit-grid" id="fruitPartyGrid">
                ${Array.from({ length: 9 }).map(() => `<div class="fruit-cell">❔</div>`).join("")}
              </div>
              <div class="fruit-result" id="fruitPartyResultText">Match clusters to win</div>
            </div>
          `;

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Party Mode</div>
              <div class="segmented-row three">
                <button class="seg-btn active" data-fruit-risk="normal" type="button">Normal</button>
                <button class="seg-btn" data-fruit-risk="wild" type="button">Wild</button>
                <button class="seg-btn" data-fruit-risk="chaos" type="button">Chaos</button>
              </div>
            </div>
          `;

          cells = $$(".fruit-cell", body);
          resultText = $("#fruitPartyResultText", body);
          multi.textContent = "0.00x";
        },

        play(amount) {
          resultText.textContent = "Mixing fruits...";

          let ticks = 0;
          const fx = setInterval(() => {
            cells.forEach((c) => {
              c.textContent = randomFruit();
            });

            ticks++;
            if (ticks >= 10) {
              clearInterval(fx);

              const result = Array.from({ length: 9 }).map(() => randomFruit());
              cells.forEach((c, i) => c.textContent = result[i]);

              const counts = result.reduce((acc, f) => {
                acc[f] = (acc[f] || 0) + 1;
                return acc;
              }, {});

              const bestCluster = Math.max(...Object.values(counts));
              let multiplier = 0;

              if (bestCluster >= 5) multiplier = 5.5;
              else if (bestCluster === 4) multiplier = 3.2;
              else if (bestCluster === 3) multiplier = 1.8;

              const payout = amount * multiplier;
              const win = multiplier > 0;

              resultText.textContent = win
                ? `Cluster hit • ${bestCluster} match • ${multiplier.toFixed(2)}x`
                : "No fruit cluster";

              CASINO.finishRound({ win, payout, multiplier });
            }
          }, 95);
        },

        destroy() {}
      };
    },

    createBananaFarmEngine() {
      let cells = [];
      let resultText;
      let ripeTarget = 3;

      const icons = ["🍌", "🥥", "🌴", "🐒", "🪨", "🍌", "🍌", "🌱", "🍌"];
      const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

      return {
        mount({ body, controls, multi }) {
          body.innerHTML = `
            <div class="engine">
              <div class="banana-grid" id="bananaFarmGrid">
                ${Array.from({ length: 9 }).map(() => `<div class="banana-cell">❔</div>`).join("")}
              </div>
              <div class="banana-status" id="bananaFarmStatusText">
                Harvest ripe bananas and avoid dead tiles.
              </div>
            </div>
          `;

          controls.innerHTML = `
            <div class="dynamic-card">
              <div class="dynamic-card-title">Harvest Target</div>
              <input type="range" id="bananaTargetInput" min="2" max="6" value="3">
              <div class="inline-value-row">
                <span>Needed Bananas</span>
                <strong id="bananaTargetText">3</strong>
              </div>
            </div>
          `;

          cells = $$(".banana-cell", body);
          resultText = $("#bananaFarmStatusText", body);

          const input = $("#bananaTargetInput", controls);
          const text = $("#bananaTargetText", controls);

          ripeTarget = Number(input.value);

          input.oninput = () => {
            ripeTarget = Number(input.value);
            text.textContent = ripeTarget;
          };

          multi.textContent = "0.00x";
        },

        play(amount) {
          resultText.textContent = "Harvesting...";

          let ticks = 0;
          const fx = setInterval(() => {
            cells.forEach((c) => {
              c.textContent = icons[randInt(0, icons.length - 1)];
            });

            ticks++;
            if (ticks >= 11) {
              clearInterval(fx);

              const result = shuffle(icons).slice(0, 9);
              cells.forEach((c, i) => c.textContent = result[i]);

              const bananas = result.filter(x => x === "🍌").length;

              let multiplier = 0;
              if (bananas >= ripeTarget + 2) multiplier = 4.5;
              else if (bananas >= ripeTarget + 1) multiplier = 2.8;
              else if (bananas >= ripeTarget) multiplier = 1.7;

              const payout = amount * multiplier;
              const win = multiplier > 0;

              resultText.textContent = win
                ? `Harvest success • ${bananas} bananas • ${multiplier.toFixed(2)}x`
                : `Only ${bananas} bananas collected`;

              CASINO.finishRound({ win, payout, multiplier });
            }
          }, 90);
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

    seedBigWins() {
      const sampleGames = this.games.map(g => g.name);
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
      clearInterval(this.ambientTimer);
      this.ambientTimer = setInterval(() => {
        this.state.stats.online = Math.max(300, this.state.stats.online + randInt(-9, 16));
        this.state.stats.volume += randInt(500, 7000);

        if (chance(.65)) this.pushRandomBigWin();

        if (this.lobby && !this.lobby.classList.contains("hidden") && document.getElementById("casino")?.classList.contains("active")) {
          this.renderLobby();
        } else {
          this.renderPlayers();
          this.syncWalletUI();
        }
      }, 12000);
    },

    bindGlobal() {
      if (this.boundGlobal) return;
      this.boundGlobal = true;

      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.state.activeEngine?.stop && this.state.currentGame?.id === "crash") {
          // optional pause
        }
      });
    }
  };

  function bootCasino() {
    CASINO.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootCasino, { once: true });
  } else {
    bootCasino();
  }
})();
