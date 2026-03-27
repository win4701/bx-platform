/* =========================================================
   BLOXIO CASINO — UI SYNC FINAL
   Compatible with:
   - casino.html current structure
   - casino.css BC Compact FINAL
========================================================= */

(function () {
  "use strict";

  /* =========================================================
     HELPERS
  ========================================================= */
  const $ = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const fmt = (n, d = 2) => Number(n || 0).toFixed(d);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const rand = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function randomSeed(len = 24) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
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
     CASINO APP
  ========================================================= */
  const CASINO = {
    balance: 884.64,
    currentGame: null,
    playing: false,
    instantPlay: false,

    provablyFair: {
      serverSeed: randomSeed(28),
      clientSeed: "client_" + randomSeed(10),
      nonce: 0
    },

    state: {
      lastResult: null,
      coinChoice: "heads",
      hiloChoice: "high",
      birdsChoice: null,
      bananaChoice: null,
      hiloCard: 7,
      bj: null,
      tickerItems: [
        "🔥 @alpha won 24.50 BX on Crash",
        "🎯 Dice 98.11 hit by @ghost",
        "🟢 Limbo cashed at 6.44x",
        "🎰 Slot 7️⃣7️⃣7️⃣ paid 120 BX",
        "🪙 Coin Flip streak x5 live",
        "🟣 Plinko 14 rows Medium live",
        "🐦 Birds Party jackpot opened"
      ],
      bigWins: [
        { user: "@alpha", game: "Crash", amount: 24.5 },
        { user: "@king", game: "Dice", amount: 41.0 },
        { user: "@nova", game: "Plinko", amount: 88.75 },
        { user: "@mira", game: "Limbo", amount: 17.25 },
        { user: "@zen", game: "Slot", amount: 63.0 }
      ]
    },

    games: [
      { id: "coinflip", name: "Coin Flip", fair: true },
      { id: "banana", name: "Banana Farm", fair: false },
      { id: "limbo", name: "Limbo", fair: true },
      { id: "fruit", name: "Fruit Party", fair: false },
      { id: "dice", name: "Dice", fair: true },
      { id: "crash", name: "Crash", fair: true },
      { id: "slot", name: "Slot", fair: true },
      { id: "birds", name: "Birds Party", fair: false },
      { id: "blackjack", name: "Blackjack", fair: false },
      { id: "airboss", name: "Air Boss", fair: true },
      { id: "hilo", name: "HiLo", fair: true },
      { id: "plinko", name: "Plinko", fair: true }
    ],

    engines: {},

    init() {
      this.cache();
      this.bindStatic();
      this.normalizeLobbyCards();
      this.renderTicker();
      this.renderBigWins();
      this.updateAllUI();
      this.registerEngines();
      console.log("[CASINO] UI Sync FINAL loaded");
    },

    cache() {
      this.root = $("casino");

      // lobby
      this.grid = $("casinoGrid");
      this.bigWinsList = $("casinoBigWinsList");
      this.tickerTrack = $("casinoTickerTrack");

      // top stats
      this.balanceMini = $("casinoBalanceMini");
      this.statsBalance = $("casinoStatsBalance");
      this.statsGames = $("casinoStatsGames");
      this.statsMode = $("casinoStatsMode");

      // game shell
      this.gameShell = $("casinoGameShell");
      this.backBtn = $("casinoBackBtn");

      // meta
      this.gameTitle = $("casinoGameTitle");
      this.gameFair = $("casinoGameFair");
      this.gameBalance = $("casinoGameBalance");
      this.gameStatus = $("casinoGameStatus");
      this.gameMultiplier = $("casinoGameMultiplier");
      this.gameMeta = $("casinoGameMeta");

      // engine
      this.gameBox = $("casinoGameBox");

      // bet panel
      this.betInput = $("casinoBetInput");
      this.instantToggle = $("casinoInstantToggle");
      this.dynamicControls = $("casinoDynamicControls");
      this.playBtn = $("casinoPlayBtn");
      this.seedBtn = $("casinoSeedBtn");

      // side
      this.lastResult = $("casinoLastResult");
      this.pfBox = $("casinoProvablyFair");
    },

    bindStatic() {
      // lobby open
      $$(".game-card, #casino .game").forEach((card) => {
        card.addEventListener("click", () => {
          const gameId = card.dataset.game;
          if (gameId) this.openGame(gameId);
        });
      });

      // back
      this.backBtn?.addEventListener("click", () => this.closeGame());

      // play
      this.playBtn?.addEventListener("click", () => this.playCurrentGame());

      // new seed
      this.seedBtn?.addEventListener("click", () => this.newSeed());

      // instant
      this.instantToggle?.addEventListener("click", () => {
        this.instantPlay = !this.instantPlay;
        this.instantToggle.classList.toggle("active", this.instantPlay);
        this.instantToggle.textContent = this.instantPlay ? "Instant Play ON" : "Instant Play";
        this.setMeta(0, "Mode", this.instantPlay ? "Instant" : "Standard");
        this.updateAllUI();
      });

      // bet input
      this.betInput?.addEventListener("input", () => {
        this.setMeta(1, "Bet", `${fmt(this.getBet())} BX`);
      });

      // quick bet buttons
      $$("[data-bet-action]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.dataset.betAction;
          this.handleBetAction(action);
        });
      });
    },

    normalizeLobbyCards() {
      $$(".game-card, #casino .game").forEach((card) => {
        const gameId = card.dataset.game;
        const game = this.games.find((g) => g.id === gameId);
        if (!game) return;

        const span = card.querySelector("span");
        if (span && !span.textContent.trim()) span.textContent = game.name;

        const img = card.querySelector("img");
        if (img) {
          img.loading = "lazy";
          img.onerror = function () {
            this.onerror = null;
            this.src = "assets/images/fallback.png";
          };
        }
      });
    },

    updateAllUI() {
      if (this.balanceMini) this.balanceMini.textContent = fmt(this.balance);
      if (this.gameBalance) this.gameBalance.textContent = fmt(this.balance);
      if (this.statsBalance) this.statsBalance.textContent = `${fmt(this.balance)} BX`;
      if (this.statsGames) this.statsGames.textContent = `${this.games.length} Games`;
      if (this.statsMode) this.statsMode.textContent = this.instantPlay ? "Instant" : "Standard";
    },

    /* =========================================================
       LOBBY SIDE DATA
    ========================================================= */
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

    /* =========================================================
       GAME OPEN / CLOSE
    ========================================================= */
    openGame(gameId) {
      const game = this.games.find((g) => g.id === gameId);
      if (!game) return;

      this.currentGame = gameId;
      this.playing = false;

      // active card
      $$(".game-card, #casino .game").forEach((c) => c.classList.remove("active"));
      document.querySelector(`[data-game="${gameId}"]`)?.classList.add("active");

      // lobby compact hide
      this.grid?.classList.add("hide");

      // show shell
      if (this.gameShell) this.gameShell.classList.remove("is-hidden");

      // fill top
      if (this.gameTitle) this.gameTitle.textContent = game.name;
      if (this.gameFair) this.gameFair.textContent = game.fair ? "PROVABLY FAIR" : "INSTANT PLAY";
      if (this.gameStatus) this.gameStatus.textContent = this.defaultStatus(gameId);
      if (this.gameMultiplier) this.gameMultiplier.textContent = "1.00x";

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
      this.clearLoops();

      if (this.gameShell) this.gameShell.classList.add("is-hidden");
      this.grid?.classList.remove("hide");

      $$(".game-card, #casino .game").forEach((c) => c.classList.remove("active"));
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
      if (!this.gameMeta) return;
      this.gameMeta.innerHTML = `
        <div class="casino-meta-pill"><span>Mode</span><strong>${this.instantPlay ? "Instant" : "Standard"}</strong></div>
        <div class="casino-meta-pill"><span>Bet</span><strong>${fmt(this.getBet())} BX</strong></div>
        <div class="casino-meta-pill"><span>State</span><strong>Idle</strong></div>
        <div class="casino-meta-pill"><span>Game</span><strong>${escapeHtml(this.currentGame || "-")}</strong></div>
      `;
    },

    setMeta(index, label, value) {
      const pills = this.gameMeta?.querySelectorAll(".casino-meta-pill");
      if (!pills || !pills[index]) return;
      pills[index].innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
    },

    renderLastResult(data = null) {
      if (!this.lastResult) return;

      const result = data || this.state.lastResult || {
        game: this.currentGame || "-",
        payout: "—",
        multiplier: "—",
        status: "No round yet"
      };

      this.lastResult.innerHTML = `
        <h5>Last Result</h5>
        <div class="last-result-row"><span>Game</span><strong>${escapeHtml(String(result.game))}</strong></div>
        <div class="last-result-row"><span>Payout</span><strong>${escapeHtml(String(result.payout))}</strong></div>
        <div class="last-result-row"><span>Multiplier</span><strong>${escapeHtml(String(result.multiplier))}</strong></div>
        <div class="last-result-row"><span>Status</span><strong>${escapeHtml(String(result.status))}</strong></div>
      `;
    },

    renderProvablyFair() {
      if (!this.pfBox) return;
      const fair = this.games.find((g) => g.id === this.currentGame)?.fair;

      this.pfBox.innerHTML = `
        <h5>Provably Fair</h5>
        <div class="pf-row"><span>Mode</span><strong>${fair ? "ACTIVE" : "SIMULATED"}</strong></div>
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
      this.toast("New seed generated", true);
    },

    toast(text, ok = true) {
      const existing = document.querySelector(".casino-ui-toast");
      if (existing) existing.remove();

      const div = document.createElement("div");
      div.className = "casino-ui-toast";
      div.textContent = text;
      div.style.position = "fixed";
      div.style.left = "50%";
      div.style.bottom = "92px";
      div.style.transform = "translateX(-50%)";
      div.style.zIndex = "9999";
      div.style.padding = "14px 18px";
      div.style.borderRadius = "18px";
      div.style.fontWeight = "900";
      div.style.fontSize = ".95rem";
      div.style.color = ok ? "#07111f" : "#fff";
      div.style.background = ok ? "linear-gradient(135deg,#2be4b1,#47e6c3)" : "linear-gradient(135deg,#ff5d72,#ff7a88)";
      div.style.boxShadow = "0 16px 40px rgba(0,0,0,.35)";
      div.style.opacity = "0";
      div.style.transition = ".25s ease";
      document.body.appendChild(div);

      requestAnimationFrame(() => {
        div.style.opacity = "1";
        div.style.transform = "translateX(-50%) translateY(-6px)";
      });

      setTimeout(() => {
        div.style.opacity = "0";
        div.style.transform = "translateX(-50%) translateY(0)";
        setTimeout(() => div.remove(), 240);
      }, 1800);
    },

    /* =========================================================
       BET
    ========================================================= */
    getBet() {
      return clamp(parseFloat(this.betInput?.value || 10), 0.01, Math.max(this.balance, 0.01));
    },

    setBet(v) {
      const val = clamp(Number(v || 0), 0.01, Math.max(this.balance, 0.01));
      if (this.betInput) this.betInput.value = fmt(val);
      this.setMeta(1, "Bet", `${fmt(val)} BX`);
    },

    handleBetAction(action) {
      switch (action) {
        case "half":
          this.setBet(this.getBet() / 2);
          break;
        case "double":
          this.setBet(this.getBet() * 2);
          break;
        case "ten":
          this.setBet(this.balance * 0.10);
          break;
        case "twentyfive":
          this.setBet(this.balance * 0.25);
          break;
        case "fifty":
          this.setBet(this.balance * 0.50);
          break;
        case "max":
          this.setBet(this.balance);
          break;
      }
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
            <div class="casino-segmented">
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
            <div class="casino-segmented two" style="margin-top:12px">
              <button id="crashStartRound">Start Round</button>
              <button id="crashCashoutBtn">Cashout</button>
            </div>
          </div>
        `,
        dice: `
          <div class="casino-control-box">
            <h5>Dice Mode</h5>
            <div class="casino-segmented two" id="diceMode">
              <button data-dice-mode="over">Roll Over</button>
              <button class="active" data-dice-mode="under">Roll Under</button>
            </div>
            <div style="margin-top:14px">
              <label>Target Number</label>
              <input id="diceTarget" type="range" min="2" max="98" value="11" />
              <div style="margin-top:10px;font-weight:900;color:var(--casino-muted);">
                Target: <span id="diceTargetValue">11</span>
              </div>
            </div>
          </div>
        `,
        limbo: `
          <div class="casino-control-box">
            <h5>Target Multiplier</h5>
            <input id="limboTarget" type="number" min="1.01" step="0.01" value="2.00" />
          </div>
        `,
        plinko: `
          <div class="casino-control-box">
            <h5>Plinko Risk</h5>
            <div class="casino-segmented" id="plinkoRisk">
              <button data-risk="low">Low</button>
              <button class="active" data-risk="medium">Medium</button>
              <button data-risk="high">High</button>
            </div>
            <div style="margin-top:14px">
              <label>Rows</label>
              <input id="plinkoRows" type="range" min="8" max="16" value="11" />
              <div style="margin-top:10px;font-weight:900;color:var(--casino-muted);">
                Rows: <span id="plinkoRowsValue">11</span>
              </div>
            </div>
          </div>
        `,
        blackjack: `
          <div class="casino-control-box">
            <h5>Blackjack Controls</h5>
            <div class="casino-segmented two">
              <button id="bjHitBtn">Hit</button>
              <button id="bjStandBtn">Stand</button>
            </div>
          </div>
        `,
        birds: `
          <div class="casino-control-box">
            <h5>Birds Party</h5>
            <div style="color:var(--casino-muted);font-weight:900;">Pick one bird and press Play.</div>
          </div>
        `,
        hilo: `
          <div class="casino-control-box">
            <h5>Choose Direction</h5>
            <div class="casino-segmented two">
              <button id="hiloHighBtn">High</button>
              <button id="hiloLowBtn">Low</button>
            </div>
          </div>
        `,
        coinflip: `
          <div class="casino-control-box">
            <h5>Choose Side</h5>
            <div class="casino-segmented two">
              <button id="coinHeadsBtn">Heads</button>
              <button id="coinTailsBtn">Tails</button>
            </div>
          </div>
        `,
        airboss: `
          <div class="casino-control-box">
            <h5>Takeoff Target</h5>
            <input id="airbossTarget" type="number" min="1.10" step="0.10" value="2.50" />
          </div>
        `,
        banana: `
          <div class="casino-control-box">
            <h5>Banana Farm</h5>
            <div style="color:var(--casino-muted);font-weight:900;">Pick one crate and press Play.</div>
          </div>
        `,
        fruit: `
          <div class="casino-control-box">
            <h5>Fruit Party</h5>
            <div style="color:var(--casino-muted);font-weight:900;">Reveal fruit cluster bonus.</div>
          </div>
        `
      };

      this.dynamicControls.innerHTML = controls[gameId] || "";
      this.bindDynamicHooks(gameId);
    },

    bindDynamicHooks(gameId) {
      if (gameId === "dice") {
        const target = $("diceTarget");
        const targetValue = $("diceTargetValue");
        target?.addEventListener("input", () => {
          targetValue.textContent = target.value;
          this.paintRange(target);
        });
        this.paintRange(target);

        $$("[data-dice-mode]").forEach((btn) => {
          btn.addEventListener("click", () => {
            $$("[data-dice-mode]").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
          });
        });
      }

      if (gameId === "plinko") {
        const rows = $("plinkoRows");
        const rowsValue = $("plinkoRowsValue");
        rows?.addEventListener("input", () => {
          rowsValue.textContent = rows.value;
          this.paintRange(rows);
          this.renderEngine("plinko");
        });
        this.paintRange(rows);

        $$("[data-risk]").forEach((btn) => {
          btn.addEventListener("click", () => {
            $$("[data-risk]").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
          });
        });
      }

      if (gameId === "coinflip") {
        $("coinHeadsBtn")?.addEventListener("click", (e) => {
          this.state.coinChoice = "heads";
          this.toggleChoiceUI(e.currentTarget, "#coinHeadsBtn, #coinTailsBtn");
        });
        $("coinTailsBtn")?.addEventListener("click", (e) => {
          this.state.coinChoice = "tails";
          this.toggleChoiceUI(e.currentTarget, "#coinHeadsBtn, #coinTailsBtn");
        });
      }

      if (gameId === "hilo") {
        $("hiloHighBtn")?.addEventListener("click", (e) => {
          this.state.hiloChoice = "high";
          this.toggleChoiceUI(e.currentTarget, "#hiloHighBtn, #hiloLowBtn");
        });
        $("hiloLowBtn")?.addEventListener("click", (e) => {
          this.state.hiloChoice = "low";
          this.toggleChoiceUI(e.currentTarget, "#hiloHighBtn, #hiloLowBtn");
        });
      }

      if (gameId === "blackjack") {
        $("bjHitBtn")?.addEventListener("click", () => this.toast("Use Play to resolve round", true));
        $("bjStandBtn")?.addEventListener("click", () => this.toast("Use Play to resolve round", true));
      }

      if (gameId === "crash") {
        $("crashStartRound")?.addEventListener("click", () => this.playCurrentGame());
        $("crashCashoutBtn")?.addEventListener("click", () => {
          if (this.engines.crash?.cashout) this.engines.crash.cashout();
        });
      }
    },

    toggleChoiceUI(activeBtn, selector) {
      $$(selector).forEach((b) => b.classList.remove("active"));
      activeBtn.classList.add("active");
    },

    paintRange(el) {
      if (!el) return;
      const min = Number(el.min || 0);
      const max = Number(el.max || 100);
      const val = Number(el.value || 0);
      const percent = ((val - min) / (max - min)) * 100;
      el.style.background = `linear-gradient(90deg, #1d7cff 0%, #1d7cff ${percent}%, #ffffff ${percent}%, #ffffff 100%)`;
    },

    /* =========================================================
       ENGINES
    ========================================================= */
    registerEngines() {
      /* ---------------- SLOT ---------------- */
      this.engines.slot = {
        render: () => {
          this.gameBox.innerHTML = `
            <div class="slot-reels" id="slotReels">
              <div class="slot-reel">🍒</div>
              <div class="slot-reel">🍋</div>
              <div class="slot-reel">7️⃣</div>
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

          return { multiplier: mult, payout: bet * mult, status: mult > 0 ? "Win" : "No match" };
        }
      };

      /* ---------------- DICE ---------------- */
      this.engines.dice = {
        render: () => {
          this.gameBox.innerHTML = `
            <div style="min-height:240px;display:grid;place-items:center;text-align:center;">
              <div>
                <div style="font-size:1rem;color:var(--casino-muted);font-weight:900;margin-bottom:10px;">Provably Fair Dice</div>
                <div id="diceResultNum" style="font-size:4.6rem;font-weight:950;">--</div>
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
            <div style="min-height:240px;display:grid;place-items:center;text-align:center;">
              <div>
                <div style="font-size:1rem;color:var(--casino-muted);font-weight:900;margin-bottom:10px;">Limbo Reveal</div>
                <div id="limboResult" style="font-size:4.6rem;font-weight:950;color:var(--casino-green);">1.00x</div>
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
            <div style="min-height:240px;display:grid;place-items:center;text-align:center;">
              <div>
                <div id="coinDisc" style="
                  width:160px;height:160px;border-radius:50%;
                  background:linear-gradient(135deg,#f8d24a,#ffb700);
                  display:flex;align-items:center;justify-content:center;
                  font-size:2rem;font-weight:950;color:#111;
                  box-shadow:0 20px 50px rgba(0,0,0,.25);
                  transition:transform .9s ease;
                  margin:0 auto 14px;
                ">🪙</div>
                <div id="coinResultLabel" style="font-size:1.2rem;font-weight:950;">Heads / Tails</div>
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
            <div style="min-height:240px;display:grid;place-items:center;text-align:center;">
              <div>
                <div style="font-size:1rem;color:var(--casino-muted);font-weight:900;margin-bottom:10px;">Current Card</div>
                <div id="hiloCard" style="
                  width:170px;height:220px;border-radius:24px;
                  background:linear-gradient(180deg,#ffffff,#dfe8ff);
                  color:#111;display:flex;align-items:center;justify-content:center;
                  font-size:4rem;font-weight:950;
                  box-shadow:0 20px 50px rgba(0,0,0,.25);
                  margin:0 auto;
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
            <div class="bird-row">
              <button class="bird-pick" data-bird="0">🐦</button>
              <button class="bird-pick" data-bird="1">🦜</button>
              <button class="bird-pick" data-bird="2">🦅</button>
            </div>
          `;
          $$("[data-bird]").forEach((b) => {
            b.addEventListener("click", () => {
              $$("[data-bird]").forEach((x) => x.classList.remove("active"));
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
          $$("[data-bird]").forEach((b, i) => {
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
            <div class="blackjack-board">
              <div class="bj-hand">
                <div class="label">Dealer</div>
                <div class="value" id="bjDealer">${d}</div>
              </div>
              <div class="bj-hand">
                <div class="label">Player</div>
                <div class="value" id="bjPlayer">${p}</div>
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
            <div class="bird-row">
              <button class="bird-pick" data-banana="0">🍌</button>
              <button class="bird-pick" data-banana="1">📦</button>
              <button class="bird-pick" data-banana="2">🍌</button>
            </div>
          `;
          $$("[data-banana]").forEach((b) => {
            b.addEventListener("click", () => {
              $$("[data-banana]").forEach((x) => x.classList.remove("active"));
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
            <div style="min-height:240px;display:grid;place-items:center;text-align:center;font-size:4.8rem;">🍓 🍇 🍉</div>
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
            <div style="min-height:240px;display:grid;place-items:center;text-align:center;">
              <div>
                <div style="font-size:5rem;">✈️</div>
                <div id="airbossResult" style="font-size:3rem;font-weight:950;color:var(--casino-green);">1.00x</div>
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
            <div class="crash-graph" style="width:100%;height:100%;">
              <canvas id="crashCanvas" width="900" height="500" style="width:100%;height:100%;display:block;"></canvas>
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
          this.setMeta(2, "State", "Live");

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

              points.push({
                x: Math.min(w - 30, 40 + t * 110),
                y: h - (40 + Math.min(h - 80, (engine.current - 1) * 55))
              });

              ctx.clearRect(0, 0, w, h);
              engine.drawStatic();

              ctx.strokeStyle = "#29e3a2";
              ctx.lineWidth = 6;
              ctx.beginPath();
              points.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
              });
              ctx.stroke();

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
            <div class="plinko-board" style="width:100%;height:100%;">
              <canvas id="plinkoCanvas" width="900" height="620" style="width:100%;height:100%;display:block;"></canvas>
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
      this.clearLoops();
      this.gameBox.innerHTML = "";
      if (this.engines[gameId]?.render) {
        this.engines[gameId].render();
      } else {
        this.gameBox.innerHTML = `
          <div style="min-height:240px;display:grid;place-items:center;text-align:center;">
            <div style="font-size:1.1rem;font-weight:900;">No engine for ${escapeHtml(gameId)}</div>
          </div>
        `;
      }
    },

    clearLoops() {
      if (this.engines.crash?.animId) cancelAnimationFrame(this.engines.crash.animId);
      if (this.engines.crash) {
        this.engines.crash.running = false;
        this.engines.crash.cashedOut = false;
      }
    },

    /* =========================================================
       PLAY
    ========================================================= */
    async playCurrentGame() {
      if (!this.currentGame || this.playing) return;

      const bet = this.getBet();
      if (bet <= 0) {
        this.toast("Invalid bet", false);
        return;
      }

      if (bet > this.balance) {
        this.toast("Insufficient balance", false);
        return;
      }

      const engine = this.engines[this.currentGame];
      if (!engine?.play) {
        this.toast("Game not ready", false);
        return;
      }

      const ok = this.debit(bet);
      if (!ok) {
        this.toast("Balance error", false);
        return;
      }

      this.playing = true;
      this.provablyFair.nonce++;
      this.renderProvablyFair();
      this.setMeta(2, "State", "Playing");

      try {
        const result = await engine.play(bet);

        if (result?.softFail) {
          this.credit(bet);
          this.playing = false;
          this.gameStatus.textContent = result.status || "Action required";
          this.toast(result.status || "Action required", false);
          this.setMeta(2, "State", "Waiting");
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
          const gameName = this.games.find((g) => g.id === this.currentGame)?.name || this.currentGame;
          this.pushBigWin(gameName, payout);
          this.pushTicker(`🔥 ${pick(["@alpha","@nova","@ghost","@king"])} won ${fmt(payout)} BX on ${gameName}`);
        }

        this.toast(
          payout > 0 ? `+${fmt(payout)} BX` : `-${fmt(bet)} BX`,
          payout > 0
        );

        this.setMeta(2, "State", payout > 0 ? "Win" : "Lose");
      } catch (err) {
        console.error(err);
        this.credit(bet);
        this.toast("Game error", false);
        this.setMeta(2, "State", "Error");
      }

      this.playing = false;
      this.updateAllUI();
    }
  };

  /* =========================================================
     EXPORT
  ========================================================= */
  window.CASINO = CASINO;

  /* =========================================================
     INIT
  ========================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    CASINO.init();
  });
})();
