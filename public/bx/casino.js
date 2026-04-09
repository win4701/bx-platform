/* =========================================================
   BLOXIO CASINO — BX MASTER CORE FINAL
   BC.GAME STYLE FOUNDATION
   BX ONLY • TRIAL SYSTEM • AUTO PLAY • SHARED SHELL
========================================================= */

(function () {
  "use strict";

  /* =========================================================
     CONFIG
  ========================================================= */

  const BX = {
    SYMBOL: "BX",
    RATE_USDT: 45,
    MIN_BET: 0.01,
    MAX_BET: 1000,
    TRIAL_AIRDROP: 1,
    AUTO_MAX_ROUNDS: 100,
    AUTO_MIN_DELAY: 600,
    AUTO_MAX_DELAY: 1600,
    MAX_BET_PERCENT: 0.35
  };

  const STORAGE_KEYS = {
    CASINO_STATE: "bloxio_casino_state_v2",
    TRIAL_GRANTED: "bloxio_casino_trial_granted_v2",
    FAIRNESS: "bloxio_casino_fairness_v2"
  };

  const GAMES = {
    crash: {
      id: "crash",
      name: "Crash",
      type: "multiplier",
      minBet: 0.01,
      maxBet: 250,
      supportsAuto: true,
      icon: "🚀"
    },
    dice: {
      id: "dice",
      name: "Dice",
      type: "chance",
      minBet: 0.01,
      maxBet: 250,
      supportsAuto: true,
      icon: "🎲"
    },
    limbo: {
      id: "limbo",
      name: "Limbo",
      type: "multiplier",
      minBet: 0.01,
      maxBet: 250,
      supportsAuto: true,
      icon: "🪐"
    },
    hilo: {
      id: "hilo",
      name: "Hi-Lo",
      type: "card",
      minBet: 0.01,
      maxBet: 150,
      supportsAuto: true,
      icon: "🃏"
    },
    plinko: {
      id: "plinko",
      name: "Plinko",
      type: "drop",
      minBet: 0.05,
      maxBet: 150,
      supportsAuto: true,
      icon: "🔻"
    },
    mines: {
      id: "mines",
      name: "Mines",
      type: "grid",
      minBet: 0.05,
      maxBet: 150,
      supportsAuto: false,
      icon: "💣"
    }
  };

  /* =========================================================
     GLOBAL STATE
  ========================================================= */

  const CASINO = {
    state: {
      wallet: {
        realBX: 0,
        trialBX: 0,
        totalBX: 0
      },

      currentGame: null,

      bet: 0.10,
      mode: "manual", // manual | auto | advanced

      auto: {
        enabled: false,
        running: false,
        rounds: 10,
        roundsLeft: 10,
        speed: "normal", // normal | fast | turbo
        stopOnProfit: 2,
        stopOnLoss: 2,
        increaseOnLoss: 0,
        resetOnWin: true,
        startBalance: 0,
        sessionProfit: 0
      },

      ui: {
        settingsOpen: false,
        history: [],
        recentWins: [],
        livePlayers: []
      },

      stats: {
        played: 0,
        won: 0,
        lost: 0,
        wagered: 0,
        profit: 0
      },

      fairness: {
        serverSeed: randomSeed(32),
        clientSeed: "player_" + Math.floor(Math.random() * 9999),
        nonce: 1
      }
    },

    refs: {},

    initialized: false
  };

  window.CASINO = CASINO;

  /* =========================================================
     HELPERS
  ========================================================= */

  function $(id) {
    return document.getElementById(id);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  function fmt(n, d = 2) {
    return Number(n || 0).toFixed(d);
  }

  function fmtBX(n, d = 2) {
    return `${fmt(n, d)} ${BX.SYMBOL}`;
  }

  function fmtUSDFromBX(bx) {
    return `$${fmt((bx || 0) * BX.RATE_USDT, 2)}`;
  }

  function nowTs() {
    return Date.now();
  }

  function randomSeed(len = 16) {
    const chars = "abcdef0123456789";
    let out = "";
    for (let i = 0; i < len; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  function toast(msg = "Done", type = "info") {
    const el =
      $("casinoToast") ||
      $("walletToast") ||
      document.querySelector(".toast") ||
      createGlobalToast();

    el.textContent = msg;
    el.className = `toast show ${type}`;

    clearTimeout(el._t);
    el._t = setTimeout(() => {
      el.className = "toast";
    }, 2200);
  }

  function createGlobalToast() {
    const t = document.createElement("div");
    t.id = "casinoToast";
    t.className = "toast";
    Object.assign(t.style, {
      position: "fixed",
      left: "50%",
      bottom: "90px",
      transform: "translateX(-50%)",
      padding: "12px 16px",
      borderRadius: "14px",
      background: "rgba(0,0,0,.85)",
      color: "#fff",
      fontWeight: "900",
      zIndex: "99999",
      opacity: "0",
      transition: ".2s ease"
    });
    document.body.appendChild(t);

    const st = document.createElement("style");
    st.textContent = `
      .toast.show{ opacity:1 !important; transform:translateX(-50%) translateY(-4px) !important; }
      .toast.success{ box-shadow:0 0 18px rgba(34,197,94,.25); }
      .toast.error{ box-shadow:0 0 18px rgba(239,68,68,.25); }
      .toast.info{ box-shadow:0 0 18px rgba(59,130,246,.25); }
    `;
    document.head.appendChild(st);
    return t;
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEYS.CASINO_STATE, JSON.stringify(CASINO.state));
    } catch (e) {
      console.warn("Casino save failed", e);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CASINO_STATE);
      if (!raw) return;
      const parsed = JSON.parse(raw);

      CASINO.state = {
        ...CASINO.state,
        ...parsed,
        wallet: {
          ...CASINO.state.wallet,
          ...(parsed.wallet || {})
        },
        auto: {
          ...CASINO.state.auto,
          ...(parsed.auto || {})
        },
        ui: {
          ...CASINO.state.ui,
          ...(parsed.ui || {})
        },
        stats: {
          ...CASINO.state.stats,
          ...(parsed.stats || {})
        },
        fairness: {
          ...CASINO.state.fairness,
          ...(parsed.fairness || {})
        }
      };
    } catch (e) {
      console.warn("Casino load failed", e);
    }
  }

  /* =========================================================
     WALLET — BX ONLY
  ========================================================= */

  function grantTrialBXOnce() {
    const granted = localStorage.getItem(STORAGE_KEYS.TRIAL_GRANTED);
    if (granted) return;

    CASINO.state.wallet.trialBX = BX.TRIAL_AIRDROP;
    recalcWallet();
    localStorage.setItem(STORAGE_KEYS.TRIAL_GRANTED, "1");
    toast("🎁 1 BX Trial added to Casino", "success");
  }

  function recalcWallet() {
    const w = CASINO.state.wallet;
    w.realBX = Math.max(0, Number(w.realBX || 0));
    w.trialBX = Math.max(0, Number(w.trialBX || 0));
    w.totalBX = +(w.realBX + w.trialBX).toFixed(8);
  }

  function getWalletBX() {
    recalcWallet();
    return CASINO.state.wallet.totalBX;
  }

  function hasEnoughBX(amount) {
    return getWalletBX() >= amount;
  }

  function canBet(amount) {
    amount = Number(amount || 0);

    if (!amount || amount <= 0) {
      toast("Enter a valid bet", "error");
      return false;
    }

    if (amount < BX.MIN_BET) {
      toast(`Minimum bet is ${BX.MIN_BET} BX`, "error");
      return false;
    }

    if (amount > BX.MAX_BET) {
      toast(`Maximum bet is ${BX.MAX_BET} BX`, "error");
      return false;
    }

    const game = getCurrentGameConfig();
    if (game) {
      if (amount < game.minBet) {
        toast(`Minimum for ${game.name} is ${game.minBet} BX`, "error");
        return false;
      }
      if (amount > game.maxBet) {
        toast(`Maximum for ${game.name} is ${game.maxBet} BX`, "error");
        return false;
      }
    }

    if (!hasEnoughBX(amount)) {
      toast("Insufficient BX balance", "error");
      return false;
    }

    const maxAllowed = getWalletBX() * BX.MAX_BET_PERCENT;
    if (amount > maxAllowed && getWalletBX() > 2) {
      toast(`Max bet is ${fmt(maxAllowed, 2)} BX`, "error");
      return false;
    }

    return true;
  }

  function debitBX(amount) {
    amount = Number(amount || 0);
    if (amount <= 0) return true;
    if (!hasEnoughBX(amount)) return false;

    const w = CASINO.state.wallet;

    if (w.trialBX >= amount) {
      w.trialBX -= amount;
    } else {
      const left = amount - w.trialBX;
      w.trialBX = 0;
      w.realBX -= left;
    }

    recalcWallet();
    saveState();
    return true;
  }

  function creditBX(amount, isRealWin = false) {
    amount = Number(amount || 0);
    if (amount <= 0) return;

    // الأرباح تروح realBX فقط إذا كان عندك real stake
    // وإذا stake trial فقط، تربح داخل casino كـ realBX = 0؟ لا.
    // هنا نعتمد سياسة محافظة:
    // ربح trial يبقى trial.
    if (isRealWin) {
      CASINO.state.wallet.realBX += amount;
    } else {
      CASINO.state.wallet.trialBX += amount;
    }

    recalcWallet();
    saveState();
  }

  function getStakeSource(amount) {
    const w = CASINO.state.wallet;
    return w.trialBX >= amount ? "trial" : "mixed_or_real";
  }

  /* =========================================================
     FAIRNESS (LIGHT CORE)
  ========================================================= */

  function nextNonce() {
    CASINO.state.fairness.nonce += 1;
    return CASINO.state.fairness.nonce;
  }

  function fairnessRoll() {
    // Lightweight pseudo-fair source for frontend UX
    const base = Math.random();
    nextNonce();
    saveState();
    return base;
  }

  /* =========================================================
     GAME RESULT ENGINE
  ========================================================= */

  function getCurrentGameConfig() {
    return GAMES[CASINO.state.currentGame] || null;
  }

  function runGameRound(gameId, betAmount, opts = {}) {
    const game = GAMES[gameId];
    if (!game) {
      return {
        ok: false,
        error: "Game not found"
      };
    }

    const roll = fairnessRoll();
    let result = {
      ok: true,
      gameId,
      bet: betAmount,
      payout: 0,
      profit: -betAmount,
      multiplier: 0,
      won: false,
      meta: {}
    };

    switch (gameId) {
      case "crash": {
        const bust = +(1 + Math.pow(roll * 8, 1.2)).toFixed(2);
        const target = Number(opts.targetPayout || 1.96);

        result.multiplier = bust;
        result.won = bust >= target;
        result.payout = result.won ? +(betAmount * target).toFixed(8) : 0;
        result.profit = +(result.payout - betAmount).toFixed(8);
        result.meta = { bust, target };
        break;
      }

      case "dice": {
        const chance = clamp(Number(opts.chance || 50), 1, 95);
        const payout = +(99 / chance).toFixed(2);
        const rolled = +(roll * 100).toFixed(2);
        const won = rolled <= chance;

        result.multiplier = payout;
        result.won = won;
        result.payout = won ? +(betAmount * payout).toFixed(8) : 0;
        result.profit = +(result.payout - betAmount).toFixed(8);
        result.meta = { chance, rolled };
        break;
      }

      case "limbo": {
        const target = Number(opts.targetPayout || 1.96);
        const hit = +(1 + Math.pow(roll * 10, 1.25)).toFixed(2);
        const won = hit >= target;

        result.multiplier = hit;
        result.won = won;
        result.payout = won ? +(betAmount * target).toFixed(8) : 0;
        result.profit = +(result.payout - betAmount).toFixed(8);
        result.meta = { target, hit };
        break;
      }

      case "hilo": {
        const pick = opts.pick || "higher";
        const current = randInt(1, 13);
        const next = randInt(1, 13);
        const won =
          pick === "higher" ? next > current :
          pick === "lower" ? next < current :
          false;

        const payout = 1.70;

        result.multiplier = payout;
        result.won = won;
        result.payout = won ? +(betAmount * payout).toFixed(8) : 0;
        result.profit = +(result.payout - betAmount).toFixed(8);
        result.meta = { current, next, pick };
        break;
      }

      case "plinko": {
        const risk = opts.risk || "medium";
        const rows = Number(opts.rows || 8);

        const riskMap = {
          low: [0.5, 0.7, 1, 1.2, 1.5],
          medium: [0.3, 0.6, 1, 1.7, 2.5],
          high: [0.2, 0.4, 1, 2.5, 5]
        };

        const pool = riskMap[risk] || riskMap.medium;
        const picked = pool[randInt(0, pool.length - 1)];

        result.multiplier = picked;
        result.won = picked >= 1;
        result.payout = +(betAmount * picked).toFixed(8);
        result.profit = +(result.payout - betAmount).toFixed(8);
        result.meta = { risk, rows, slot: randInt(0, rows) };
        break;
      }

      case "mines": {
        const mineCount = clamp(Number(opts.mines || 3), 1, 10);
        const safe = roll > mineCount / 25;
        const payout = safe ? +(1 + mineCount * 0.18).toFixed(2) : 0;

        result.multiplier = payout || 0;
        result.won = safe;
        result.payout = safe ? +(betAmount * payout).toFixed(8) : 0;
        result.profit = +(result.payout - betAmount).toFixed(8);
        result.meta = { mineCount };
        break;
      }

      default:
        return { ok: false, error: "Unsupported game" };
    }

    return result;
  }

  /* =========================================================
     SESSION / STATS
  ========================================================= */

  function pushHistory(result) {
    CASINO.state.ui.history.unshift({
      id: "r_" + nowTs(),
      game: result.gameId,
      won: result.won,
      profit: result.profit,
      payout: result.payout,
      multiplier: result.multiplier,
      time: nowTs()
    });

    CASINO.state.ui.history = CASINO.state.ui.history.slice(0, 20);

    if (result.won && result.profit > 0) {
      CASINO.state.ui.recentWins.unshift({
        user: fakeUser(),
        game: GAMES[result.gameId]?.name || result.gameId,
        amount: result.profit,
        time: nowTs()
      });

      CASINO.state.ui.recentWins = CASINO.state.ui.recentWins.slice(0, 10);
    }
  }

  function updateStats(result) {
    CASINO.state.stats.played += 1;
    CASINO.state.stats.wagered += result.bet;
    CASINO.state.stats.profit += result.profit;

    if (result.won) CASINO.state.stats.won += 1;
    else CASINO.state.stats.lost += 1;
  }

  function applyResult(result, stakeSource = "real") {
    if (!result.ok) {
      toast(result.error || "Round failed", "error");
      return;
    }

    // stake already debited before play
    if (result.payout > 0) {
      const isRealWin = stakeSource !== "trial";
      creditBX(result.payout, isRealWin);
    }

    pushHistory(result);
    updateStats(result);
    saveState();

    updateCasinoUI();
    updateGameVisual(result);
    pushHistoryChip(result.multiplier, result.won);

    if (result.won) {
      toast(`Won ${fmtBX(result.profit)}`, "success");
    } else {
      toast(`Lost ${fmtBX(result.bet)}`, "error");
    }
  }

  /* =========================================================
     AUTO PLAY ENGINE
  ========================================================= */

  function getAutoDelay() {
    const speed = CASINO.state.auto.speed;
    if (speed === "turbo") return BX.AUTO_MIN_DELAY;
    if (speed === "fast") return 900;
    return BX.AUTO_MAX_DELAY;
  }

  function startAutoPlay() {
    const game = getCurrentGameConfig();
    if (!game) return toast("Choose a game first", "error");
    if (!game.supportsAuto) return toast("Auto not available for this game", "error");

    const bet = getCurrentBet();
    if (!canBet(bet)) return;

    CASINO.state.auto.enabled = true;
    CASINO.state.auto.running = true;
    CASINO.state.auto.roundsLeft = clamp(
      Number(CASINO.state.auto.rounds || 10),
      1,
      BX.AUTO_MAX_ROUNDS
    );
    CASINO.state.auto.startBalance = getWalletBX();
    CASINO.state.auto.sessionProfit = 0;

    updateCasinoUI();
    toast("Auto Play Started", "info");

    runAutoLoop();
  }

  function stopAutoPlay(reason = "Stopped") {
    CASINO.state.auto.enabled = false;
    CASINO.state.auto.running = false;
    updateCasinoUI();
    toast(reason, "info");
    saveState();
  }

  function shouldStopAuto() {
    const a = CASINO.state.auto;
    const currentProfit = getWalletBX() - a.startBalance;

    if (a.stopOnProfit > 0 && currentProfit >= a.stopOnProfit) {
      stopAutoPlay("Auto stopped: target profit hit");
      return true;
    }

    if (a.stopOnLoss > 0 && currentProfit <= -Math.abs(a.stopOnLoss)) {
      stopAutoPlay("Auto stopped: stop loss hit");
      return true;
    }

    if (a.roundsLeft <= 0) {
      stopAutoPlay("Auto finished");
      return true;
    }

    return false;
  }

  function runAutoLoop() {
    if (!CASINO.state.auto.running) return;
    if (shouldStopAuto()) return;

    const bet = getCurrentBet();
    if (!canBet(bet)) {
      stopAutoPlay("Auto stopped: insufficient balance");
      return;
    }

    const stakeSource = getStakeSource(bet);
    const ok = debitBX(bet);
    if (!ok) {
      stopAutoPlay("Auto stopped: debit failed");
      return;
    }

    const result = playCurrentGameRound(bet);
    applyResult(result, stakeSource);

    CASINO.state.auto.roundsLeft -= 1;

    // strategy
    if (result.won) {
      if (CASINO.state.auto.resetOnWin) {
        setBetInput(CASINO.state.bet);
      }
    } else {
      const inc = Number(CASINO.state.auto.increaseOnLoss || 0);
      if (inc > 0) {
        const next = getCurrentBet() * (1 + inc / 100);
        setBetInput(next);
      }
    }

    updateCasinoUI();
    saveState();

    if (shouldStopAuto()) return;
    setTimeout(runAutoLoop, getAutoDelay());
  }

  /* =========================================================
     GAME PLAY ROUTER
  ========================================================= */

  function getCurrentBet() {
    const input = $("casinoBetInput");
    const v = input ? parseFloat(input.value || CASINO.state.bet || 0.1) : CASINO.state.bet;
    return +clamp(v || 0.1, BX.MIN_BET, BX.MAX_BET).toFixed(4);
  }

  function setBetInput(v) {
    const input = $("casinoBetInput");
    if (input) input.value = (+v).toFixed(2);
  }

  function getGameOptions() {
    const gameId = CASINO.state.currentGame;

    if (gameId === "crash" || gameId === "limbo") {
      return {
        targetPayout: parseFloat($("casinoTargetInput")?.value || "1.96")
      };
    }

    if (gameId === "dice") {
      return {
        chance: parseFloat($("casinoTargetInput")?.value || "50")
      };
    }

    if (gameId === "hilo") {
      const active = document.querySelector(".casino-choice-btn.active");
      return {
        pick: active?.dataset.pick || "higher"
      };
    }

    if (gameId === "plinko") {
      const risk = document.querySelector(".casino-risk-btn.active")?.dataset.risk || "medium";
      return {
        risk,
        rows: 8
      };
    }

    if (gameId === "mines") {
      return {
        mines: parseInt($("casinoTargetInput")?.value || "3", 10)
      };
    }

    return {};
  }

  function playCurrentGameRound(betAmount) {
    const gameId = CASINO.state.currentGame;
    const opts = getGameOptions();
    return runGameRound(gameId, betAmount, opts);
  }

  function playOnce() {
    const game = getCurrentGameConfig();
    if (!game) return toast("Select a game", "error");

    const bet = getCurrentBet();
    if (!canBet(bet)) return;

    const stakeSource = getStakeSource(bet);
    const ok = debitBX(bet);
    if (!ok) return toast("Balance error", "error");

    const result = playCurrentGameRound(bet);
    applyResult(result, stakeSource);

    saveState();
  }

  /* =========================================================
     UI — SHELL RENDER
  ========================================================= */

  function renderCasinoLobby() {
    const casinoRoot = $("casino");
    if (!casinoRoot) return;

    const games = Object.values(GAMES)
      .map(g => `
        <button class="game" data-game="${g.id}" aria-label="${g.name}">
          <div class="game-overlay">
            <div class="game-badge">${g.icon}</div>
            <div class="game-name">${g.name}</div>
            <div class="game-sub">BX Originals</div>
          </div>
        </button>
      `)
      .join("");

    casinoRoot.innerHTML = `
      <div class="casino-top-strip">
        <div class="casino-balance-chip">
          <span>Casino Wallet</span>
          <strong id="casinoWalletDisplay">0.00 BX</strong>
          <small id="casinoWalletUSD">$0.00</small>
        </div>

        <div class="casino-balance-chip">
          <span>Trial BX</span>
          <strong id="casinoTrialDisplay">0.00 BX</strong>
          <small>Casino only</small>
        </div>

        <div class="casino-balance-chip">
          <span>Status</span>
          <strong id="casinoSessionState">Ready</strong>
          <small>BX only</small>
        </div>
      </div>

      <div class="casino-grid" id="casinoGrid">
        ${games}
      </div>

      <div id="casinoGameBox" style="display:none;"></div>

      <div class="big-wins">
        <div class="big-wins-title">Recent BX Wins</div>
        <div class="big-wins-track" id="casinoBigWinsTrack"></div>
      </div>
    `;
  }

  function renderGameShell(gameId) {
    const game = GAMES[gameId];
    const box = $("casinoGameBox");
    const grid = $("casinoGrid");
    if (!box || !grid || !game) return;

    CASINO.state.currentGame = gameId;
    saveState();

    grid.classList.add("hide");
    grid.style.display = "none";
    box.style.display = "block";
    box.classList.add("show");

    box.innerHTML = `
      <div class="casino-v2-shell">

        <div class="casino-v2-topbar">
          <button class="casino-back" id="casinoBackBtn">‹</button>

          <div class="casino-v2-headings">
            <div class="casino-game-title">${game.name}</div>
            <div class="casino-game-subtitle">BX Originals • Provably Fair • ${game.supportsAuto ? "Auto Ready" : "Manual"}</div>
          </div>

          <div class="casino-network">
            <span class="dot"></span>
            <span>Online</span>
          </div>
        </div>

        <div class="casino-mode-tabs">
          <button class="active">Classique</button>
          <button>BX Mode</button>
          <button>Strategy</button>
        </div>

        <div class="casino-history-strip" id="casinoHistoryStrip"></div>

        <div class="casino-v2-main">
          <div class="casino-v2-stage-card">
            <div class="stage-top-meta">
              <div class="round-state" id="roundState">Ready</div>
              <div class="round-id">Nonce #<span id="noncePreviewInline">${CASINO.state.fairness.nonce}</span></div>
            </div>

            <div class="game-engine-stage" id="gameEngineStage">
              ${renderGameVisual(gameId)}
            </div>

            <div class="stage-bottom-stats">
              <div class="stat-pill">
                <span>Wallet</span>
                <strong id="stageWalletBX">${fmt(getWalletBX(), 2)} BX</strong>
              </div>
              <div class="stat-pill">
                <span>Bet</span>
                <strong id="stageBetBX">${fmt(getCurrentBet(), 2)} BX</strong>
              </div>
              <div class="stat-pill">
                <span>State</span>
                <strong id="stageState">Ready</strong>
              </div>
            </div>
          </div>

          <div class="casino-v2-controls-card">
            <div class="bet-mode-tabs">
              <button class="${CASINO.state.mode === "manual" ? "active" : ""}" data-bet-mode="manual">Manual</button>
              <button class="${CASINO.state.mode === "auto" ? "active" : ""}" data-bet-mode="auto">Auto</button>
              <button class="${CASINO.state.mode === "advanced" ? "active" : ""}" data-bet-mode="advanced">Advanced</button>
            </div>

            <div class="bet-panel-body">
              <label>Bet (${BX.SYMBOL})</label>
              <div class="casino-input-row">
                <div class="casino-amount-box">
                  <span class="coin-icon">${BX.SYMBOL}</span>
                  <input type="number" id="casinoBetInput" min="${BX.MIN_BET}" step="0.01" value="${fmt(CASINO.state.bet, 2)}">
                </div>
                <button class="mini-btn" id="halfBetBtn">1/2</button>
                <button class="mini-btn" id="doubleBetBtn">2×</button>
              </div>

              <div class="casino-quick-row">
                <button class="mini-btn casino-quick-bet" data-bet="0.10">0.10</button>
                <button class="mini-btn casino-quick-bet" data-bet="0.50">0.50</button>
                <button class="mini-btn casino-quick-bet" data-bet="1">1</button>
                <button class="mini-btn casino-quick-bet" data-bet="5">5</button>
              </div>

              <label id="secondaryInputLabel">${getSecondaryLabel(gameId)}</label>
              <div class="casino-input-row single">
                <div class="casino-amount-box">
                  <input type="number" id="casinoTargetInput" value="${getSecondaryDefault(gameId)}" step="0.01">
                </div>
              </div>

              <div id="casinoGameExtraControls">
                ${renderExtraControls(gameId)}
              </div>

              <div class="bet-extra-info">
                <span>Wallet <strong id="controlWalletBX">${fmt(getWalletBX(), 2)} BX</strong></span>
                <span>≈ <strong id="controlWalletUSD">${fmtUSDFromBX(getWalletBX())}</strong></span>
              </div>

              <button class="casino-bet-btn" id="casinoPlayBtn">
                ${CASINO.state.mode === "auto" ? "Start Auto" : "Play"}
              </button>

              <button class="casino-settings-toggle" id="casinoSettingsToggleBtn">
                Paramètres
              </button>

              <div class="casino-settings-panel ${CASINO.state.ui.settingsOpen ? "show" : ""}" id="casinoSettingsPanel">
                ${renderSettingsPanel(gameId)}
              </div>
            </div>
          </div>
        </div>

        <div class="casino-v2-live-card">
          <div class="live-card-header">
            <div class="live-title">Live BX Activity</div>
            <div class="live-total" id="liveTotalPool">${fmtUSDFromBX(getWalletBX())}</div>
          </div>

          <div class="live-table-wrap">
            <table class="casino-live-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Result</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody id="casinoPlayersTableBody"></tbody>
            </table>
          </div>
        </div>

        <div class="casino-v2-meta-grid">
          <div class="meta-card">
            <span>Server Seed</span>
            <strong id="serverSeedPreview">${CASINO.state.fairness.serverSeed}</strong>
          </div>
          <div class="meta-card">
            <span>Client Seed</span>
            <strong id="clientSeedPreview">${CASINO.state.fairness.clientSeed}</strong>
          </div>
          <div class="meta-card">
            <span>Nonce</span>
            <strong id="noncePreview">${CASINO.state.fairness.nonce}</strong>
          </div>
        </div>
      </div>
    `;

    bindGameShellEvents();
    hydrateLiveTable();
    hydrateRecentWins();
    hydrateHistoryStrip();
    updateCasinoUI();
  }

  function renderGameVisual(gameId) {
    switch (gameId) {
      case "crash":
        return `
          <div class="default-stage-placeholder">
            <div class="hero-multiplier" id="gameMultiplierDisplay">1.00×</div>
            <div class="hero-sub">Rocket ready for launch</div>
            <div class="hero-rocket">🚀</div>
          </div>
        `;

      case "dice":
        return `
          <div class="default-stage-placeholder">
            <div class="hero-multiplier" id="gameMultiplierDisplay">50.00%</div>
            <div class="hero-sub">Roll under target chance</div>
            <div class="hero-rocket">🎲</div>
          </div>
        `;

      case "limbo":
        return `
          <div class="default-stage-placeholder">
            <div class="hero-multiplier" id="gameMultiplierDisplay">1.96×</div>
            <div class="hero-sub">Hit your target multiplier</div>
            <div class="hero-rocket">🪐</div>
          </div>
        `;

      case "hilo":
        return `
          <div class="default-stage-placeholder">
            <div class="hero-multiplier" id="gameMultiplierDisplay">7</div>
            <div class="hero-sub">Guess higher or lower</div>
            <div class="hero-rocket">🃏</div>
          </div>
        `;

      case "plinko":
        return `
          <div class="default-stage-placeholder">
            <div class="hero-multiplier" id="gameMultiplierDisplay">1.00×</div>
            <div class="hero-sub">Drop and pray 😶</div>
            <div class="hero-rocket">🔻</div>
          </div>
        `;

      case "mines":
        return `
          <div class="default-stage-placeholder">
            <div class="hero-multiplier" id="gameMultiplierDisplay">1.00×</div>
            <div class="hero-sub">Avoid the mines</div>
            <div class="hero-rocket">💣</div>
          </div>
        `;

      default:
        return `
          <div class="default-stage-placeholder">
            <div class="hero-multiplier" id="gameMultiplierDisplay">1.00×</div>
            <div class="hero-sub">Game ready</div>
          </div>
        `;
    }
  }

  function renderExtraControls(gameId) {
    if (gameId === "hilo") {
      return `
        <div class="casino-choice-row">
          <button class="casino-choice-btn active" data-pick="higher">Higher</button>
          <button class="casino-choice-btn" data-pick="lower">Lower</button>
        </div>
      `;
    }

    if (gameId === "plinko") {
      return `
        <label>Risk</label>
        <div class="casino-choice-row">
          <button class="casino-risk-btn" data-risk="low">Low</button>
          <button class="casino-risk-btn active" data-risk="medium">Medium</button>
          <button class="casino-risk-btn" data-risk="high">High</button>
        </div>
      `;
    }

    return "";
  }

  function renderSettingsPanel(gameId) {
    const autoDisabled = !GAMES[gameId]?.supportsAuto;

    return `
      <div class="setting-row">
        <span>Animation FX</span>
        <label class="switch">
          <input type="checkbox" checked>
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-row">
        <span>Live Feed</span>
        <label class="switch">
          <input type="checkbox" checked>
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-row">
        <span>Auto Play</span>
        <strong style="color:${autoDisabled ? "#ef4444" : "#22c55e"}">${autoDisabled ? "Disabled" : "Enabled"}</strong>
      </div>

      <div id="casinoAutoPanel" style="margin-top:12px; ${CASINO.state.mode === "auto" && !autoDisabled ? "" : "display:none;"}">
        <label>Auto Rounds</label>
        <div class="casino-input-row single">
          <div class="casino-amount-box">
            <input type="number" id="autoRoundsInput" min="1" max="${BX.AUTO_MAX_ROUNDS}" value="${CASINO.state.auto.rounds}">
          </div>
        </div>

        <label>Stop Profit (BX)</label>
        <div class="casino-input-row single">
          <div class="casino-amount-box">
            <input type="number" id="autoProfitInput" min="0" step="0.1" value="${CASINO.state.auto.stopOnProfit}">
          </div>
        </div>

        <label>Stop Loss (BX)</label>
        <div class="casino-input-row single">
          <div class="casino-amount-box">
            <input type="number" id="autoLossInput" min="0" step="0.1" value="${CASINO.state.auto.stopOnLoss}">
          </div>
        </div>

        <label>Increase On Loss (%)</label>
        <div class="casino-input-row single">
          <div class="casino-amount-box">
            <input type="number" id="autoIncreaseInput" min="0" max="100" step="1" value="${CASINO.state.auto.increaseOnLoss}">
          </div>
        </div>

        <label>Speed</label>
        <div class="casino-choice-row">
          <button class="casino-speed-btn ${CASINO.state.auto.speed === "normal" ? "active" : ""}" data-speed="normal">Normal</button>
          <button class="casino-speed-btn ${CASINO.state.auto.speed === "fast" ? "active" : ""}" data-speed="fast">Fast</button>
          <button class="casino-speed-btn ${CASINO.state.auto.speed === "turbo" ? "active" : ""}" data-speed="turbo">Turbo</button>
        </div>
      </div>
    `;
  }

  function getSecondaryLabel(gameId) {
    if (gameId === "crash" || gameId === "limbo") return "Target Payout";
    if (gameId === "dice") return "Win Chance (%)";
    if (gameId === "mines") return "Mines";
    return "Target";
  }

  function getSecondaryDefault(gameId) {
    if (gameId === "crash" || gameId === "limbo") return "1.96";
    if (gameId === "dice") return "50";
    if (gameId === "mines") return "3";
    return "1.00";
  }

  /* =========================================================
     UI — UPDATE
  ========================================================= */

  function updateCasinoUI() {
    recalcWallet();

    const walletDisplay = $("casinoWalletDisplay");
    const walletUSD = $("casinoWalletUSD");
    const trialDisplay = $("casinoTrialDisplay");
    const sessionState = $("casinoSessionState");

    if (walletDisplay) walletDisplay.textContent = fmtBX(getWalletBX(), 2);
    if (walletUSD) walletUSD.textContent = fmtUSDFromBX(getWalletBX());
    if (trialDisplay) trialDisplay.textContent = fmtBX(CASINO.state.wallet.trialBX, 2);
    if (sessionState) {
      sessionState.textContent = CASINO.state.auto.running
        ? "Auto Running"
        : "Ready";
    }

    const stageWalletBX = $("stageWalletBX");
    const controlWalletBX = $("controlWalletBX");
    const controlWalletUSD = $("controlWalletUSD");
    const stageBetBX = $("stageBetBX");
    const stageState = $("stageState");
    const noncePreview = $("noncePreview");
    const noncePreviewInline = $("noncePreviewInline");
    const playBtn = $("casinoPlayBtn");

    if (stageWalletBX) stageWalletBX.textContent = fmtBX(getWalletBX(), 2);
    if (controlWalletBX) controlWalletBX.textContent = fmtBX(getWalletBX(), 2);
    if (controlWalletUSD) controlWalletUSD.textContent = fmtUSDFromBX(getWalletBX());
    if (stageBetBX) stageBetBX.textContent = fmtBX(getCurrentBet(), 2);
    if (stageState) stageState.textContent = CASINO.state.auto.running ? "Running" : "Ready";
    if (noncePreview) noncePreview.textContent = CASINO.state.fairness.nonce;
    if (noncePreviewInline) noncePreviewInline.textContent = CASINO.state.fairness.nonce;

    if (playBtn) {
      playBtn.textContent = CASINO.state.mode === "auto"
        ? (CASINO.state.auto.running ? "Stop Auto" : "Start Auto")
        : "Play";
    }

    hydrateRecentWins();
    hydrateLiveTable();
    saveState();
  }

  function updateGameVisual(result) {
    const display = $("gameMultiplierDisplay");
    const roundState = $("roundState");
    if (!display || !result) return;

    if (result.gameId === "crash" || result.gameId === "limbo" || result.gameId === "plinko") {
      display.textContent = `${fmt(result.multiplier, 2)}×`;
    } else if (result.gameId === "dice") {
      display.textContent = `${fmt(result.meta.rolled, 2)}`;
    } else if (result.gameId === "hilo") {
      display.textContent = `${result.meta.next}`;
    } else if (result.gameId === "mines") {
      display.textContent = result.won ? `${fmt(result.multiplier, 2)}×` : "💥";
    }

    display.style.color = result.won ? "#22c55e" : "#ef4444";

    if (roundState) {
      roundState.textContent = result.won ? "Win" : "Lose";
      roundState.style.color = result.won ? "#22c55e" : "#ef4444";
    }
  }

  function pushHistoryChip(multiplier, won = true) {
    const strip = $("casinoHistoryStrip");
    if (!strip) return;

    const chip = document.createElement("span");
    chip.textContent = `${fmt(multiplier, 2)}x`;

    if (multiplier >= 2) chip.className = "green";
    else if (won) chip.className = "orange";
    else chip.className = "red";

    strip.prepend(chip);

    while (strip.children.length > 12) {
      strip.removeChild(strip.lastElementChild);
    }
  }

  function hydrateHistoryStrip() {
    const strip = $("casinoHistoryStrip");
    if (!strip) return;
    strip.innerHTML = "";

    const items = CASINO.state.ui.history.slice(0, 8);
    items.forEach(item => pushHistoryChip(item.multiplier, item.won));
  }

  function hydrateRecentWins() {
    const track = $("casinoBigWinsTrack");
    if (!track) return;

    track.innerHTML = "";

    const wins = CASINO.state.ui.recentWins.length
      ? CASINO.state.ui.recentWins
      : [
          { user: "bx_alpha", game: "Crash", amount: 2.40 },
          { user: "green_hodl", game: "Dice", amount: 1.12 },
          { user: "moon_player", game: "Limbo", amount: 3.80 }
        ];

    wins.forEach(w => {
      const row = document.createElement("div");
      row.className = "big-win-row";
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.padding = "12px";
      row.style.borderRadius = "12px";
      row.style.marginBottom = "10px";

      row.innerHTML = `
        <span class="user">${w.user}</span>
        <span class="game">${w.game}</span>
        <span class="amount">${fmt(w.amount, 2)} BX</span>
      `;

      track.appendChild(row);
    });
  }

  /* =========================================================
     LIVE FEED
  ========================================================= */

  const LIVE_USERS = [
    "bx_alpha", "moon_hodl", "rocket77", "dice_master", "green_candles",
    "bxwhale", "cryptofox", "minerX", "block_hero", "lucky_drop"
  ];

  function fakeUser() {
    return LIVE_USERS[randInt(0, LIVE_USERS.length - 1)];
  }

  function hydrateLiveTable() {
    const tbody = $("casinoPlayersTableBody");
    if (!tbody) return;

    if (!CASINO.state.ui.livePlayers.length) {
      for (let i = 0; i < 8; i++) {
        CASINO.state.ui.livePlayers.push({
          user: fakeUser(),
          result: Math.random() > 0.5 ? "Win" : "Lose",
          amount: +(Math.random() * 5 + 0.1).toFixed(2)
        });
      }
    }

    tbody.innerHTML = "";
    CASINO.state.ui.livePlayers.slice(0, 10).forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.user}</td>
        <td style="color:${r.result === "Win" ? "#22c55e" : "#ef4444"}">${r.result}</td>
        <td>${fmt(r.amount, 2)} BX</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function pushLiveRow(result) {
    CASINO.state.ui.livePlayers.unshift({
      user: fakeUser(),
      result: result.won ? "Win" : "Lose",
      amount: result.won ? result.payout : result.bet
    });

    CASINO.state.ui.livePlayers = CASINO.state.ui.livePlayers.slice(0, 12);
  }

  function startLiveTicker() {
    setInterval(() => {
      CASINO.state.ui.livePlayers.unshift({
        user: fakeUser(),
        result: Math.random() > 0.48 ? "Win" : "Lose",
        amount: +(Math.random() * 4 + 0.05).toFixed(2)
      });

      CASINO.state.ui.livePlayers = CASINO.state.ui.livePlayers.slice(0, 12);
      hydrateLiveTable();
      saveState();
    }, 3500);
  }

  /* =========================================================
     EVENTS
  ========================================================= */

  function bindLobbyEvents() {
    document.addEventListener("click", (e) => {
      const gameBtn = e.target.closest(".game[data-game]");
      if (gameBtn) {
        const gameId = gameBtn.dataset.game;
        renderGameShell(gameId);
      }
    });
  }

  function bindGameShellEvents() {
    $("casinoBackBtn")?.addEventListener("click", closeGameShell);
    $("halfBetBtn")?.addEventListener("click", () => {
      setBetInput(Math.max(BX.MIN_BET, getCurrentBet() / 2));
      updateCasinoUI();
    });

    $("doubleBetBtn")?.addEventListener("click", () => {
      setBetInput(Math.min(BX.MAX_BET, getCurrentBet() * 2));
      updateCasinoUI();
    });

    $("casinoPlayBtn")?.addEventListener("click", () => {
      if (CASINO.state.mode === "auto") {
        if (CASINO.state.auto.running) stopAutoPlay("Auto stopped");
        else startAutoPlay();
      } else {
        playOnce();
      }
    });

    $("casinoSettingsToggleBtn")?.addEventListener("click", () => {
      CASINO.state.ui.settingsOpen = !CASINO.state.ui.settingsOpen;
      const panel = $("casinoSettingsPanel");
      if (panel) panel.classList.toggle("show", CASINO.state.ui.settingsOpen);
      saveState();
    });

    $("casinoBetInput")?.addEventListener("input", () => {
      CASINO.state.bet = getCurrentBet();
      updateCasinoUI();
      saveState();
    });

    document.querySelectorAll(".casino-quick-bet").forEach(btn => {
      btn.addEventListener("click", () => {
        setBetInput(btn.dataset.bet);
        CASINO.state.bet = getCurrentBet();
        updateCasinoUI();
        saveState();
      });
    });

    document.querySelectorAll(".bet-mode-tabs button").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".bet-mode-tabs button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        CASINO.state.mode = btn.dataset.betMode || "manual";

        const autoPanel = $("casinoAutoPanel");
        if (autoPanel) {
          autoPanel.style.display =
            CASINO.state.mode === "auto" && GAMES[CASINO.state.currentGame]?.supportsAuto
              ? ""
              : "none";
        }

        updateCasinoUI();
        saveState();
      });
    });

    document.querySelectorAll(".casino-choice-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".casino-choice-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    document.querySelectorAll(".casino-risk-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".casino-risk-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    document.querySelectorAll(".casino-speed-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".casino-speed-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        CASINO.state.auto.speed = btn.dataset.speed || "normal";
        saveState();
      });
    });

    $("autoRoundsInput")?.addEventListener("input", (e) => {
      CASINO.state.auto.rounds = clamp(Number(e.target.value || 10), 1, BX.AUTO_MAX_ROUNDS);
      saveState();
    });

    $("autoProfitInput")?.addEventListener("input", (e) => {
      CASINO.state.auto.stopOnProfit = Math.max(0, Number(e.target.value || 0));
      saveState();
    });

    $("autoLossInput")?.addEventListener("input", (e) => {
      CASINO.state.auto.stopOnLoss = Math.max(0, Number(e.target.value || 0));
      saveState();
    });

    $("autoIncreaseInput")?.addEventListener("input", (e) => {
      CASINO.state.auto.increaseOnLoss = clamp(Number(e.target.value || 0), 0, 100);
      saveState();
    });
  }

  function closeGameShell() {
    stopAutoPlay("Exited game");

    const box = $("casinoGameBox");
    const grid = $("casinoGrid");

    if (box) {
      box.classList.remove("show");
      box.style.display = "none";
      box.innerHTML = "";
    }

    if (grid) {
      grid.style.display = "grid";
      grid.classList.remove("hide");
    }

    CASINO.state.currentGame = null;
    saveState();
    updateCasinoUI();
  }

  /* =========================================================
     BOOT
  ========================================================= */

  function bootstrapCasino() {
    if (CASINO.initialized) return;
    CASINO.initialized = true;

    loadState();
    grantTrialBXOnce();
    recalcWallet();

    renderCasinoLobby();
    bindLobbyEvents();
    hydrateRecentWins();
    hydrateLiveTable();
    startLiveTicker();
    updateCasinoUI();

    console.log("🎰 Bloxio Casino BX MASTER CORE Ready");
  }

  document.addEventListener("DOMContentLoaded", bootstrapCasino);

})();
