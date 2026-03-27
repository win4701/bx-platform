/* =========================================================
   CASINO FINAL JS
   Compatible with casino.html + casino.css final
   Production-style modular casino frontend
========================================================= */

(function () {
  "use strict";

  /* =========================================================
     HELPERS
  ========================================================= */
  const $ = (id) => document.getElementById(id);
  const fmt = (n, d = 2) => Number(n || 0).toFixed(d);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function randomSeed(len = 24) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let out = "";
    for (let i = 0; i < len; i++) out += chars[(Math.random() * chars.length) | 0];
    return out;
  }

  function chance(p) {
    return Math.random() < p;
  }

  function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[m]));
  }

  /* =========================================================
     GLOBAL CASINO APP
  ========================================================= */
  const CASINO = {
    balance: 884.64,
    currentGame: null,
    instantPlay: false,
    playing: false,

    provablyFair: {
      serverSeed: randomSeed(28),
      clientSeed: "client_" + randomSeed(10),
      nonce: 0
    },

    state: {
      lastResult: null,
      bigWins: [
        { user: "@alpha", game: "Crash", amount: 24.5 },
        { user: "@king", game: "Dice", amount: 41.0 },
        { user: "@nova", game: "Plinko", amount: 88.75 },
        { user: "@mira", game: "Limbo", amount: 17.25 },
        { user: "@zen", game: "Slot", amount: 63.0 }
      ],
      tickerItems: [
        "🔥 @alpha won 24.50 BX on Crash",
        "🎯 Dice 98.11 hit by @ghost",
        "🟢 Limbo cashed at 6.44x",
        "🎰 Slot 7️⃣7️⃣7️⃣ paid 120 BX",
        "🪙 Coin Flip streak x5 live",
        "🟣 Plinko 14 rows Medium live",
        "🐦 Birds Party jackpot opened"
      ]
    },

    games: [
  { id: "coinflip", name: "Coin Flip", image: "https://dummyimage.com/300x420/0d1733/ffffff&text=Coin+Flip", fair: true },
  { id: "banana", name: "Banana Farm", image: "https://dummyimage.com/300x420/0d1733/ffffff&text=Banana+Farm", fair: false },
  { id: "limbo", name: "Limbo", image: "https://dummyimage.com/300x420/0d1733/ffffff&text=Limbo", fair: true },
  { id: "fruit", name: "Fruit Party", image: "https://dummyimage.com/300x420/0d1733/ffffff&text=Fruit+Party", fair: false },
  { id: "dice", name: "Dice", image: "https://dummyimage.com/300x420/0d1733/ffffff&text=Dice", fair: true },
  { id: "crash", name: "Crash", image: "https://dummyimage.com/300x420/0d1733/ffffff&text=Crash", fair: true },
  { id: "slot", name: "Slot", image: "https://dummyimage.com/300x420/0d1733/ffffff&text=Slot", fair: true },
  { id: "birds", name: "Birds Party", image: "https://dummyimage.com/300x420/0d1733/ffffff&text=Birds+Party", fair: false },
  { id: "blackjack", name: "Blackjack", image: "https://dummyimage.com/300x420/0d1733/ffffff&text=Blackjack", fair: false },
  { id: "airboss", name: "Air Boss", image: "https://dummyimage.com/300x420/0d1733/ffffff&text=Air+Boss", fair: true },
  { id: "hilo", name: "HiLo", image: "https://dummyimage.com/300x420/0d1733/ffffff&text=HiLo", fair: true },
  { id: "plinko", name: "Plinko", image: "https://dummyimage.com/300x420/0d1733/ffffff&text=Plinko", fair: true }
],

    engines: {},

    init() {
      this.cacheDom();
      this.bindBase();
      this.renderLobby();
      this.renderBigWins();
      this.renderTicker();
      this.updateAllUI();
      this.registerEngines();
      console.log("[CASINO] FINAL loaded");
    },

    cacheDom() {
      this.root = $("casino");

      this.lobby = $("casinoLobby");
      this.gameScreen = $("casinoGameScreen");

      this.balanceMini = $("casinoBalanceMini");
      this.balanceTop = $("casinoGameBalance");

      this.grid = $("casinoGrid");
      this.bigWinsList = $("casinoBigWinsList");
      this.tickerTrack = $("casinoTickerTrack");

      this.gameTitle = $("casinoGameTitle");
      this.gameFair = $("casinoGameFair");
      this.gameStatus = $("casinoGameStatus");
      this.gameMultiplier = $("casinoGameMultiplier");
      this.gameMeta = $("casinoGameMeta");
      this.gameBox = $("casinoGameBox");

      this.betInput = $("casinoBetInput");
      this.dynamicControls = $("casinoDynamicControls");
      this.lastResult = $("casinoLastResult");
      this.pfBox = $("casinoProvablyFair");

      this.resultFlash = $("casinoResultFlash");
      this.instantToggle = $("casinoInstantToggle");

      this.statsBalance = $("casinoStatsBalance");
      this.statsGames = $("casinoStatsGames");
      this.statsMode = $("casinoStatsMode");

      this.backBtn = $("casinoBackBtn");
      this.playBtn = $("casinoPlayBtn");
      this.seedBtn = $("casinoSeedBtn");
    },

    bindBase() {
      this.backBtn?.addEventListener("click", () => this.closeGame());
      this.playBtn?.addEventListener("click", () => this.playCurrentGame());
      this.seedBtn?.addEventListener("click", () => this.newSeed());

      this.instantToggle?.addEventListener("click", () => {
        this.instantPlay = !this.instantPlay;
        this.instantToggle.classList.toggle("active", this.instantPlay);
        this.instantToggle.textContent = this.instantPlay ? "Instant Play ON" : "Instant Play";
        this.setMeta("Mode", this.instantPlay ? "Instant" : "Standard");
      });

      this.betInput?.addEventListener("input", () => {
        const val = parseFloat(this.betInput.value) || 0;
        this.setMeta("Bet", `${fmt(val)} BX`);
      });
    },

    updateAllUI() {
      if (this.balanceMini) this.balanceMini.textContent = fmt(this.balance);
      if (this.balanceTop) this.balanceTop.textContent = fmt(this.balance);
      if (this.statsBalance) this.statsBalance.textContent = `${fmt(this.balance)} BX`;
      if (this.statsGames) this.statsGames.textContent = `${this.games.length} Games`;
      if (this.statsMode) this.statsMode.textContent = this.instantPlay ? "Instant" : "Standard";
    },

    /* =========================================================
       LOBBY
    ========================================================= */
    renderLobby() {
      if (!this.grid) return;

      this.grid.innerHTML = this.games
        .map(
          (g) => `
          <button class="game-card" data-game="${g.id}">
            <div class="game-card-glow"></div>
            <img src="${g.image}" alt="${escapeHtml(g.name)}" onerror="this.src='https://via.placeholder.com/300x420?text=${encodeURIComponent(g.name)}'">
            <span>${escapeHtml(g.name)}</span>
          </button>
        `
        )
        .join("");

      this.grid.querySelectorAll(".game-card").forEach((card) => {
        card.addEventListener("click", () => {
          const gameId = card.dataset.game;
          this.openGame(gameId);
        });
      });
    },

    renderBigWins() {
      if (!this.bigWinsList) return;

      this.bigWinsList.innerHTML = this.state.bigWins
        .slice(0, 6)
        .map(
          (w) => `
          <div class="big-win-row">
            <div class="big-win-user">
              <strong>${escapeHtml(w.user)}</strong>
              <small>${escapeHtml(w.game)}</small>
            </div>
            <div class="big-win-amount">+${fmt(w.amount)} BX</div>
          </div>
        `
        )
        .join("");
    },

    pushBigWin(game, amount) {
      const user = pick(["@alpha", "@nova", "@king", "@ghost", "@mira", "@zen", "@player01"]);
      this.state.bigWins.unshift({ user, game, amount });
      this.state.bigWins = this.state.bigWins.slice(0, 8);
      this.renderBigWins();
    },

    renderTicker() {
      if (!this.tickerTrack) return;
      const items = [...this.state.tickerItems, ...this.state.tickerItems];
      this.tickerTrack.innerHTML = items.map((t) => `<span>${escapeHtml(t)}</span>`).join("");
    },

    pushTicker(text) {
      this.state.tickerItems.unshift(text);
      this.state.tickerItems = this.state.tickerItems.slice(0, 8);
      this.renderTicker();
    },

    /* =========================================================
       GAME OPEN / CLOSE
    ========================================================= */
    openGame(gameId) {
      const game = this.games.find((g) => g.id === gameId);
      if (!game) return;

      this.currentGame = gameId;
      this.playing = false;

      this.lobby?.classList.remove("active");
      this.gameScreen?.classList.add("active");

      this.gameTitle.textContent = game.name;
      this.gameFair.textContent = game.fair ? "PROVABLY FAIR" : "INSTANT PLAY";
      this.gameStatus.textContent = this.defaultStatus(gameId);
      this.gameMultiplier.textContent = "1.00x";

      this.setDefaultMeta();
      this.renderDynamicControls(gameId);
      this.renderEngine(gameId);
      this.renderProvablyFair();
      this.renderLastResult();

      this.updateAllUI();
      this.root?.scrollIntoView({ behavior: "smooth", block: "start" });
    },

    closeGame() {
      this.currentGame = null;
      this.playing = false;

      this.gameScreen?.classList.remove("active");
      this.lobby?.classList.add("active");

      this.clearCanvasLoops();
      this.updateAllUI();
    },

    defaultStatus(gameId) {
      const map = {
        slot: "Ready to spin",
        crash: "Waiting for round",
        dice: "Set your target",
        limbo: "Ready to reveal",
        plinko: "Ready to drop",
        blackjack: "Blackjack round ready",
        birds: "Choose a bird",
        hilo: "Ready to guess",
        coinflip: "Choose heads or tails",
        airboss: "Ready for takeoff",
        banana: "Pick a banana crate",
        fruit: "Reveal fruit cluster"
      };
      return map[gameId] || "Ready";
    },

    setDefaultMeta() {
      this.gameMeta.innerHTML = `
        <div class="casino-meta-pill"><span>Mode</span><strong>${this.instantPlay ? "Instant" : "Standard"}</strong></div>
        <div class="casino-meta-pill"><span>Bet</span><strong>${fmt(parseFloat(this.betInput?.value || 10))} BX</strong></div>
        <div class="casino-meta-pill"><span>State</span><strong>Idle</strong></div>
      `;
    },

    setMeta(label, value, index = 0) {
      const pills = this.gameMeta?.querySelectorAll(".casino-meta-pill");
      if (!pills || !pills[index]) return;
      pills[index].innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
    },

    renderLastResult(data = null) {
      const result = data || this.state.lastResult || {
        game: this.currentGame || "-",
        payout: "—",
        multiplier: "—",
        status: "No round yet"
      };

      if (!this.lastResult) return;

      this.lastResult.innerHTML = `
        <div class="last-result-row"><span>Game</span><strong>${escapeHtml(result.game)}</strong></div>
        <div class="last-result-row"><span>Payout</span><strong>${escapeHtml(String(result.payout))}</strong></div>
        <div class="last-result-row"><span>Multiplier</span><strong>${escapeHtml(String(result.multiplier))}</strong></div>
        <div class="last-result-row"><span>Status</span><strong>${escapeHtml(String(result.status))}</strong></div>
      `;
    },

    renderProvablyFair() {
      if (!this.pfBox) return;
      this.pfBox.innerHTML = `
        <div class="pf-head">
          <h5>Provably Fair</h5>
          <span>${this.games.find(g => g.id === this.currentGame)?.fair ? "ACTIVE" : "SIMULATED"}</span>
        </div>
        <div class="pf-row"><span>Server Seed</span><strong>${this.provablyFair.serverSeed}</strong></div>
        <div class="pf-row"><span>Client Seed</span><strong>${this.provablyFair.clientSeed}</strong></div>
        <div class="pf-row"><span>Nonce</span><strong>${this.provablyFair.nonce}</strong></div>
      `;
    },

    newSeed() {
      this.provablyFair.serverSeed = randomSeed(28);
      this.provablyFair.clientSeed = "client_" + randomSeed(10);
      this.provablyFair.nonce = 0;
      this.renderProvablyFair();
      this.flash("New seed generated", true);
    },

    flash(text, isWin = true) {
      if (!this.resultFlash) return;
      this.resultFlash.textContent = text;
      this.resultFlash.className = `casino-result-flash show ${isWin ? "win" : "lose"}`;
      clearTimeout(this._flashTimer);
      this._flashTimer = setTimeout(() => {
        this.resultFlash.className = "casino-result-flash";
      }, 2200);
    },

    /* =========================================================
       BET SYSTEM
    ========================================================= */
    getBet() {
      return clamp(parseFloat(this.betInput?.value || 10), 0.01, this.balance);
    },

    setBet(v) {
      const val = clamp(Number(v || 0), 0.01, Math.max(this.balance, 0.01));
      if (this.betInput) this.betInput.value = fmt(val);
      this.setMeta("Bet", `${fmt(val)} BX`, 1);
    },

    bindQuickBetButtons() {
      const map = {
        half: () => this.setBet(this.getBet() / 2),
        double: () => this.setBet(this.getBet() * 2),
        ten: () => this.setBet(this.balance * 0.10),
        twentyfive: () => this.setBet(this.balance * 0.25),
        fifty: () => this.setBet(this.balance * 0.50),
        max: () => this.setBet(this.balance)
      };

      document.querySelectorAll("[data-bet-action]").forEach((btn) => {
        btn.onclick = () => {
          const action = btn.dataset.betAction;
          if (map[action]) map[action]();
        };
      });
    },

    debit(amount) {
      if (amount > this.balance) return false;
      this.balance -= amount;
      this.balance = Math.max(0, this.balance);
      this.updateAllUI();
      return true;
    },

    credit(amount) {
      this.balance += amount;
      this.updateAllUI();
    },

    saveRound(game, payout, multiplier, status) {
      this.state.lastResult = {
        game,
        payout: `${fmt(payout)} BX`,
        multiplier: `${fmt(multiplier)}x`,
        status
      };
      this.renderLastResult(this.state.lastResult);
    },

    /* =========================================================
       DYNAMIC CONTROLS
    ========================================================= */
    renderDynamicControls(gameId) {
      if (!this.dynamicControls) return;

      const controls = {
        slot: `
          <div class="casino-control-box">
            <h5>Slot Mode</h5>
            <div class="casino-segmented three">
              <button class="active" data-slot-lines="10">10 Lines</button>
              <button data-slot-lines="20">20 Lines</button>
              <button data-slot-lines="50">50 Lines</button>
            </div>
          </div>
        `,
        crash: `
          <div class="casino-control-box">
            <h5>Auto Cashout</h5>
            <input id="crashAutoCashout" type="number" min="1.01" step="0.01" value="2.00" />
            <div class="casino-segmented" style="margin-top:12px">
              <button id="crashStartRound">Start Round</button>
              <button id="crashCashoutBtn">Cashout</button>
            </div>
          </div>
        `,
        dice: `
          <div class="casino-control-box">
            <div class="casino-segmented" id="diceMode">
              <button data-dice-mode="over">Roll Over</button>
              <button class="active" data-dice-mode="under">Roll Under</button>
            </div>
            <div class="casino-slider-wrap" style="margin-top:16px">
              <label>Target Number</label>
              <input id="diceTarget" type="range" min="2" max="98" value="11" />
              <div class="casino-slider-value">Target: <span id="diceTargetValue">11</span></div>
            </div>
          </div>
        `,
        limbo: `
          <div class="casino-control-box">
            <label>Target Multiplier</label>
            <input id="limboTarget" type="number" min="1.01" step="0.01" value="2.00" />
          </div>
        `,
        plinko: `
          <div class="casino-control-box">
            <div class="casino-segmented three" id="plinkoRisk">
              <button data-risk="low">Low</button>
              <button class="active" data-risk="medium">Medium</button>
              <button data-risk="high">High</button>
            </div>
            <div class="casino-slider-wrap" style="margin-top:16px">
              <label>Rows</label>
              <input id="plinkoRows" type="range" min="8" max="16" value="11" />
              <div class="casino-slider-value">Rows: <span id="plinkoRowsValue">11</span></div>
            </div>
          </div>
        `,
        blackjack: `
          <div class="casino-control-box">
            <div class="casino-segmented">
              <button id="bjHitBtn">Hit</button>
              <button id="bjStandBtn">Stand</button>
            </div>
            <div style="margin-top:14px;color:var(--casino-text-soft);font-weight:700;">
              Fast auto blackjack logic
            </div>
          </div>
        `,
        birds: `
          <div class="casino-control-box">
            <div style="color:var(--casino-text);font-size:1rem;font-weight:800;">
              Pick a bird and reveal payout.
            </div>
          </div>
        `,
        hilo: `
          <div class="casino-control-box">
            <div class="casino-segmented">
              <button id="hiloHighBtn">High</button>
              <button id="hiloLowBtn">Low</button>
            </div>
          </div>
        `,
        coinflip: `
          <div class="casino-control-box">
            <div class="casino-segmented">
              <button id="coinHeadsBtn">Heads</button>
              <button id="coinTailsBtn">Tails</button>
            </div>
          </div>
        `,
        airboss: `
          <div class="casino-control-box">
            <label>Takeoff Target</label>
            <input id="airbossTarget" type="number" min="1.10" step="0.10" value="2.50" />
          </div>
        `,
        banana: `
          <div class="casino-control-box">
            <div style="color:var(--casino-text);font-size:1rem;font-weight:800;">
              Pick a banana crate.
            </div>
          </div>
        `,
        fruit: `
          <div class="casino-control-box">
            <div style="color:var(--casino-text);font-size:1rem;font-weight:800;">
              Reveal fruit cluster bonus.
            </div>
          </div>
        `
      };

      this.dynamicControls.innerHTML = controls[gameId] || "";
      this.bindQuickBetButtons();
      this.bindDynamicHooks(gameId);
    },

    bindDynamicHooks(gameId) {
      if (gameId === "dice") {
        const target = $("diceTarget");
        const targetValue = $("diceTargetValue");
        target?.addEventListener("input", () => {
          targetValue.textContent = target.value;
        });

        document.querySelectorAll("[data-dice-mode]").forEach((btn) => {
          btn.addEventListener("click", () => {
            document.querySelectorAll("[data-dice-mode]").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
          });
        });
      }

      if (gameId === "plinko") {
        const rows = $("plinkoRows");
        const rowsValue = $("plinkoRowsValue");
        rows?.addEventListener("input", () => {
          rowsValue.textContent = rows.value;
          this.renderEngine("plinko");
        });

        document.querySelectorAll("[data-risk]").forEach((btn) => {
          btn.addEventListener("click", () => {
            document.querySelectorAll("[data-risk]").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
          });
        });
      }

      if (gameId === "coinflip") {
        $("coinHeadsBtn")?.addEventListener("click", () => this.state.coinChoice = "heads");
        $("coinTailsBtn")?.addEventListener("click", () => this.state.coinChoice = "tails");
      }

      if (gameId === "hilo") {
        $("hiloHighBtn")?.addEventListener("click", () => this.state.hiloChoice = "high");
        $("hiloLowBtn")?.addEventListener("click", () => this.state.hiloChoice = "low");
      }

      if (gameId === "blackjack") {
        $("bjHitBtn")?.addEventListener("click", () => this.flash("Use Play to resolve round", true));
        $("bjStandBtn")?.addEventListener("click", () => this.flash("Use Play to resolve round", true));
      }

      if (gameId === "crash") {
        $("crashStartRound")?.addEventListener("click", () => this.playCurrentGame());
        $("crashCashoutBtn")?.addEventListener("click", () => {
          if (this.engines.crash?.cashout) this.engines.crash.cashout();
        });
      }
    },

    /* =========================================================
       ENGINE RENDER
    ========================================================= */
    registerEngines() {
      /* ---------------- SLOT ---------------- */
      this.engines.slot = {
        render: () => {
          this.gameBox.innerHTML = `
            <div class="casino-center-wrap">
              <div class="casino-engine-panel">
                <div class="slot-reels" id="slotReels">
                  <div class="slot-reel">🍒</div>
                  <div class="slot-reel">🍋</div>
                  <div class="slot-reel">7️⃣</div>
                </div>
              </div>
            </div>
          `;
        },
        play: async (bet) => {
          const symbols = ["🍒", "🍋", "🍉", "🍇", "7️⃣", "⭐", "🔔"];
          const reels = [...document.querySelectorAll(".slot-reel")];
          for (let i = 0; i < 16; i++) {
            reels.forEach((r) => (r.textContent = pick(symbols)));
            await sleep(80);
          }

          const final = [pick(symbols), pick(symbols), pick(symbols)];
          reels.forEach((r, i) => (r.textContent = final[i]));

          const counts = {};
          final.forEach((s) => (counts[s] = (counts[s] || 0) + 1));

          let mult = 0;
          if (Object.values(counts).includes(3)) mult = final[0] === "7️⃣" ? 12 : 5;
          else if (Object.values(counts).includes(2)) mult = 1.8;
          else mult = 0;

          return { multiplier: mult, payout: bet * mult, status: mult > 0 ? "Win" : "No match" };
        }
      };

      /* ---------------- DICE ---------------- */
      this.engines.dice = {
        render: () => {
          this.gameBox.innerHTML = `
            <div class="casino-center-wrap">
              <div class="casino-engine-panel" style="flex-direction:column;gap:18px;">
                <div style="font-size:1.1rem;color:var(--casino-text-soft);font-weight:800;">Provably Fair Dice</div>
                <div id="diceResultNum" style="font-size:5rem;font-weight:900;">--</div>
              </div>
            </div>
          `;
        },
        play: async (bet) => {
          const numEl = $("diceResultNum");
          for (let i = 0; i < 12; i++) {
            if (numEl) numEl.textContent = randInt(0, 99);
            await sleep(55);
          }

          const roll = randInt(0, 99);
          if (numEl) numEl.textContent = roll;

          const target = parseInt($("diceTarget")?.value || "11", 10);
          const mode = document.querySelector("[data-dice-mode].active")?.dataset.diceMode || "under";
          const win = mode === "under" ? roll < target : roll > target;

          const edge = 0.99;
          const winChance = mode === "under" ? target / 100 : (100 - target) / 100;
          const mult = Number((edge / Math.max(winChance, 0.01)).toFixed(2));
          const payout = win ? bet * mult : 0;

          return {
            multiplier: win ? mult : 0,
            payout,
            status: win ? `Dice ${roll} WIN` : `Dice ${roll} LOSE`
          };
        }
      };

      /* ---------------- LIMBO ---------------- */
      this.engines.limbo = {
        render: () => {
          this.gameBox.innerHTML = `
            <div class="casino-center-wrap">
              <div class="casino-engine-panel" style="flex-direction:column;gap:16px;">
                <div style="font-size:1rem;color:var(--casino-text-soft);font-weight:800;">Limbo Reveal</div>
                <div id="limboResult" style="font-size:4.6rem;font-weight:900;color:var(--casino-green);">1.00x</div>
              </div>
            </div>
          `;
        },
        play: async (bet) => {
          const out = $("limboResult");
          for (let i = 0; i < 18; i++) {
            const temp = rand(1.0, 12).toFixed(2);
            if (out) out.textContent = `${temp}x`;
            await sleep(55);
          }

          const result = Number((Math.max(1.0, 0.99 / Math.random())).toFixed(2));
          if (out) out.textContent = `${result.toFixed(2)}x`;

          const target = parseFloat($("limboTarget")?.value || "2.00");
          const win = result >= target;
          const payout = win ? bet * target : 0;

          return {
            multiplier: win ? target : result,
            payout,
            status: win ? `Hit ${result.toFixed(2)}x` : `Missed ${target.toFixed(2)}x`
          };
        }
      };

      /* ---------------- COIN FLIP ---------------- */
      this.engines.coinflip = {
        render: () => {
          this.gameBox.innerHTML = `
            <div class="casino-center-wrap">
              <div class="casino-engine-panel" style="flex-direction:column;gap:16px;">
                <div id="coinDisc" style="
                  width:160px;height:160px;border-radius:50%;
                  background:linear-gradient(135deg,#f8d24a,#ffb700);
                  display:flex;align-items:center;justify-content:center;
                  font-size:2rem;font-weight:900;color:#111;
                  box-shadow:0 20px 50px rgba(0,0,0,.25);
                  transition:transform .4s ease;
                ">🪙</div>
                <div id="coinResultLabel" style="font-size:1.2rem;font-weight:900;">Heads / Tails</div>
              </div>
            </div>
          `;
        },
        play: async (bet) => {
          const disc = $("coinDisc");
          const label = $("coinResultLabel");
          if (disc) disc.style.transform = "rotateY(1440deg)";
          await sleep(900);

          const result = chance(0.5) ? "heads" : "tails";
          if (label) label.textContent = result.toUpperCase();

          const chosen = this.state.coinChoice || "heads";
          const win = chosen === result;
          return {
            multiplier: win ? 1.96 : 0,
            payout: win ? bet * 1.96 : 0,
            status: win ? `${result} WIN` : `${result} LOSE`
          };
        }
      };

      /* ---------------- HILO ---------------- */
      this.engines.hilo = {
        render: () => {
          const n = randInt(2, 13);
          this.state.hiloCard = n;
          this.gameBox.innerHTML = `
            <div class="casino-center-wrap">
              <div class="casino-engine-panel" style="flex-direction:column;gap:16px;">
                <div style="font-size:1rem;color:var(--casino-text-soft);font-weight:800;">Current Card</div>
                <div id="hiloCard" style="
                  width:170px;height:220px;border-radius:24px;
                  background:linear-gradient(180deg,#ffffff,#dfe8ff);
                  color:#111;display:flex;align-items:center;justify-content:center;
                  font-size:4rem;font-weight:900;
                  box-shadow:0 20px 50px rgba(0,0,0,.25);
                ">${n}</div>
              </div>
            </div>
          `;
        },
        play: async (bet) => {
          const current = this.state.hiloCard || randInt(2, 13);
          const next = randInt(2, 13);
          const choice = this.state.hiloChoice || "high";
          const card = $("hiloCard");
          await sleep(300);
          if (card) card.textContent = next;

          const win = choice === "high" ? next > current : next < current;
          this.state.hiloCard = next;

          return {
            multiplier: win ? 1.92 : 0,
            payout: win ? bet * 1.92 : 0,
            status: win ? `${current} → ${next} WIN` : `${current} → ${next} LOSE`
          };
        }
      };

      /* ---------------- BIRDS ---------------- */
      this.engines.birds = {
        render: () => {
          this.state.birdsChoice = null;
          this.gameBox.innerHTML = `
            <div class="casino-center-wrap">
              <div class="casino-engine-panel">
                <div class="birds-grid">
                  <button class="bird-pick" data-bird="0">🐦</button>
                  <button class="bird-pick" data-bird="1">🦜</button>
                  <button class="bird-pick" data-bird="2">🦅</button>
                </div>
              </div>
            </div>
          `;
          document.querySelectorAll(".bird-pick").forEach((b) => {
            b.addEventListener("click", () => {
              document.querySelectorAll(".bird-pick").forEach((x) => x.classList.remove("active"));
              b.classList.add("active");
              this.state.birdsChoice = Number(b.dataset.bird);
            });
          });
        },
        play: async (bet) => {
          const chosen = this.state.birdsChoice;
          if (chosen === null || chosen === undefined) {
            return { multiplier: 0, payout: 0, status: "Pick a bird first", softFail: true };
          }

          const winner = randInt(0, 2);
          document.querySelectorAll(".bird-pick").forEach((b, i) => {
            b.style.boxShadow = i === winner ? "0 0 30px rgba(41,227,162,.35)" : "";
          });

          const win = chosen === winner;
          return {
            multiplier: win ? 2.8 : 0,
            payout: win ? bet * 2.8 : 0,
            status: win ? "Correct bird!" : "Wrong bird"
          };
        }
      };

      /* ---------------- BLACKJACK ---------------- */
      this.engines.blackjack = {
        render: () => {
          const p = randInt(8, 18);
          const d = randInt(8, 18);
          this.state.bj = { player: p, dealer: d };
          this.gameBox.innerHTML = `
            <div class="casino-center-wrap">
              <div class="casino-engine-panel">
                <div class="bj-board">
                  <div class="bj-hand">
                    <div class="bj-hand-title">Dealer</div>
                    <div class="bj-hand-score" id="bjDealer">${d}</div>
                  </div>
                  <div class="bj-hand">
                    <div class="bj-hand-title">Player</div>
                    <div class="bj-hand-score" id="bjPlayer">${p}</div>
                  </div>
                </div>
              </div>
            </div>
          `;
        },
        play: async (bet) => {
          let { player, dealer } = this.state.bj || { player: 15, dealer: 14 };
          await sleep(500);

          if (player < 17) player += randInt(1, 10);
          while (dealer < 17) dealer += randInt(1, 10);

          $("bjDealer") && ($("bjDealer").textContent = dealer);
          $("bjPlayer") && ($("bjPlayer").textContent = player);

          let win = false;
          if (player > 21) win = false;
          else if (dealer > 21) win = true;
          else win = player > dealer;

          return {
            multiplier: win ? 2 : 0,
            payout: win ? bet * 2 : 0,
            status: win ? "Blackjack WIN" : "Blackjack LOSE"
          };
        }
      };

      /* ---------------- BANANA ---------------- */
      this.engines.banana = {
        render: () => {
          this.state.bananaChoice = null;
          this.gameBox.innerHTML = `
            <div class="casino-center-wrap">
              <div class="casino-engine-panel">
                <div class="birds-grid">
                  <button class="bird-pick" data-banana="0">🍌</button>
                  <button class="bird-pick" data-banana="1">📦</button>
                  <button class="bird-pick" data-banana="2">🍌</button>
                </div>
              </div>
            </div>
          `;
          document.querySelectorAll("[data-banana]").forEach((b) => {
            b.addEventListener("click", () => {
              document.querySelectorAll("[data-banana]").forEach((x) => x.classList.remove("active"));
              b.classList.add("active");
              this.state.bananaChoice = Number(b.dataset.banana);
            });
          });
        },
        play: async (bet) => {
          const chosen = this.state.bananaChoice;
          if (chosen === null || chosen === undefined) {
            return { multiplier: 0, payout: 0, status: "Pick a crate first", softFail: true };
          }
          const lucky = randInt(0, 2);
          const win = chosen === lucky;
          return {
            multiplier: win ? 3.2 : 0,
            payout: win ? bet * 3.2 : 0,
            status: win ? "Banana bonus!" : "Empty crate"
          };
        }
      };

      /* ---------------- FRUIT ---------------- */
      this.engines.fruit = {
        render: () => {
          this.gameBox.innerHTML = `
            <div class="casino-center-wrap">
              <div class="casino-engine-panel" style="font-size:5rem;">🍓 🍇 🍉</div>
            </div>
          `;
        },
        play: async (bet) => {
          const mult = pick([0, 0.5, 1.2, 2.4, 5]);
          return {
            multiplier: mult,
            payout: bet * mult,
            status: mult > 0 ? `Fruit ${mult.toFixed(2)}x` : "No cluster"
          };
        }
      };

      /* ---------------- AIRBOSS ---------------- */
      this.engines.airboss = {
        render: () => {
          this.gameBox.innerHTML = `
            <div class="casino-center-wrap">
              <div class="casino-engine-panel" style="flex-direction:column;gap:18px;">
                <div style="font-size:5rem;">✈️</div>
                <div id="airbossResult" style="font-size:3rem;font-weight:900;color:var(--casino-green);">1.00x</div>
              </div>
            </div>
          `;
        },
        play: async (bet) => {
          const out = $("airbossResult");
          for (let i = 0; i < 16; i++) {
            if (out) out.textContent = `${rand(1, 8).toFixed(2)}x`;
            await sleep(70);
          }
          const result = Number((rand(1, 12)).toFixed(2));
          if (out) out.textContent = `${result.toFixed(2)}x`;

          const target = parseFloat($("airbossTarget")?.value || "2.50");
          const win = result >= target;

          return {
            multiplier: win ? target : result,
            payout: win ? bet * target : 0,
            status: win ? `Takeoff success ${result.toFixed(2)}x` : `Crashed at ${result.toFixed(2)}x`
          };
        }
      };

      /* ---------------- CRASH ---------------- */
      this.engines.crash = {
        animId: null,
        running: false,
        cashedOut: false,
        current: 1.0,
        final: 1.0,

        render: () => {
          this.gameBox.innerHTML = `
            <div class="casino-center-wrap">
              <div class="crash-graph">
                <canvas id="crashCanvas" width="900" height="500" style="width:100%;height:100%;display:block;"></canvas>
              </div>
            </div>
          `;
          this.engines.crash.drawStatic();
        },

        drawStatic: () => {
          const canvas = $("crashCanvas");
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          ctx.strokeStyle = "rgba(255,255,255,.08)";
          ctx.lineWidth = 1;
          for (let i = 0; i < 10; i++) {
            const y = (h / 10) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
          }
          for (let i = 0; i < 12; i++) {
            const x = (w / 12) * i;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
          }
        },

        play: async (bet) => {
          const engine = this.engines.crash;
          const auto = parseFloat($("crashAutoCashout")?.value || "2.00");
          engine.running = true;
          engine.cashedOut = false;
          engine.current = 1.0;
          engine.final = Number((rand(1.1, 8.5) ** 1.1).toFixed(2));

          this.gameStatus.textContent = "Flying...";
          this.setMeta("State", "Live", 2);

          return new Promise((resolve) => {
            const canvas = $("crashCanvas");
            if (!canvas) {
              resolve({ multiplier: 0, payout: 0, status: "Canvas error" });
              return;
            }
            const ctx = canvas.getContext("2d");
            const w = canvas.width;
            const h = canvas.height;

            const points = [];
            const start = performance.now();

            const frame = (now) => {
              if (!engine.running) return;
              const t = (now - start) / 1000;
              engine.current = Number((1 + t * 0.45 + t * t * 0.55).toFixed(2));

              points.push({ x: Math.min(w - 30, 40 + t * 110), y: h - (40 + Math.min(h - 80, (engine.current - 1) * 55)) });

              ctx.clearRect(0, 0, w, h);
              engine.drawStatic();

              // curve
              ctx.strokeStyle = "#29e3a2";
              ctx.lineWidth = 6;
              ctx.beginPath();
              points.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
              });
              ctx.stroke();

              // glow
              ctx.shadowBlur = 25;
              ctx.shadowColor = "rgba(41,227,162,.6)";
              if (points.length) {
                const p = points[points.length - 1];
                ctx.fillStyle = "#29e3a2";
                ctx.beginPath();
                ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.shadowBlur = 0;

              this.gameMultiplier.textContent = `${engine.current.toFixed(2)}x`;

              if (!engine.cashedOut && engine.current >= auto && this.instantPlay) {
                engine.cashedOut = true;
                engine.running = false;
                const payout = bet * auto;
                resolve({
                  multiplier: auto,
                  payout,
                  status: `Auto cashed at ${auto.toFixed(2)}x`
                });
                return;
              }

              if (engine.current >= engine.final) {
                engine.running = false;
                if (engine.cashedOut) return;
                resolve({
                  multiplier: 0,
                  payout: 0,
                  status: `Crashed at ${engine.final.toFixed(2)}x`
                });
                return;
              }

              engine.animId = requestAnimationFrame(frame);
            };

            engine.animId = requestAnimationFrame(frame);

            engine.cashout = () => {
              if (!engine.running || engine.cashedOut) return;
              engine.cashedOut = true;
              engine.running = false;
              resolve({
                multiplier: engine.current,
                payout: bet * engine.current,
                status: `Cashed out at ${engine.current.toFixed(2)}x`
              });
            };
          });
        }
      };

      /* ---------------- PLINKO ---------------- */
      this.engines.plinko = {
        render: () => {
          const rows = parseInt($("plinkoRows")?.value || "11", 10);
          this.gameBox.innerHTML = `
            <div class="casino-center-wrap">
              <div class="plinko-board">
                <canvas id="plinkoCanvas" width="900" height="620" style="width:100%;height:100%;display:block;"></canvas>
              </div>
            </div>
          `;
          this.engines.plinko.drawBoard(rows);
        },

        drawBoard: (rows = 11, activeSlot = null) => {
          const canvas = $("plinkoCanvas");
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          const pegR = 6;
          const spacingX = 44;
          const spacingY = 36;
          const centerX = w / 2;
          const startY = 60;

          ctx.fillStyle = "rgba(255,255,255,.85)";
          for (let row = 0; row < rows; row++) {
            const count = row + 1;
            const rowWidth = (count - 1) * spacingX;
            const startX = centerX - rowWidth / 2;
            for (let i = 0; i < count; i++) {
              const x = startX + i * spacingX;
              const y = startY + row * spacingY;
              ctx.beginPath();
              ctx.arc(x, y, pegR, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          const slots = rows + 1;
          const slotW = 44;
          const totalW = slots * slotW;
          const slotStartX = centerX - totalW / 2;
          const slotY = startY + rows * spacingY + 24;

          for (let i = 0; i < slots; i++) {
            ctx.fillStyle = i === activeSlot ? "#29e3a2" : "rgba(255,255,255,.16)";
            ctx.fillRect(slotStartX + i * slotW, slotY, slotW - 4, 36);
          }
        },

        play: async (bet) => {
          const rows = parseInt($("plinkoRows")?.value || "11", 10);
          const risk = document.querySelector("[data-risk].active")?.dataset.risk || "medium";

          const canvas = $("plinkoCanvas");
          if (!canvas) return { multiplier: 0, payout: 0, status: "Canvas error" };
          const ctx = canvas.getContext("2d");
          const w = canvas.width;
          const h = canvas.height;

          const pegR = 6;
          const spacingX = 44;
          const spacingY = 36;
          const centerX = w / 2;
          const startY = 60;

          let path = [];
          let slotIndex = 0;
          let x = centerX;
          let y = 20;

          for (let row = 0; row < rows; row++) {
            const dir = chance(0.5) ? 1 : -1;
            x += dir * (spacingX / 2);
            y = startY + row * spacingY;
            path.push({ x, y });
            slotIndex += dir > 0 ? 1 : 0;
          }

          for (let i = 0; i < path.length; i++) {
            this.engines.plinko.drawBoard(rows);
            ctx.fillStyle = "#29e3a2";
            ctx.shadowBlur = 25;
            ctx.shadowColor = "rgba(41,227,162,.65)";
            ctx.beginPath();
            ctx.arc(path[i].x, path[i].y, pegR + 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            await sleep(85);
          }

          slotIndex = clamp(slotIndex, 0, rows);
          this.engines.plinko.drawBoard(rows, slotIndex);

          const center = rows / 2;
          const dist = Math.abs(slotIndex - center);

          let mult = 0.4;
          if (risk === "low") mult = Math.max(0.5, 2.2 - dist * 0.22);
          if (risk === "medium") mult = Math.max(0.4, 4.0 - dist * 0.42);
          if (risk === "high") mult = Math.max(0.2, 9.0 - dist * 0.9);

          mult = Number(mult.toFixed(2));

          return {
            multiplier: mult,
            payout: bet * mult,
            status: `${risk[0].toUpperCase() + risk.slice(1)} ${mult.toFixed(2)}x`
          };
        }
      };
    },

    renderEngine(gameId) {
      this.clearCanvasLoops();
      this.gameBox.innerHTML = "";
      if (this.engines[gameId]?.render) {
        this.engines[gameId].render();
      } else {
        this.gameBox.innerHTML = `
          <div class="casino-center-wrap">
            <div class="casino-engine-panel">
              <div style="font-size:1.2rem;font-weight:800;">No engine for ${escapeHtml(gameId)}</div>
            </div>
          </div>
        `;
      }
    },

    clearCanvasLoops() {
      if (this.engines.crash?.animId) cancelAnimationFrame(this.engines.crash.animId);
      if (this.engines.crash) {
        this.engines.crash.running = false;
        this.engines.crash.cashedOut = false;
      }
    },

    /* =========================================================
       PLAY CURRENT GAME
    ========================================================= */
    async playCurrentGame() {
      if (!this.currentGame || this.playing) return;

      const bet = this.getBet();
      if (bet <= 0) {
        this.flash("Invalid bet", false);
        return;
      }

      if (bet > this.balance) {
        this.flash("Insufficient balance", false);
        return;
      }

      const engine = this.engines[this.currentGame];
      if (!engine?.play) {
        this.flash("Game not ready", false);
        return;
      }

      const ok = this.debit(bet);
      if (!ok) {
        this.flash("Balance error", false);
        return;
      }

      this.playing = true;
      this.provablyFair.nonce++;
      this.renderProvablyFair();
      this.setMeta("State", "Playing", 2);

      try {
        const result = await engine.play(bet);

        if (result?.softFail) {
          this.credit(bet);
          this.playing = false;
          this.gameStatus.textContent = result.status || "Action required";
          this.flash(result.status || "Action required", false);
          this.setMeta("State", "Waiting", 2);
          return;
        }

        const payout = Number(result?.payout || 0);
        const multiplier = Number(result?.multiplier || 0);
        const status = result?.status || "Finished";

        if (payout > 0) this.credit(payout);

        this.gameStatus.textContent = status;
        this.gameMultiplier.textContent = `${fmt(multiplier)}x`;

        this.saveRound(
          this.games.find((g) => g.id === this.currentGame)?.name || this.currentGame,
          payout,
          multiplier,
          status
        );

        if (payout > bet * 1.5) {
          this.pushBigWin(this.games.find((g) => g.id === this.currentGame)?.name || this.currentGame, payout);
          this.pushTicker(`🔥 ${pick(["@alpha","@nova","@ghost","@king"])} won ${fmt(payout)} BX on ${this.gameTitle.textContent}`);
        }

        this.flash(
          payout > 0 ? `+${fmt(payout)} BX` : `-${fmt(bet)} BX`,
          payout > 0
        );

        this.setMeta("State", payout > 0 ? "Win" : "Lose", 2);
      } catch (err) {
        console.error(err);
        this.credit(bet);
        this.flash("Game error", false);
        this.setMeta("State", "Error", 2);
      }

      this.playing = false;
      this.updateAllUI();
    }
  };

  /* =========================================================
     GLOBAL EXPORT
  ========================================================= */
  window.CASINO = CASINO;

  /* =========================================================
     AUTO INIT
  ========================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    CASINO.init();
  });
})();
