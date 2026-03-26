/* =========================================================
   BX CASINO — REAL ENGINES FINAL
   Crash + Dice + Plinko + Slot
   Lobby / Game Screen / Provably Fair / Big Wins / Ticker
========================================================= */

(() => {
  "use strict";

  const CASINO = {
    state: {
      currentGame: null,
      balance: 250.00,
      bet: 0,

      nonce: 0,
      clientSeed: "client_" + Math.random().toString(36).slice(2),
      serverSeed: "server_" + Math.random().toString(36).slice(2),

      crash: {
        running: false,
        crashed: false,
        multiplier: 1.00,
        target: 2.35,
        raf: null,
        hasBet: false,
        cashedOut: false
      },

      dice: {
        rollOver: true,
        target: 50,
        lastRoll: null
      },

      plinko: {
        rows: 8,
        risk: "medium",
        dropping: false
      },

      slot: {
        spinning: false,
        reels: ["🍒", "🍋", "7️⃣"],
        symbols: ["🍒", "🍋", "🍇", "⭐", "7️⃣", "💎"]
      }
    },

    els: {},

    /* =========================================================
       INIT
    ========================================================= */
    init() {
      this.cacheDOM();
      if (!this.els.lobby || !this.els.gameScreen) return;

      this.bindGlobal();
      this.updateBalanceUI();
      this.updateSeedsUI();
      this.renderBigWins();
      this.startTicker();

      console.log("🎰 CASINO REAL ENGINES READY");
    },

    cacheDOM() {
      const $ = (id) => document.getElementById(id);

      this.els.lobby = $("casinoLobby");
      this.els.gameScreen = $("casinoGameScreen");
      this.els.grid = $("casinoGrid");

      this.els.gameTitle = $("casinoGameTitle");
      this.els.gameMode = $("casinoGameMode");
      this.els.gameBox = $("casinoGameBox");

      this.els.backBtn = $("casinoBackBtn");
      this.els.playBtn = $("casinoPlayBtn");
      this.els.seedBtn = $("casinoSeedBtn");

      this.els.betInput = $("casinoBetAmount");
      this.els.dynamicControls = $("casinoDynamicControls");

      this.els.balanceMini = $("casinoBalance");
      this.els.balanceGame = $("casinoGameBalance");

      this.els.status = $("casinoGameStatus");
      this.els.multiplier = $("casinoGameMultiplier");

      this.els.serverSeed = $("serverSeedHash");
      this.els.clientSeed = $("clientSeedValue");
      this.els.nonce = $("nonceValue");

      this.els.bigWins = $("bigWinsList");
      this.els.ticker = $("casinoTicker");
    },

    bindGlobal() {
      // open game
      this.els.grid?.addEventListener("click", (e) => {
        const card = e.target.closest(".game-card");
        if (!card) return;
        const game = card.dataset.game;
        this.open(game);
      });

      // close game
      this.els.backBtn?.addEventListener("click", () => this.close());

      // play
      this.els.playBtn?.addEventListener("click", () => this.play());

      // seed reset
      this.els.seedBtn?.addEventListener("click", () => this.newSeed());

      // quick bet buttons (delegation)
      document.addEventListener("click", (e) => {
        const btn = e.target.closest(".bet-quick-btn");
        if (!btn) return;
        this.handleQuickBet(btn);
      });

      // dynamic controls delegation
      document.addEventListener("click", (e) => {
        const action = e.target.closest("[data-casino-action]");
        if (!action) return;

        const type = action.dataset.casinoAction;
        this.handleDynamicAction(type, action);
      });

      document.addEventListener("change", (e) => {
        const el = e.target;
        if (!el.matches("[data-casino-input]")) return;
        this.handleDynamicInput(el.dataset.casinoInput, el.value, el);
      });
    },

    /* =========================================================
       NAVIGATION
    ========================================================= */
    open(game) {
      this.state.currentGame = game;

      this.stopAllEngines();

      this.els.lobby.style.display = "none";
      this.els.gameScreen.style.display = "block";

      this.els.gameTitle.textContent = this.prettyGameName(game);
      this.els.gameMode.textContent = this.getGameMode(game);
      this.els.status.textContent = "Waiting...";
      this.els.multiplier.textContent = "1.00x";

      this.els.betInput.value = "";
      this.els.dynamicControls.innerHTML = "";
      this.els.gameBox.innerHTML = "";

      this.renderGame(game);
      this.updateBalanceUI();
      this.updateSeedsUI();
    },

    close() {
      this.stopAllEngines();

      this.els.gameScreen.style.display = "none";
      this.els.lobby.style.display = "block";

      this.els.gameBox.innerHTML = "";
      this.els.dynamicControls.innerHTML = "";

      this.state.currentGame = null;
    },

    stopAllEngines() {
      // stop crash
      if (this.state.crash.raf) {
        cancelAnimationFrame(this.state.crash.raf);
        this.state.crash.raf = null;
      }
      this.state.crash.running = false;
      this.state.crash.crashed = false;
      this.state.crash.hasBet = false;
      this.state.crash.cashedOut = false;

      this.state.plinko.dropping = false;
      this.state.slot.spinning = false;
    },

    prettyGameName(game) {
      const names = {
        coinflip: "Coin Flip",
        banana_farm: "Banana Farm",
        limbo: "Limbo",
        fruit_party: "Fruit Party",
        dice: "Dice",
        crash: "Crash",
        slot: "Slot",
        birds_party: "Birds Party",
        blackjack_fast: "Blackjack",
        airboss: "AirBoss",
        hilo: "HiLo",
        plinko: "Plinko"
      };
      return names[game] || game;
    },

    getGameMode(game) {
      if (["crash", "dice", "plinko", "slot", "coinflip", "limbo"].includes(game)) {
        return "Provably Fair";
      }
      return "Instant Play";
    },

    /* =========================================================
       GAME RENDER
    ========================================================= */
    renderGame(game) {
   switch (game) {
    case "crash":
      this.renderCrash();
      break;

    case "dice":
      this.renderDice();
      break;

    case "plinko":
      this.renderPlinko();
      break;

    case "slot":
      this.renderSlot();
      break;

    case "coinflip":
      this.renderCoinflip();
      break;

    case "limbo":
      this.renderLimbo();
      break;

    case "hilo":
      this.renderHilo();
      break;

    case "blackjack_fast":
      this.renderBlackjack();
      break;

    case "airboss":
      this.renderAirBoss();
      break;

    case "banana_farm":
      this.renderBananaFarm();
      break;

    case "birds_party":
      this.renderBirdsParty();
      break;

    case "fruit_party":
      this.renderFruitParty();
      break;

    default:
      this.renderComingSoon(game);
   }
      },

    renderComingSoon(game) {
      this.els.gameBox.innerHTML = `
        <div class="game-placeholder">
          <div style="font-size:52px;margin-bottom:10px;">🎮</div>
          <h3 style="margin:0 0 8px;">${this.prettyGameName(game)}</h3>
          <p style="opacity:.8;margin:0;">Engine ready for expansion</p>
        </div>
      `;

      this.els.dynamicControls.innerHTML = `
        <div class="game-info-box">
          <div><strong>Mode:</strong> ${this.getGameMode(game)}</div>
          <div><strong>Status:</strong> Ready</div>
        </div>
      `;
    },

    /* =========================================================
       CRASH
    ========================================================= */
    renderCrash() {
      this.els.gameBox.innerHTML = `
        <div class="crash-wrap">
          <canvas id="crashCanvas" style="width:100%;height:260px;display:block;border-radius:18px;background:#08111b;"></canvas>
        </div>
      `;

      this.els.dynamicControls.innerHTML = `
        <div class="game-info-box">
          <div><strong>Auto Cashout</strong></div>
          <input
            data-casino-input="crashAutoCashout"
            type="number"
            min="1.01"
            step="0.01"
            value="2.00"
            placeholder="2.00"
            style="width:100%;margin-top:10px;"
          >
          <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button class="bet-quick-btn" data-casino-action="crashStart" type="button">Start Round</button>
            <button class="bet-quick-btn" data-casino-action="crashCashout" type="button">Cashout</button>
          </div>
        </div>
      `;

      this.state.crash.autoCashout = 2.00;
      this.drawCrashBase();
    },

    drawCrashBase() {
      const canvas = document.getElementById("crashCanvas");
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const w = canvas.width = Math.max(320, canvas.offsetWidth);
      const h = canvas.height = 260;

      ctx.clearRect(0, 0, w, h);

      // bg
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#07101a");
      g.addColorStop(1, "#091524");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // grid
      ctx.strokeStyle = "rgba(255,255,255,.06)";
      ctx.lineWidth = 1;

      for (let i = 0; i < 6; i++) {
        const y = (h / 6) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      for (let i = 0; i < 8; i++) {
        const x = (w / 8) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.font = "bold 14px system-ui";
      ctx.fillText("BX Crash Engine", 16, 24);
    },

    startCrashRound() {
      if (this.state.crash.running) return;

      const bet = this.getBet();
      if (!bet) return;

      this.state.crash.hasBet = true;
      this.state.crash.cashedOut = false;
      this.state.crash.multiplier = 1.00;
      this.state.crash.running = true;
      this.state.crash.crashed = false;

      // target crash
      this.state.crash.target = this.randomCrashTarget();

      this.balanceSubtract(bet);
      this.els.status.textContent = "Flying...";
      this.sound("click");

      const canvas = document.getElementById("crashCanvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      const w = canvas.width = Math.max(320, canvas.offsetWidth);
      const h = canvas.height = 260;

      let t = 0;

      const loop = () => {
        if (!this.state.crash.running) return;

        t += 0.018;
        this.state.crash.multiplier = +(1 + Math.pow(t, 1.42)).toFixed(2);

        this.els.multiplier.textContent = this.state.crash.multiplier.toFixed(2) + "x";

        ctx.clearRect(0, 0, w, h);
        this.drawCrashBase();

        const x = Math.min(w - 20, 25 + t * 95);
        const y = Math.max(20, h - 20 - Math.pow(t, 1.85) * 35);

        // curve
        ctx.beginPath();
        ctx.moveTo(25, h - 20);
        for (let i = 0; i <= x - 25; i++) {
          const px = 25 + i;
          const tt = i / 95;
          const py = Math.max(20, h - 20 - Math.pow(tt, 1.85) * 35);
          ctx.lineTo(px, py);
        }
        ctx.strokeStyle = "#25d998";
        ctx.lineWidth = 3;
        ctx.stroke();

        // glow point
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#25d998";
        ctx.shadowColor = "#25d998";
        ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;

        // auto cashout
        if (
          this.state.crash.hasBet &&
          !this.state.crash.cashedOut &&
          this.state.crash.multiplier >= (this.state.crash.autoCashout || 2.00)
        ) {
          this.crashCashout();
        }

        // crash event
        if (this.state.crash.multiplier >= this.state.crash.target) {
          this.state.crash.running = false;
          this.state.crash.crashed = true;
          this.els.status.textContent = `Crashed @ ${this.state.crash.target.toFixed(2)}x`;

          if (!this.state.crash.cashedOut && this.state.crash.hasBet) {
            this.sound("lose");
          }

          this.state.crash.hasBet = false;
          this.state.nonce++;
          this.updateSeedsUI();
          return;
        }

        this.state.crash.raf = requestAnimationFrame(loop);
      };

      loop();
    },

    crashCashout() {
      if (!this.state.crash.running) return;
      if (!this.state.crash.hasBet) return;
      if (this.state.crash.cashedOut) return;

      const payout = this.state.bet * this.state.crash.multiplier;
      this.state.crash.cashedOut = true;
      this.state.crash.hasBet = false;

      this.balanceAdd(payout);
      this.els.status.textContent = `Cashed out @ ${this.state.crash.multiplier.toFixed(2)}x`;

      this.addBigWin(payout, "crash");
      this.sound("win");
    },

    randomCrashTarget() {
      // شبه realistic
      const r = Math.random();
      if (r < 0.40) return +(1.10 + Math.random() * 1.2).toFixed(2);
      if (r < 0.75) return +(2.00 + Math.random() * 2.5).toFixed(2);
      if (r < 0.93) return +(4.50 + Math.random() * 5.5).toFixed(2);
      return +(10 + Math.random() * 20).toFixed(2);
    },

    /* =========================================================
       DICE
    ========================================================= */
    renderDice() {
      this.els.gameBox.innerHTML = `
        <div class="dice-wrap" style="display:flex;align-items:center;justify-content:center;height:240px;">
          <div id="diceResultBox" style="font-size:64px;font-weight:1000;color:#f8fafc;">--</div>
        </div>
      `;

      this.els.dynamicControls.innerHTML = `
        <div class="game-info-box">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button class="bet-quick-btn active" data-casino-action="diceModeOver" type="button">Roll Over</button>
            <button class="bet-quick-btn" data-casino-action="diceModeUnder" type="button">Roll Under</button>
          </div>

          <div style="margin-top:14px;">
            <label style="display:block;margin-bottom:8px;font-weight:700;">Target Number</label>
            <input
              data-casino-input="diceTarget"
              type="range"
              min="2"
              max="98"
              value="50"
              style="width:100%;"
            >
            <div style="margin-top:8px;font-weight:800;">Target: <span id="diceTargetValue">50</span></div>
          </div>
        </div>
      `;

      this.state.dice.rollOver = true;
      this.state.dice.target = 50;
      this.els.status.textContent = "Ready to roll";
      this.els.multiplier.textContent = this.getDiceMultiplier().toFixed(2) + "x";
    },

    playDice() {
      const bet = this.getBet();
      if (!bet) return;

      const roll = this.provablyFairNumber(1, 100);
      this.state.dice.lastRoll = roll;

      const win = this.state.dice.rollOver
        ? roll > this.state.dice.target
        : roll < this.state.dice.target;

      this.balanceSubtract(bet);

      const resultBox = document.getElementById("diceResultBox");
      if (resultBox) {
        resultBox.textContent = roll;
        resultBox.style.color = win ? "#25d998" : "#ff6d84";
      }

      if (win) {
        const payout = bet * this.getDiceMultiplier();
        this.balanceAdd(payout);
        this.els.status.textContent = `Win! Rolled ${roll}`;
        this.addBigWin(payout, "dice");
        this.sound("win");
      } else {
        this.els.status.textContent = `Lost! Rolled ${roll}`;
        this.sound("lose");
      }

      this.els.multiplier.textContent = this.getDiceMultiplier().toFixed(2) + "x";
      this.state.nonce++;
      this.updateSeedsUI();
    },

    getDiceMultiplier() {
      const chance = this.state.dice.rollOver
        ? (100 - this.state.dice.target)
        : this.state.dice.target;

      return +(99 / Math.max(2, chance)).toFixed(2);
    },

    /* =========================================================
       PLINKO
    ========================================================= */
    renderPlinko() {
      this.els.gameBox.innerHTML = `
        <div class="plinko-wrap" style="padding:10px;">
          <canvas id="plinkoCanvas" style="width:100%;height:260px;display:block;border-radius:18px;background:#08111b;"></canvas>
        </div>
      `;

      this.els.dynamicControls.innerHTML = `
        <div class="game-info-box">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
            <button class="bet-quick-btn" data-casino-action="plinkoRiskLow" type="button">Low</button>
            <button class="bet-quick-btn active" data-casino-action="plinkoRiskMedium" type="button">Medium</button>
            <button class="bet-quick-btn" data-casino-action="plinkoRiskHigh" type="button">High</button>
          </div>

          <div style="margin-top:14px;">
            <label style="display:block;margin-bottom:8px;font-weight:700;">Rows</label>
            <input
              data-casino-input="plinkoRows"
              type="range"
              min="8"
              max="12"
              value="8"
              style="width:100%;"
            >
            <div style="margin-top:8px;font-weight:800;">Rows: <span id="plinkoRowsValue">8</span></div>
          </div>
        </div>
      `;

      this.drawPlinkoBoard();
      this.els.status.textContent = "Drop a ball";
      this.els.multiplier.textContent = "1.00x";
    },

    drawPlinkoBoard(ball = null) {
      const canvas = document.getElementById("plinkoCanvas");
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      const w = canvas.width = Math.max(320, canvas.offsetWidth);
      const h = canvas.height = 260;

      ctx.clearRect(0, 0, w, h);

      // bg
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#07101a");
      g.addColorStop(1, "#091524");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const rows = this.state.plinko.rows;
      const startY = 40;
      const gapY = 20;

      for (let r = 0; r < rows; r++) {
        const count = r + 1;
        const rowWidth = (count - 1) * 26;
        const startX = (w / 2) - (rowWidth / 2);

        for (let c = 0; c < count; c++) {
          const x = startX + c * 26;
          const y = startY + r * gapY;

          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,.7)";
          ctx.fill();
        }
      }

      // bins
      const bins = rows + 1;
      const binW = w / bins;
      for (let i = 0; i < bins; i++) {
        const x = i * binW;
        ctx.fillStyle = "rgba(255,255,255,.06)";
        ctx.fillRect(x + 2, h - 28, binW - 4, 20);
      }

      // ball
      if (ball) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, 7, 0, Math.PI * 2);
        ctx.fillStyle = "#25d998";
        ctx.shadowColor = "#25d998";
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    },

    playPlinko() {
      if (this.state.plinko.dropping) return;

      const bet = this.getBet();
      if (!bet) return;

      this.balanceSubtract(bet);
      this.state.plinko.dropping = true;
      this.els.status.textContent = "Ball dropping...";

      const rows = this.state.plinko.rows;
      const canvas = document.getElementById("plinkoCanvas");
      if (!canvas) return;

      const w = canvas.width = Math.max(320, canvas.offsetWidth);
      const h = canvas.height = 260;

      let step = 0;
      let x = w / 2;
      let y = 20;
      const path = [];

      // precompute path
      for (let i = 0; i < rows; i++) {
        const dir = Math.random() > 0.5 ? 1 : -1;
        x += dir * 13;
        y += 20;
        path.push({ x, y });
      }

      let frame = 0;
      const animate = () => {
        if (frame < path.length) {
          this.drawPlinkoBoard(path[frame]);
          frame++;
          requestAnimationFrame(animate);
        } else {
          this.drawPlinkoBoard(path[path.length - 1]);

          const binIndex = Math.max(0, Math.min(rows, Math.floor((x / w) * (rows + 1))));
          const multiplier = this.getPlinkoMultiplier(binIndex, rows);

          const payout = bet * multiplier;

          if (multiplier > 0) {
            this.balanceAdd(payout);
          }

          this.els.multiplier.textContent = multiplier.toFixed(2) + "x";
          this.els.status.textContent = multiplier >= 1 ? `Win ${multiplier.toFixed(2)}x` : `Low ${multiplier.toFixed(2)}x`;

          if (payout > bet) {
            this.addBigWin(payout, "plinko");
            this.sound("win");
          } else {
            this.sound("lose");
          }

          this.state.plinko.dropping = false;
          this.state.nonce++;
          this.updateSeedsUI();
        }
      };

      animate();
    },

    getPlinkoMultiplier(bin, rows) {
      // central lower, edges higher
      const center = rows / 2;
      const dist = Math.abs(bin - center);

      let base;
      if (this.state.plinko.risk === "low") base = [0.5, 0.8, 1.0, 1.2, 1.5, 2.0];
      else if (this.state.plinko.risk === "high") base = [0.2, 0.4, 0.8, 1.2, 2.5, 5.0];
      else base = [0.3, 0.6, 0.9, 1.2, 2.0, 3.0];

      const idx = Math.min(base.length - 1, Math.floor(dist));
      return base[idx];
    },

    /* =========================================================
       SLOT
    ========================================================= */
    renderSlot() {
      this.els.gameBox.innerHTML = `
        <div class="slot-wrap" style="display:flex;align-items:center;justify-content:center;height:240px;">
          <div id="slotBoard" style="display:grid;grid-template-columns:repeat(3,88px);gap:10px;">
            <div class="slot-cell">🍒</div>
            <div class="slot-cell">🍋</div>
            <div class="slot-cell">7️⃣</div>
          </div>
        </div>
      `;

      this.els.dynamicControls.innerHTML = `
        <div class="game-info-box">
          <div><strong>3-Reel Slot</strong></div>
          <div style="margin-top:8px;opacity:.8;">3 same = jackpot</div>
          <div style="margin-top:8px;opacity:.8;">2 same = partial win</div>
        </div>
      `;

      this.els.status.textContent = "Ready to spin";
      this.els.multiplier.textContent = "1.00x";
    },

    playSlot() {
      if (this.state.slot.spinning) return;

      const bet = this.getBet();
      if (!bet) return;

      this.balanceSubtract(bet);
      this.state.slot.spinning = true;
      this.els.status.textContent = "Spinning...";

      const board = document.getElementById("slotBoard");
      if (!board) return;

      const cells = [...board.children];
      const symbols = this.state.slot.symbols;

      let ticks = 0;
      const spin = setInterval(() => {
        ticks++;

        cells.forEach(cell => {
          cell.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        });

        if (ticks >= 16) {
          clearInterval(spin);

          const final = cells.map(c => c.textContent);
          const payoutMulti = this.getSlotMultiplier(final);
          const payout = bet * payoutMulti;

          if (payout > 0) {
            this.balanceAdd(payout);
            this.els.status.textContent = `Win ${payoutMulti.toFixed(2)}x`;
            this.els.multiplier.textContent = payoutMulti.toFixed(2) + "x";
            this.addBigWin(payout, "slot");
            this.sound("win");
          } else {
            this.els.status.textContent = "No match";
            this.els.multiplier.textContent = "0.00x";
            this.sound("lose");
          }

          this.state.slot.spinning = false;
          this.state.nonce++;
          this.updateSeedsUI();
        }
      }, 90);
    },

    getSlotMultiplier(reels) {
      const [a, b, c] = reels;

      if (a === b && b === c) {
        if (a === "💎") return 10;
        if (a === "7️⃣") return 7;
        return 5;
      }

      if (a === b || b === c || a === c) {
        return 2;
      }

      return 0;
    },
     
/* =========================================================
       GAME Real PLUS 
========================================================= */

renderCoinflip() {
  this.els.gameBox.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:240px;flex-direction:column;gap:14px;">
      <div id="coinflipCoin" style="font-size:90px;">🪙</div>
      <div id="coinflipResult" style="font-size:28px;font-weight:900;">Choose Side</div>
    </div>
  `;

  this.els.dynamicControls.innerHTML = `
    <div class="game-info-box">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button class="bet-quick-btn active" data-casino-action="coinflipHeads" type="button">Heads</button>
        <button class="bet-quick-btn" data-casino-action="coinflipTails" type="button">Tails</button>
      </div>
    </div>
  `;

  this.state.coinflip = { choice: "heads" };
  this.els.status.textContent = "Pick a side";
  this.els.multiplier.textContent = "1.96x";
},

playCoinflip() {
  const bet = this.getBet();
  if (!bet) return;

  this.balanceSubtract(bet);
  this.els.status.textContent = "Flipping...";

  const coin = document.getElementById("coinflipCoin");
  const resultEl = document.getElementById("coinflipResult");

  let spins = 0;
  const anim = setInterval(() => {
    spins++;
    if (coin) coin.textContent = spins % 2 ? "🪙" : "💿";

    if (spins >= 12) {
      clearInterval(anim);

      const outcome = this.provablyFairNumber(0, 1) === 1 ? "heads" : "tails";
      const win = this.state.coinflip.choice === outcome;

      if (coin) coin.textContent = outcome === "heads" ? "🪙" : "💿";
      if (resultEl) resultEl.textContent = outcome.toUpperCase();

      if (win) {
        const payout = bet * 1.96;
        this.balanceAdd(payout);
        this.els.status.textContent = "WIN";
        this.els.multiplier.textContent = "1.96x";
        this.addBigWin(payout, "coinflip");
        this.sound("win");
      } else {
        this.els.status.textContent = "LOSE";
        this.els.multiplier.textContent = "0.00x";
        this.sound("lose");
      }

      this.state.nonce++;
      this.updateSeedsUI();
    }
  }, 90);
},

 renderLimbo() {
  this.els.gameBox.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:240px;flex-direction:column;gap:12px;">
      <div style="font-size:14px;opacity:.7;">Result Multiplier</div>
      <div id="limboResult" style="font-size:56px;font-weight:1000;">--</div>
    </div>
  `;

  this.els.dynamicControls.innerHTML = `
    <div class="game-info-box">
      <label style="display:block;margin-bottom:8px;font-weight:700;">Target Multiplier</label>
      <input data-casino-input="limboTarget" id="limboTargetInput" type="number" min="1.01" step="0.01" value="2.00" style="width:100%;">
    </div>
  `;

  this.state.limbo = { target: 2.00 };
  this.els.status.textContent = "Set target";
  this.els.multiplier.textContent = "2.00x";
},

playLimbo() {
  const bet = this.getBet();
  if (!bet) return;

  const target = parseFloat(document.getElementById("limboTargetInput")?.value || 2);
  this.balanceSubtract(bet);
  this.els.status.textContent = "Rolling...";

  const resultEl = document.getElementById("limboResult");
  const result = +(1 + (Math.random() * 20)).toFixed(2);

  setTimeout(() => {
    if (resultEl) resultEl.textContent = result.toFixed(2) + "x";

    if (result >= target) {
      const payout = bet * target;
      this.balanceAdd(payout);
      this.els.status.textContent = "WIN";
      this.els.multiplier.textContent = target.toFixed(2) + "x";
      this.addBigWin(payout, "limbo");
      this.sound("win");
    } else {
      this.els.status.textContent = "LOSE";
      this.els.multiplier.textContent = "0.00x";
      this.sound("lose");
    }

    this.state.nonce++;
    this.updateSeedsUI();
  }, 700);
},

renderHilo() {
  this.els.gameBox.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:240px;flex-direction:column;gap:12px;">
      <div id="hiloCard" style="font-size:92px;">🂡</div>
      <div id="hiloValue" style="font-size:26px;font-weight:900;">Card: A</div>
    </div>
  `;

  this.els.dynamicControls.innerHTML = `
    <div class="game-info-box">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button class="bet-quick-btn active" data-casino-action="hiloHigh" type="button">High</button>
        <button class="bet-quick-btn" data-casino-action="hiloLow" type="button">Low</button>
      </div>
    </div>
  `;

  this.state.hilo = { choice: "high" };
  this.els.status.textContent = "Guess next";
  this.els.multiplier.textContent = "1.85x";
},

playHilo() {
  const bet = this.getBet();
  if (!bet) return;

  this.balanceSubtract(bet);

  const value = this.provablyFairNumber(1, 13);
  const win = this.state.hilo.choice === "high" ? value >= 8 : value <= 6;

  const cardEl = document.getElementById("hiloCard");
  const valueEl = document.getElementById("hiloValue");

  const cards = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  if (cardEl) cardEl.textContent = "🂡";
  if (valueEl) valueEl.textContent = "Card: " + cards[value - 1];

  if (win) {
    const payout = bet * 1.85;
    this.balanceAdd(payout);
    this.els.status.textContent = "WIN";
    this.els.multiplier.textContent = "1.85x";
    this.addBigWin(payout, "hilo");
    this.sound("win");
  } else {
    this.els.status.textContent = "LOSE";
    this.els.multiplier.textContent = "0.00x";
    this.sound("lose");
  }

  this.state.nonce++;
  this.updateSeedsUI();
},

renderBlackjack() {
  this.els.gameBox.innerHTML = `
    <div style="display:grid;gap:18px;padding:16px;">
      <div>
        <div style="opacity:.7;margin-bottom:6px;">Dealer</div>
        <div id="bjDealer" style="font-size:38px;font-weight:900;">?</div>
      </div>

      <div>
        <div style="opacity:.7;margin-bottom:6px;">Player</div>
        <div id="bjPlayer" style="font-size:38px;font-weight:900;">?</div>
      </div>
    </div>
  `;

  this.els.dynamicControls.innerHTML = `
    <div class="game-info-box">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <button class="bet-quick-btn" data-casino-action="bjHit" type="button">Hit</button>
        <button class="bet-quick-btn" data-casino-action="bjStand" type="button">Stand</button>
      </div>
      <div style="margin-top:10px;opacity:.8;">Fast auto blackjack logic</div>
    </div>
  `;

  this.state.blackjack = {
    player: [],
    dealer: [],
    active: false
  };

  this.startBlackjackRound();
},

startBlackjackRound() {
  const draw = () => this.provablyFairNumber(2, 11);

  this.state.blackjack.player = [draw(), draw()];
  this.state.blackjack.dealer = [draw(), draw()];
  this.state.blackjack.active = true;

  this.updateBlackjackUI();
  this.els.status.textContent = "Blackjack round ready";
  this.els.multiplier.textContent = "2.00x";
},

updateBlackjackUI() {
  const p = this.state.blackjack.player;
  const d = this.state.blackjack.dealer;

  const pSum = p.reduce((a,b) => a+b, 0);
  const dSum = d.reduce((a,b) => a+b, 0);

  const pEl = document.getElementById("bjPlayer");
  const dEl = document.getElementById("bjDealer");

  if (pEl) pEl.textContent = `${p.join(" + ")} = ${pSum}`;
  if (dEl) dEl.textContent = `${d.join(" + ")} = ${dSum}`;
},

playBlackjack() {
  const bet = this.getBet();
  if (!bet) return;

  if (!this.state.blackjack?.active) {
    this.balanceSubtract(bet);
    this.state.blackjack.betPlaced = true;
    this.startBlackjackRound();
    return;
  }

  // إذا ضغط play نعتبرها stand مباشر
  this.finishBlackjack();
},

blackjackHit() {
  if (!this.state.blackjack?.active) return;
  this.state.blackjack.player.push(this.provablyFairNumber(2, 11));
  this.updateBlackjackUI();

  const sum = this.state.blackjack.player.reduce((a,b)=>a+b,0);
  if (sum > 21) {
    this.els.status.textContent = "BUST";
    this.els.multiplier.textContent = "0.00x";
    this.sound("lose");
    this.state.blackjack.active = false;
    this.state.nonce++;
    this.updateSeedsUI();
  }
},

finishBlackjack() {
  if (!this.state.blackjack?.active) return;

  while (this.state.blackjack.dealer.reduce((a,b)=>a+b,0) < 17) {
    this.state.blackjack.dealer.push(this.provablyFairNumber(2, 11));
  }

  this.updateBlackjackUI();

  const pSum = this.state.blackjack.player.reduce((a,b)=>a+b,0);
  const dSum = this.state.blackjack.dealer.reduce((a,b)=>a+b,0);

  if (dSum > 21 || pSum > dSum) {
    const payout = this.state.bet * 2;
    this.balanceAdd(payout);
    this.els.status.textContent = "WIN";
    this.els.multiplier.textContent = "2.00x";
    this.addBigWin(payout, "blackjack_fast");
    this.sound("win");
  } else {
    this.els.status.textContent = "LOSE";
    this.els.multiplier.textContent = "0.00x";
    this.sound("lose");
  }

  this.state.blackjack.active = false;
  this.state.nonce++;
  this.updateSeedsUI();
},

renderAirBoss() {
  this.els.gameBox.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:14px;" id="airbossGrid"></div>
  `;

  this.els.dynamicControls.innerHTML = `
    <div class="game-info-box">
      <div>Find safe flights. Avoid bombs.</div>
      <div style="margin-top:8px;opacity:.8;">Each safe tile increases multiplier.</div>
    </div>
  `;

  this.state.airboss = {
    bombs: [],
    revealed: [],
    multiplier: 1.00,
    active: false
  };

  this.buildAirBoss();
},

buildAirBoss() {
  const grid = document.getElementById("airbossGrid");
  if (!grid) return;

  grid.innerHTML = "";
  this.state.airboss.bombs = [];

  while (this.state.airboss.bombs.length < 5) {
    const n = this.provablyFairNumber(0, 24);
    if (!this.state.airboss.bombs.includes(n)) this.state.airboss.bombs.push(n);
  }

  this.state.airboss.revealed = [];
  this.state.airboss.multiplier = 1.00;
  this.state.airboss.active = false;

  for (let i = 0; i < 25; i++) {
    const btn = document.createElement("button");
    btn.className = "slot-cell";
    btn.style.height = "64px";
    btn.textContent = "✈️";
    btn.dataset.casinoAction = "airbossPick";
    btn.dataset.index = i;
    grid.appendChild(btn);
  }

  this.els.status.textContent = "Press Play to start";
  this.els.multiplier.textContent = "1.00x";
},

playAirBoss() {
  const bet = this.getBet();
  if (!bet) return;

  this.balanceSubtract(bet);
  this.state.airboss.active = true;
  this.state.airboss.multiplier = 1.00;
  this.els.status.textContent = "Pick safe flights";
},

renderBananaFarm() {
  this.els.gameBox.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;padding:14px;" id="bananaGrid"></div>
  `;

  this.els.dynamicControls.innerHTML = `
    <div class="game-info-box">
      <div>Find bananas, avoid rotten traps.</div>
      <div style="margin-top:8px;opacity:.8;">Farm mode survival.</div>
    </div>
  `;

  this.state.banana = {
    traps: [],
    found: [],
    multiplier: 1.00,
    active: false
  };

  this.buildBananaFarm();
},

buildBananaFarm() {
  const grid = document.getElementById("bananaGrid");
  if (!grid) return;

  grid.innerHTML = "";
  this.state.banana.traps = [];

  while (this.state.banana.traps.length < 4) {
    const n = this.provablyFairNumber(0, 24);
    if (!this.state.banana.traps.includes(n)) this.state.banana.traps.push(n);
  }

  this.state.banana.found = [];
  this.state.banana.multiplier = 1.00;
  this.state.banana.active = false;

  for (let i = 0; i < 25; i++) {
    const btn = document.createElement("button");
    btn.className = "slot-cell";
    btn.style.height = "64px";
    btn.textContent = "🌱";
    btn.dataset.casinoAction = "bananaPick";
    btn.dataset.index = i;
    grid.appendChild(btn);
  }

  this.els.status.textContent = "Press Play to start";
  this.els.multiplier.textContent = "1.00x";
},

playBananaFarm() {
  const bet = this.getBet();
  if (!bet) return;

  this.balanceSubtract(bet);
  this.state.banana.active = true;
  this.state.banana.multiplier = 1.00;
  this.els.status.textContent = "Pick bananas";
},

renderBirdsParty() {
  this.els.gameBox.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:16px;" id="birdsGrid">
      <button class="slot-cell" data-casino-action="birdsPick" data-multi="1.5">🐦</button>
      <button class="slot-cell" data-casino-action="birdsPick" data-multi="2.0">🦜</button>
      <button class="slot-cell" data-casino-action="birdsPick" data-multi="3.0">🦅</button>
    </div>
  `;

  this.els.dynamicControls.innerHTML = `
    <div class="game-info-box">
      <div>Pick a bird and reveal payout.</div>
    </div>
  `;

  this.els.status.textContent = "Choose a bird";
  this.els.multiplier.textContent = "1.00x";
},

playBirdsParty() {
  const bet = this.getBet();
  if (!bet) return;

  this.balanceSubtract(bet);
  this.state.birds = { active: true, bet };
  this.els.status.textContent = "Now pick a bird";
},

renderFruitParty() {
  this.els.gameBox.innerHTML = `
    <div id="fruitPartyBoard" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:16px;"></div>
  `;

  this.els.dynamicControls.innerHTML = `
    <div class="game-info-box">
      <div>Match fruits to win.</div>
    </div>
  `;

  this.buildFruitParty();
  this.els.status.textContent = "Press Play";
  this.els.multiplier.textContent = "1.00x";
},

buildFruitParty() {
  const board = document.getElementById("fruitPartyBoard");
  if (!board) return;

  const fruits = ["🍎","🍌","🍉","🍇","🍒","🍋"];
  board.innerHTML = "";

  for (let i = 0; i < 12; i++) {
    const d = document.createElement("div");
    d.className = "slot-cell";
    d.style.height = "70px";
    d.textContent = fruits[Math.floor(Math.random() * fruits.length)];
    board.appendChild(d);
  }
},

playFruitParty() {
  const bet = this.getBet();
  if (!bet) return;

  this.balanceSubtract(bet);
  this.buildFruitParty();

  const cells = [...document.querySelectorAll("#fruitPartyBoard .slot-cell")];
  const values = cells.map(c => c.textContent);

  const counts = {};
  values.forEach(v => counts[v] = (counts[v] || 0) + 1);

  const best = Math.max(...Object.values(counts));
  let multi = 0;

  if (best >= 5) multi = 4;
  else if (best >= 4) multi = 2.5;
  else if (best >= 3) multi = 1.5;

  if (multi > 0) {
    const payout = bet * multi;
    this.balanceAdd(payout);
    this.els.status.textContent = "WIN";
    this.els.multiplier.textContent = multi.toFixed(2) + "x";
    this.addBigWin(payout, "fruit_party");
    this.sound("win");
  } else {
    this.els.status.textContent = "LOSE";
    this.els.multiplier.textContent = "0.00x";
    this.sound("lose");
  }

  this.state.nonce++;
  this.updateSeedsUI();
},


/* =========================================================
       PLAY ROUTER
========================================================= */
    
   play() {
  switch (this.state.currentGame) {
    case "crash":
      this.startCrashRound();
      break;

    case "dice":
      this.playDice();
      break;

    case "plinko":
      this.playPlinko();
      break;

    case "slot":
      this.playSlot();
      break;

    case "coinflip":
      this.playCoinflip();
      break;

    case "limbo":
      this.playLimbo();
      break;

    case "hilo":
      this.playHilo();
      break;

    case "blackjack_fast":
      this.playBlackjack();
      break;

    case "airboss":
      this.playAirBoss();
      break;

    case "banana_farm":
      this.playBananaFarm();
      break;

    case "birds_party":
      this.playBirdsParty();
      break;

    case "fruit_party":
      this.playFruitParty();
      break;

    default:
      this.playGeneric();
   }
    },

    playGeneric() {
      const bet = this.getBet();
      if (!bet) return;

      this.balanceSubtract(bet);

      const win = Math.random() > 0.52;
      const payout = win ? bet * (1.2 + Math.random() * 2.8) : 0;

      if (win) {
        this.balanceAdd(payout);
        this.els.status.textContent = `Win ${payout.toFixed(2)} BX`;
        this.els.multiplier.textContent = (payout / bet).toFixed(2) + "x";
        this.addBigWin(payout, this.state.currentGame || "game");
        this.sound("win");
      } else {
        this.els.status.textContent = "Lost";
        this.els.multiplier.textContent = "0.00x";
        this.sound("lose");
      }

      this.state.nonce++;
      this.updateSeedsUI();
    },

    /* =========================================================
       BET / BALANCE
    ========================================================= */
    getBet() {
      const bet = parseFloat(this.els.betInput?.value || 0);

      if (!bet || bet <= 0) {
        alert("Enter valid BX bet");
        return 0;
      }

      if (bet > this.state.balance) {
        alert("Insufficient BX balance");
        return 0;
      }

      this.state.bet = bet;
      return bet;
    },

    handleQuickBet(btn) {
      const multi = parseFloat(btn.dataset.betMulti || 0);
      const percent = parseFloat(btn.dataset.betPercent || 0);

      let current = parseFloat(this.els.betInput.value || 0);

      if (multi) {
        if (!current) current = 1;
        this.els.betInput.value = (current * multi).toFixed(2);
      }

      if (percent) {
        this.els.betInput.value = ((this.state.balance * percent) / 100).toFixed(2);
      }
    },

    balanceSubtract(amount) {
      this.state.balance = Math.max(0, this.state.balance - amount);
      this.updateBalanceUI();
    },

    balanceAdd(amount) {
      this.state.balance += amount;
      this.updateBalanceUI();
    },

    updateBalanceUI() {
      if (this.els.balanceMini) this.els.balanceMini.textContent = this.state.balance.toFixed(2) + " BX";
      if (this.els.balanceGame) this.els.balanceGame.textContent = this.state.balance.toFixed(2);
    },

    /* =========================================================
       PROVABLY FAIR
    ========================================================= */
    newSeed() {
      this.state.clientSeed = "client_" + Math.random().toString(36).slice(2);
      this.state.serverSeed = "server_" + Math.random().toString(36).slice(2);
      this.state.nonce = 0;
      this.updateSeedsUI();
    },

    updateSeedsUI() {
      if (this.els.serverSeed) this.els.serverSeed.textContent = this.hash(this.state.serverSeed);
      if (this.els.clientSeed) this.els.clientSeed.textContent = this.state.clientSeed;
      if (this.els.nonce) this.els.nonce.textContent = String(this.state.nonce);
    },

    hash(str) {
      return btoa(unescape(encodeURIComponent(str))).slice(0, 20);
    },

    provablyFairNumber(min, max) {
      // pseudo PF للواجهة — backend لاحقًا
      const seed = `${this.state.serverSeed}:${this.state.clientSeed}:${this.state.nonce}`;
      let h = 0;
      for (let i = 0; i < seed.length; i++) {
        h = (h << 5) - h + seed.charCodeAt(i);
        h |= 0;
      }
      const normalized = Math.abs(h % 10000) / 10000;
      return Math.floor(normalized * (max - min + 1)) + min;
    },

    /* =========================================================
       BIG WINS
    ========================================================= */
    renderBigWins() {
      if (!this.els.bigWins) return;

      const seedWins = [
        { user: "@alpha", game: "Crash", amount: 24.50 },
        { user: "@king", game: "Dice", amount: 41.00 },
        { user: "@nova", game: "Plinko", amount: 88.75 }
      ];

      this.els.bigWins.innerHTML = seedWins.map(w => `
        <div class="big-win-row">
          <div class="big-win-user">
            <strong>${w.user}</strong>
            <small>${w.game}</small>
          </div>
          <div class="big-win-amount">+${w.amount.toFixed(2)} BX</div>
        </div>
      `).join("");
    },

    addBigWin(amount, game = "Game") {
      if (!this.els.bigWins) return;

      const row = document.createElement("div");
      row.className = "big-win-row";
      row.innerHTML = `
        <div class="big-win-user">
          <strong>@you</strong>
          <small>${this.prettyGameName(game)}</small>
        </div>
        <div class="big-win-amount">+${amount.toFixed(2)} BX</div>
      `;

      this.els.bigWins.prepend(row);

      while (this.els.bigWins.children.length > 10) {
        this.els.bigWins.removeChild(this.els.bigWins.lastChild);
      }
    },

    /* =========================================================
       TICKER
    ========================================================= */
    startTicker() {
      if (!this.els.ticker) return;

      const lines = [
        "🔥 Crash just hit 8.42x",
        "🎲 Dice winner +32 BX",
        "🟢 Plinko edge hit 5.00x",
        "🎰 Slot jackpot landed",
        "⚡ BX Casino Live"
      ];

      let i = 0;
      setInterval(() => {
        i = (i + 1) % lines.length;
        this.els.ticker.innerHTML = `<span>${lines[i]}</span>`;
      }, 2800);
    },

    /* =========================================================
       DYNAMIC ACTIONS
    ========================================================= */
    handleDynamicAction(type, el) {
      switch (type) {
        case "crashStart":
          this.startCrashRound();
          break;
        case "crashCashout":
          this.crashCashout();
          break;

        case "diceModeOver":
          this.state.dice.rollOver = true;
          this.els.status.textContent = "Roll Over selected";
          this.els.multiplier.textContent = this.getDiceMultiplier().toFixed(2) + "x";
          this.toggleActiveButton(el, ["diceModeOver", "diceModeUnder"]);
          break;

        case "diceModeUnder":
          this.state.dice.rollOver = false;
          this.els.status.textContent = "Roll Under selected";
          this.els.multiplier.textContent = this.getDiceMultiplier().toFixed(2) + "x";
          this.toggleActiveButton(el, ["diceModeOver", "diceModeUnder"]);
          break;

        case "plinkoRiskLow":
          this.state.plinko.risk = "low";
          this.toggleActiveButton(el, ["plinkoRiskLow", "plinkoRiskMedium", "plinkoRiskHigh"]);
          break;

        case "plinkoRiskMedium":
          this.state.plinko.risk = "medium";
          this.toggleActiveButton(el, ["plinkoRiskLow", "plinkoRiskMedium", "plinkoRiskHigh"]);
          break;

        case "plinkoRiskHigh":
          this.state.plinko.risk = "high";
          this.toggleActiveButton(el, ["plinkoRiskLow", "plinkoRiskMedium", "plinkoRiskHigh"]);
          break;

         case "coinflipHeads":
          this.state.coinflip.choice = "heads";
          this.toggleActiveButton(el, ["coinflipHeads", "coinflipTails"]);
         break;

         case "coinflipTails":
          this.state.coinflip.choice = "tails";
          this.toggleActiveButton(el, ["coinflipHeads", "coinflipTails"]);
          break;

         case "hiloHigh":
          this.state.hilo.choice = "high";
          this.toggleActiveButton(el, ["hiloHigh", "hiloLow"]);
         break;

         case "hiloLow":
          this.state.hilo.choice = "low";
          this.toggleActiveButton(el, ["hiloHigh", "hiloLow"]);
        break;

         case "bjHit":
          this.blackjackHit();
          break;

         case "bjStand":
          this.finishBlackjack();
          break;

         case "airbossPick":
           this.handleAirBossPick(Number(el.dataset.index), el);
           break;

         case "bananaPick":
           this.handleBananaPick(Number(el.dataset.index), el);
          break;

        case "birdsPick":
          this.handleBirdPick(Number(el.dataset.multi), el);
         break;
      }
    },

    handleDynamicInput(type, value) {
      switch (type) {
        case "crashAutoCashout":
          this.state.crash.autoCashout = Math.max(1.01, parseFloat(value || 2));
          break;

        case "diceTarget":
          this.state.dice.target = Math.max(2, Math.min(98, parseInt(value || 50, 10)));
          const targetEl = document.getElementById("diceTargetValue");
          if (targetEl) targetEl.textContent = this.state.dice.target;
          this.els.multiplier.textContent = this.getDiceMultiplier().toFixed(2) + "x";
          break;

        case "plinkoRows":
          this.state.plinko.rows = Math.max(8, Math.min(12, parseInt(value || 8, 10)));
          const rowsEl = document.getElementById("plinkoRowsValue");
          if (rowsEl) rowsEl.textContent = this.state.plinko.rows;
          this.drawPlinkoBoard();
          break;

        case "limboTarget":
         this.state.limbo = this.state.limbo || {};
         this.state.limbo.target = Math.max(1.01, parseFloat(value || 2));
         this.els.multiplier.textContent = this.state.limbo.target.toFixed(2) + "x";
         break;
      }
    },

    toggleActiveButton(activeEl, actionNames = []) {
      actionNames.forEach(name => {
        document.querySelectorAll(`[data-casino-action="${name}"]`).forEach(btn => {
          btn.classList.remove("active");
        });
      });
      activeEl.classList.add("active");
    },

    /* =========================================================
       SOUND
    ========================================================= */
    sound(type) {
      const audio = document.getElementById(`snd-${type}`);
      if (!audio) return;
      try {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } catch (_) {}
    }
  };

  window.CASINO = CASINO;

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("casino")) {
      CASINO.init();
    }
  });
})();
