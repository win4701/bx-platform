/* =========================================================
   BLOXIO — CASINO.GAMES.JS MASTER
   12 Game Engines (Mounted inside Casino Shell)
========================================================= */

(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const rand = (min, max) => Math.random() * (max - min) + min;
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  /* =========================================================
     ENGINE REGISTRY
  ========================================================= */
  const CasinoGames = {
    currentEngine: null,

    engines: {},

    mount(gameKey) {
      const engine = this.engines[gameKey];
      if (!engine) return false;

      this.destroyCurrent();

      this.currentEngine = engine;
      engine.mount?.();

      return true;
    },

    destroyCurrent() {
      try {
        this.currentEngine?.destroy?.();
      } catch (err) {
        console.warn("Destroy engine failed:", err);
      }
      this.currentEngine = null;
    },

    play() {
      return this.currentEngine?.play?.();
    },

    stop() {
      return this.currentEngine?.stop?.();
    },

    cashout() {
      return this.currentEngine?.cashout?.();
    }
  };

  /* =========================================================
     SHARED HELPERS
  ========================================================= */
  const Shared = {
    stage(html) {
      const el = $("casinoGameStage");
      if (el) el.innerHTML = html;
    },

    controls(html) {
      const el = $("casinoGameControls");
      if (el) el.innerHTML = html;
    },

    setStatus(title, meta = "") {
      window.CasinoUI?.setRoundStatus?.(title, meta);
      window.CasinoUI?.syncControls?.();
    },

    toast(msg, type = "info") {
      window.CasinoUI?.showToast?.(msg, type);
    },

    getBet() {
      return Number($("casinoBetAmount")?.value || 0);
    },

    finish(game, bet, payout, won, result) {
      window.CasinoCore?.finishRound?.({
        game,
        bet,
        payout,
        won,
        result
      });

      window.CasinoUI?.fullSync?.();
    },

    payout(amount, reason) {
      return window.CasinoCore?.payout?.(amount, reason);
    },

    setCashout(enabled) {
      if (!window.CasinoState) return;
      window.CasinoState.canCashout = !!enabled;
      window.CasinoUI?.syncControls?.();
    },

    setPlaying(enabled) {
      if (!window.CasinoState) return;
      window.CasinoState.isPlaying = !!enabled;
      window.CasinoUI?.syncControls?.();
    },

    clearTimers(engine) {
      if (!engine) return;
      if (engine._timer) clearTimeout(engine._timer);
      if (engine._interval) clearInterval(engine._interval);
      engine._timer = null;
      engine._interval = null;
    }
  };

  /* =========================================================
     1) COINFLIP
  ========================================================= */
  CasinoGames.engines.coinflip = {
    choice: "heads",

    mount() {
      Shared.stage(`
        <div class="engine engine-coinflip">
          <div class="coinflip-coin" id="coinflipCoin">🪙</div>
          <div class="coinflip-result" id="coinflipResult">Choose your side</div>
        </div>
      `);

      Shared.controls(`
        <div class="casino-dynamic-control">
          <label>Pick Side</label>
          <div class="choice-row">
            <button type="button" class="choice-btn active" data-cf="heads">Heads</button>
            <button type="button" class="choice-btn" data-cf="tails">Tails</button>
          </div>
        </div>
      `);

      document.querySelectorAll("[data-cf]").forEach(btn => {
        btn.onclick = () => {
          this.choice = btn.dataset.cf;
          document.querySelectorAll("[data-cf]").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        };
      });

      Shared.setStatus("Ready", "Coinflip ready");
    },

    play() {
      const bet = Shared.getBet();
      const coin = $("coinflipCoin");
      const resultEl = $("coinflipResult");

      if (!coin || !resultEl) return;

      Shared.setPlaying(true);
      resultEl.textContent = "Flipping...";
      coin.classList.add("spinning");

      this._timer = setTimeout(() => {
        const result = Math.random() > 0.5 ? "heads" : "tails";
        const won = result === this.choice;
        const payout = won ? bet * 1.96 : 0;

        coin.classList.remove("spinning");
        resultEl.textContent = `Result: ${result.toUpperCase()}`;

        if (won) Shared.payout(payout, "casino:coinflip:win");
        Shared.finish("coinflip", bet, payout, won, result);
        Shared.setStatus(won ? "Win" : "Loss", won ? `+${payout.toFixed(2)} BX` : "Better luck next flip");
      }, window.CasinoState?.isTurbo ? 450 : 1200);
    },

    stop() {
      Shared.clearTimers(this);
      Shared.setPlaying(false);
      Shared.setStatus("Stopped", "Coinflip interrupted");
    },

    destroy() {
      Shared.clearTimers(this);
    }
  };

  /* =========================================================
     2) LIMBO
  ========================================================= */
  CasinoGames.engines.limbo = {
    target: 2.00,

    mount() {
      Shared.stage(`
        <div class="engine engine-limbo">
          <div class="limbo-target-display" id="limboRoll">1.00×</div>
          <div class="limbo-sub">Hit above your target multiplier</div>
        </div>
      `);

      Shared.controls(`
        <div class="casino-dynamic-control">
          <label for="limboTarget">Target Multiplier</label>
          <input id="limboTarget" type="number" min="1.01" step="0.01" value="2.00">
        </div>
      `);

      $("limboTarget")?.addEventListener("input", (e) => {
        this.target = Math.max(1.01, Number(e.target.value || 2));
      });

      Shared.setStatus("Ready", "Set your limbo target");
    },

    play() {
      const bet = Shared.getBet();
      const display = $("limboRoll");
      if (!display) return;

      this.target = Math.max(1.01, Number($("limboTarget")?.value || 2));

      Shared.setPlaying(true);
      display.textContent = "Rolling...";

      this._timer = setTimeout(() => {
        const roll = Number(rand(1.00, 10.00).toFixed(2));
        const won = roll >= this.target;
        const payout = won ? bet * this.target * 0.99 : 0;

        display.textContent = `${roll.toFixed(2)}×`;

        if (won) Shared.payout(payout, "casino:limbo:win");
        Shared.finish("limbo", bet, payout, won, roll);
        Shared.setStatus(won ? "Win" : "Loss", won ? `Hit ${roll.toFixed(2)}×` : `Missed target ${this.target.toFixed(2)}×`);
      }, window.CasinoState?.isTurbo ? 350 : 950);
    },

    stop() {
      Shared.clearTimers(this);
      Shared.setPlaying(false);
      Shared.setStatus("Stopped", "Limbo interrupted");
    },

    destroy() {
      Shared.clearTimers(this);
    }
  };

  /* =========================================================
     3) DICE
  ========================================================= */
  CasinoGames.engines.dice = {
    mode: "under",
    target: 50,

    mount() {
      Shared.stage(`
        <div class="engine engine-dice">
          <div class="dice-roll-display" id="diceRollValue">00.00</div>
          <div class="dice-bar">
            <div class="dice-hit-zone" id="diceHitZone"></div>
          </div>
        </div>
      `);

      Shared.controls(`
        <div class="casino-dynamic-control">
          <label for="diceTarget">Target</label>
          <input id="diceTarget" type="range" min="2" max="98" step="1" value="50">
          <div class="dice-config-row">
            <span id="diceTargetLabel">50</span>
            <div class="choice-row">
              <button type="button" class="choice-btn active" data-dice-mode="under">Under</button>
              <button type="button" class="choice-btn" data-dice-mode="over">Over</button>
            </div>
          </div>
        </div>
      `);

      const syncTarget = () => {
        this.target = Number($("diceTarget")?.value || 50);
        $("diceTargetLabel") && ($("diceTargetLabel").textContent = this.target);
        const zone = $("diceHitZone");
        if (zone) zone.style.width = `${this.target}%`;
      };

      $("diceTarget")?.addEventListener("input", syncTarget);
      syncTarget();

      document.querySelectorAll("[data-dice-mode]").forEach(btn => {
        btn.onclick = () => {
          this.mode = btn.dataset.diceMode;
          document.querySelectorAll("[data-dice-mode]").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        };
      });

      Shared.setStatus("Ready", "Dice configured");
    },

    play() {
      const bet = Shared.getBet();
      const valueEl = $("diceRollValue");
      if (!valueEl) return;

      Shared.setPlaying(true);
      valueEl.textContent = "??.??";

      this._timer = setTimeout(() => {
        const roll = Number(rand(0, 100).toFixed(2));
        const chance = this.mode === "under" ? this.target : (100 - this.target);
        const payoutMulti = clamp(99 / Math.max(1, chance), 1.01, 49.5);
        const won = this.mode === "under" ? roll < this.target : roll > this.target;
        const payout = won ? bet * payoutMulti : 0;

        valueEl.textContent = roll.toFixed(2);

        if (won) Shared.payout(payout, "casino:dice:win");
        Shared.finish("dice", bet, payout, won, roll);
        Shared.setStatus(won ? "Win" : "Loss", won ? `Rolled ${roll}` : `Rolled ${roll}`);
      }, window.CasinoState?.isTurbo ? 300 : 900);
    },

    stop() {
      Shared.clearTimers(this);
      Shared.setPlaying(false);
      Shared.setStatus("Stopped", "Dice interrupted");
    },

    destroy() {
      Shared.clearTimers(this);
    }
  };

  /* =========================================================
     4) CRASH
  ========================================================= */
  CasinoGames.engines.crash = {
    multiplier: 1.00,
    crashPoint: 2.50,
    cashedOut: false,

    mount() {
      Shared.stage(`
        <div class="engine engine-crash">
          <div class="crash-multiplier" id="crashMultiplier">1.00×</div>
          <div class="crash-graph">
            <div class="crash-line" id="crashLine"></div>
          </div>
        </div>
      `);

      Shared.controls(`
        <div class="casino-dynamic-control">
          <label for="crashAutoCashout">Auto Cashout</label>
          <input id="crashAutoCashout" type="number" min="1.01" step="0.01" value="2.00">
        </div>
      `);

      Shared.setStatus("Ready", "Crash ready");
    },

    play() {
      const bet = Shared.getBet();
      const display = $("crashMultiplier");
      const line = $("crashLine");
      if (!display || !line) return;

      this.multiplier = 1.00;
      this.crashPoint = Number(rand(1.20, 8.00).toFixed(2));
      this.cashedOut = false;

      Shared.setPlaying(true);
      Shared.setCashout(true);
      Shared.setStatus("Flying", "Cash out before the crash");

      const autoCash = Math.max(1.01, Number($("crashAutoCashout")?.value || 2));

      this._interval = setInterval(() => {
        this.multiplier = Number((this.multiplier + (window.CasinoState?.isTurbo ? 0.14 : 0.07)).toFixed(2));
        display.textContent = `${this.multiplier.toFixed(2)}×`;
        line.style.width = `${Math.min(100, this.multiplier * 10)}%`;

        if (!this.cashedOut && this.multiplier >= autoCash && window.CasinoState?.isAuto) {
          this.cashout();
          return;
        }

        if (this.multiplier >= this.crashPoint) {
          clearInterval(this._interval);
          Shared.setCashout(false);
          Shared.setPlaying(false);

          if (!this.cashedOut) {
            Shared.finish("crash", bet, 0, false, this.crashPoint);
            Shared.setStatus("Crashed", `Crashed at ${this.crashPoint.toFixed(2)}×`);
          }
        }
      }, window.CasinoState?.isTurbo ? 90 : 180);
    },

    cashout() {
      if (this.cashedOut || !window.CasinoState?.isPlaying) return;

      const bet = Shared.getBet();
      const payout = bet * this.multiplier;

      this.cashedOut = true;
      Shared.payout(payout, "casino:crash:cashout");
      Shared.finish("crash", bet, payout, true, this.multiplier);
      Shared.setCashout(false);
      Shared.setPlaying(false);
      Shared.setStatus("Cashed Out", `${this.multiplier.toFixed(2)}×`);
      Shared.toast(`Crash cashout at ${this.multiplier.toFixed(2)}×`, "success");

      clearInterval(this._interval);
    },

    stop() {
      Shared.clearTimers(this);
      Shared.setCashout(false);
      Shared.setPlaying(false);
      Shared.setStatus("Stopped", "Crash stopped");
    },

    destroy() {
      Shared.clearTimers(this);
    }
  };

  /* =========================================================
     5) PLINKO
  ========================================================= */
  CasinoGames.engines.plinko = {
    risk: "medium",

    mount() {
      Shared.stage(`
        <div class="engine engine-plinko">
          <div class="plinko-board" id="plinkoBoard">
            ${Array.from({ length: 42 }).map(() => `<span class="plinko-peg"></span>`).join("")}
          </div>
          <div class="plinko-slot-result" id="plinkoSlotResult">Drop the ball</div>
        </div>
      `);

      Shared.controls(`
        <div class="casino-dynamic-control">
          <label>Risk</label>
          <div class="choice-row">
            <button type="button" class="choice-btn" data-plinko-risk="low">Low</button>
            <button type="button" class="choice-btn active" data-plinko-risk="medium">Medium</button>
            <button type="button" class="choice-btn" data-plinko-risk="high">High</button>
          </div>
        </div>
      `);

      document.querySelectorAll("[data-plinko-risk]").forEach(btn => {
        btn.onclick = () => {
          this.risk = btn.dataset.plinkoRisk;
          document.querySelectorAll("[data-plinko-risk]").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
        };
      });

      Shared.setStatus("Ready", "Plinko board loaded");
    },

    play() {
      const bet = Shared.getBet();
      const out = $("plinkoSlotResult");
      if (!out) return;

      Shared.setPlaying(true);
      out.textContent = "Dropping...";

      this._timer = setTimeout(() => {
        const map = {
          low: [0.5, 0.8, 1.0, 1.2, 1.5],
          medium: [0.3, 0.6, 1.0, 1.8, 3.0],
          high: [0.2, 0.5, 1.0, 2.5, 5.0]
        };

        const multi = pick(map[this.risk] || map.medium);
        const won = multi >= 1;
        const payout = bet * multi;

        out.textContent = `${multi.toFixed(2)}×`;

        if (payout > 0) Shared.payout(payout, "casino:plinko:win");
        Shared.finish("plinko", bet, payout, won, multi);
        Shared.setStatus(won ? "Win" : "Loss", `${multi.toFixed(2)}×`);
      }, window.CasinoState?.isTurbo ? 500 : 1300);
    },

    stop() {
      Shared.clearTimers(this);
      Shared.setPlaying(false);
      Shared.setStatus("Stopped", "Plinko interrupted");
    },

    destroy() {
      Shared.clearTimers(this);
    }
  };

  /* =========================================================
     6) BLACKJACK
  ========================================================= */
  CasinoGames.engines.blackjack = {
    deck: [],
    player: [],
    dealer: [],
    bet: 0,

    mount() {
      Shared.stage(`
        <div class="engine engine-blackjack">
          <div class="bj-row">
            <div class="bj-hand">
              <label>Dealer</label>
              <div class="bj-cards" id="bjDealer"></div>
              <div class="bj-score" id="bjDealerScore">0</div>
            </div>
          </div>
          <div class="bj-row">
            <div class="bj-hand">
              <label>Player</label>
              <div class="bj-cards" id="bjPlayer"></div>
              <div class="bj-score" id="bjPlayerScore">0</div>
            </div>
          </div>
        </div>
      `);

      Shared.controls(`
        <div class="casino-dynamic-control">
          <label>Blackjack Actions</label>
          <div class="choice-row">
            <button type="button" class="choice-btn" id="bjHitBtn">Hit</button>
            <button type="button" class="choice-btn" id="bjStandBtn">Stand</button>
          </div>
        </div>
      `);

      $("bjHitBtn")?.addEventListener("click", () => this.hit());
      $("bjStandBtn")?.addEventListener("click", () => this.stand());

      Shared.setStatus("Ready", "Start a blackjack hand");
    },

    buildDeck() {
      const vals = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
      this.deck = [];
      for (let i = 0; i < 4; i++) this.deck.push(...vals);
      this.deck.sort(() => Math.random() - 0.5);
    },

    draw() {
      return this.deck.pop();
    },

    score(hand) {
      let total = 0;
      let aces = 0;

      hand.forEach(c => {
        if (["J","Q","K"].includes(c)) total += 10;
        else if (c === "A") {
          total += 11;
          aces += 1;
        } else {
          total += Number(c);
        }
      });

      while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
      }

      return total;
    },

    renderHands(revealDealer = false) {
      const dealerEl = $("bjDealer");
      const playerEl = $("bjPlayer");
      const dealerScore = $("bjDealerScore");
      const playerScore = $("bjPlayerScore");

      if (dealerEl) {
        dealerEl.innerHTML = this.dealer.map((c, i) => `
          <span class="bj-card">${!revealDealer && i === 1 ? "?" : c}</span>
        `).join("");
      }

      if (playerEl) {
        playerEl.innerHTML = this.player.map(c => `<span class="bj-card">${c}</span>`).join("");
      }

      if (dealerScore) dealerScore.textContent = revealDealer ? this.score(this.dealer) : "?";
      if (playerScore) playerScore.textContent = this.score(this.player);
    },

    play() {
      this.bet = Shared.getBet();
      this.buildDeck();
      this.player = [this.draw(), this.draw()];
      this.dealer = [this.draw(), this.draw()];

      Shared.setPlaying(true);
      this.renderHands(false);
      Shared.setStatus("Your Turn", "Hit or Stand");

      if (this.score(this.player) === 21) {
        this.stand();
      }
    },

    hit() {
      if (!window.CasinoState?.isPlaying) return;

      this.player.push(this.draw());
      this.renderHands(false);

      if (this.score(this.player) > 21) {
        Shared.setPlaying(false);
        Shared.finish("blackjack", this.bet, 0, false, "bust");
        Shared.setStatus("Bust", "Player busted");
      }
    },

    stand() {
      if (!window.CasinoState?.isPlaying) return;

      while (this.score(this.dealer) < 17) {
        this.dealer.push(this.draw());
      }

      this.renderHands(true);

      const p = this.score(this.player);
      const d = this.score(this.dealer);

      let payout = 0;
      let won = false;
      let result = "lose";

      if (d > 21 || p > d) {
        payout = this.bet * 2;
        won = true;
        result = "win";
      } else if (p === d) {
        payout = this.bet;
        won = true;
        result = "push";
      }

      if (payout > 0) Shared.payout(payout, "casino:blackjack:win");

      Shared.setPlaying(false);
      Shared.finish("blackjack", this.bet, payout, won, result);
      Shared.setStatus(won ? "Win" : "Loss", result.toUpperCase());
    },

    stop() {
      Shared.clearTimers(this);
      Shared.setPlaying(false);
      Shared.setStatus("Stopped", "Blackjack ended");
    },

    destroy() {
      Shared.clearTimers(this);
    }
  };

  /* =========================================================
     7) HILO
  ========================================================= */
  CasinoGames.engines.hilo = {
    current: null,
    bet: 0,

    mount() {
      Shared.stage(`
        <div class="engine engine-hilo">
          <div class="hilo-card" id="hiloCard">?</div>
          <div class="hilo-multi" id="hiloMulti">1.00×</div>
        </div>
      `);

      Shared.controls(`
        <div class="casino-dynamic-control">
          <label>Guess Next Card</label>
          <div class="choice-row">
            <button type="button" class="choice-btn" id="hiloHighBtn">Higher</button>
            <button type="button" class="choice-btn" id="hiloLowBtn">Lower</button>
          </div>
        </div>
      `);

      $("hiloHighBtn")?.addEventListener("click", () => this.guess("high"));
      $("hiloLowBtn")?.addEventListener("click", () => this.guess("low"));

      Shared.setStatus("Ready", "Start HiLo");
    },

    play() {
      this.bet = Shared.getBet();
      this.current = Math.floor(rand(2, 14));
      $("hiloCard") && ($("hiloCard").textContent = this.current);
      $("hiloMulti") && ($("hiloMulti").textContent = "1.50×");
      Shared.setPlaying(true);
      Shared.setStatus("Guess", "Higher or Lower");
    },

    guess(side) {
      if (!window.CasinoState?.isPlaying) return;

      const next = Math.floor(rand(2, 14));
      const won = side === "high" ? next > this.current : next < this.current;
      const payout = won ? this.bet * 1.5 : 0;

      $("hiloCard") && ($("hiloCard").textContent = next);

      if (won) Shared.payout(payout, "casino:hilo:win");

      Shared.setPlaying(false);
      Shared.finish("hilo", this.bet, payout, won, next);
      Shared.setStatus(won ? "Win" : "Loss", `Next card: ${next}`);
    },

    stop() {
      Shared.clearTimers(this);
      Shared.setPlaying(false);
      Shared.setStatus("Stopped", "HiLo ended");
    },

    destroy() {
      Shared.clearTimers(this);
    }
  };

  /* =========================================================
     8) BIRDSPARTY
  ========================================================= */
  CasinoGames.engines.birdsparty = {
    mountedBirds: 0,

    mount() {
      Shared.stage(`
        <div class="engine engine-birdsparty">
          <div class="birds-sky" id="birdsSky">
            ${Array.from({ length: 8 }).map((_, i) => `<span class="bird bird-${i + 1}">🐦</span>`).join("")}
          </div>
          <div class="birds-score" id="birdsScore">Waiting for birds...</div>
        </div>
      `);

      Shared.controls(`
        <div class="casino-dynamic-control">
          <label>Party Mode</label>
          <select id="birdsMode">
            <option value="normal">Normal</option>
            <option value="wild">Wild</option>
          </select>
        </div>
      `);

      Shared.setStatus("Ready", "BirdsParty loaded");
    },

    play() {
      const bet = Shared.getBet();
      const out = $("birdsScore");
      Shared.setPlaying(true);

      this._timer = setTimeout(() => {
        const mode = $("birdsMode")?.value || "normal";
        const multi = mode === "wild" ? pick([0, 0.5, 2, 4, 8]) : pick([0.2, 0.8, 1.2, 2.5, 5]);
        const payout = bet * multi;
        const won = multi >= 1;

        if (payout > 0) Shared.payout(payout, "casino:birdsparty:win");
        if (out) out.textContent = `${multi.toFixed(2)}× flock bonus`;

        Shared.finish("birdsparty", bet, payout, won, multi);
        Shared.setStatus(won ? "Win" : "Loss", `${multi.toFixed(2)}×`);
      }, window.CasinoState?.isTurbo ? 500 : 1200);
    },

    stop() {
      Shared.clearTimers(this);
      Shared.setPlaying(false);
      Shared.setStatus("Stopped", "BirdsParty interrupted");
    },

    destroy() {
      Shared.clearTimers(this);
    }
  };

  /* =========================================================
     9) AIRBOSS
  ========================================================= */
  CasinoGames.engines.airboss = {
    altitude: 1,
    escapePoint: 4,
    escaped: false,

    mount() {
      Shared.stage(`
        <div class="engine engine-airboss">
          <div class="airboss-plane" id="airbossPlane">✈️</div>
          <div class="airboss-altitude" id="airbossAltitude">1.00×</div>
        </div>
      `);

      Shared.controls(`
        <div class="casino-dynamic-control">
          <label for="airbossEscape">Auto Escape</label>
          <input id="airbossEscape" type="number" min="1.01" step="0.01" value="2.00">
        </div>
      `);

      Shared.setStatus("Ready", "AirBoss runway ready");
    },

    play() {
      const bet = Shared.getBet();
      const display = $("airbossAltitude");
      this.altitude = 1;
      this.escapePoint = Number(rand(1.2, 7).toFixed(2));
      this.escaped = false;

      Shared.setPlaying(true);
      Shared.setCashout(true);
      Shared.setStatus("Takeoff", "Escape before engine failure");

      const autoEscape = Number($("airbossEscape")?.value || 2);

      this._interval = setInterval(() => {
        this.altitude = Number((this.altitude + 0.08).toFixed(2));
        if (display) display.textContent = `${this.altitude.toFixed(2)}×`;

        if (!this.escaped && window.CasinoState?.isAuto && this.altitude >= autoEscape) {
          this.cashout();
          return;
        }

        if (this.altitude >= this.escapePoint) {
          clearInterval(this._interval);
          Shared.setCashout(false);
          Shared.setPlaying(false);

          if (!this.escaped) {
            Shared.finish("airboss", bet, 0, false, this.escapePoint);
            Shared.setStatus("Crashed", `Failed at ${this.escapePoint.toFixed(2)}×`);
          }
        }
      }, window.CasinoState?.isTurbo ? 80 : 170);
    },

    cashout() {
      if (this.escaped || !window.CasinoState?.isPlaying) return;

      const bet = Shared.getBet();
      const payout = bet * this.altitude;

      this.escaped = true;
      Shared.payout(payout, "casino:airboss:cashout");
      Shared.finish("airboss", bet, payout, true, this.altitude);
      Shared.setCashout(false);
      Shared.setPlaying(false);
      Shared.setStatus("Escaped", `${this.altitude.toFixed(2)}×`);

      clearInterval(this._interval);
    },

    stop() {
      Shared.clearTimers(this);
      Shared.setCashout(false);
      Shared.setPlaying(false);
      Shared.setStatus("Stopped", "AirBoss stopped");
    },

    destroy() {
      Shared.clearTimers(this);
    }
  };

  /* =========================================================
     10) SLOT
  ========================================================= */
  CasinoGames.engines.slot = {
    reels: ["🍒","🍋","⭐","7","💎","🍉"],

    mount() {
      Shared.stage(`
        <div class="engine engine-slot">
          <div class="slot-reels" id="slotReels">
            <span class="slot-cell">?</span>
            <span class="slot-cell">?</span>
            <span class="slot-cell">?</span>
          </div>
          <div class="slot-status" id="slotStatus">Spin the reels</div>
        </div>
      `);

      Shared.controls(`
        <div class="casino-dynamic-control">
          <label>Slot Mode</label>
          <select id="slotMode">
            <option value="normal">Normal</option>
            <option value="boost">Boost</option>
          </select>
        </div>
      `);

      Shared.setStatus("Ready", "Slot ready");
    },

    play() {
      const bet = Shared.getBet();
      const wrap = $("slotReels");
      const status = $("slotStatus");
      if (!wrap || !status) return;

      Shared.setPlaying(true);
      status.textContent = "Spinning...";

      this._timer = setTimeout(() => {
        const mode = $("slotMode")?.value || "normal";
        const r = [pick(this.reels), pick(this.reels), pick(this.reels)];

        wrap.innerHTML = r.map(x => `<span class="slot-cell">${x}</span>`).join("");

        let multi = 0;
        if (r[0] === r[1] && r[1] === r[2]) multi = mode === "boost" ? 8 : 5;
        else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) multi = 2;
        else multi = 0;

        const payout = bet * multi;
        const won = multi > 0;

        if (payout > 0) Shared.payout(payout, "casino:slot:win");
        status.textContent = won ? `${multi.toFixed(2)}× WIN` : "No match";

        Shared.finish("slot", bet, payout, won, r.join("-"));
        Shared.setStatus(won ? "Win" : "Loss", won ? `${multi.toFixed(2)}× combo` : "No combo");
      }, window.CasinoState?.isTurbo ? 450 : 1200);
    },

    stop() {
      Shared.clearTimers(this);
      Shared.setPlaying(false);
      Shared.setStatus("Stopped", "Slot interrupted");
    },

    destroy() {
      Shared.clearTimers(this);
    }
  };

  /* =========================================================
     11) FRUITPARTY
  ========================================================= */
  CasinoGames.engines.fruitparty = {
    fruits: ["🍓","🍍","🍇","🍉","🍋","🥝"],

    mount() {
      Shared.stage(`
        <div class="engine engine-fruitparty">
          <div class="fruit-grid" id="fruitGrid">
            ${Array.from({ length: 9 }).map(() => `<span class="fruit-cell">🍓</span>`).join("")}
          </div>
          <div class="fruit-result" id="fruitResult">Ready to party</div>
        </div>
      `);

      Shared.controls(`
        <div class="casino-dynamic-control">
          <label>Cluster Bonus</label>
          <select id="fruitMode">
            <option value="normal">Normal</option>
            <option value="party">Party</option>
          </select>
        </div>
      `);

      Shared.setStatus("Ready", "FruitParty ready");
    },

    play() {
      const bet = Shared.getBet();
      const grid = $("fruitGrid");
      const result = $("fruitResult");
      if (!grid || !result) return;

      Shared.setPlaying(true);

      this._timer = setTimeout(() => {
        const mode = $("fruitMode")?.value || "normal";
        const cells = Array.from({ length: 9 }).map(() => pick(this.fruits));
        const counts = {};
        cells.forEach(f => counts[f] = (counts[f] || 0) + 1);

        const maxCluster = Math.max(...Object.values(counts));
        let multi = maxCluster >= 5 ? (mode === "party" ? 6 : 4) : maxCluster >= 3 ? 1.8 : 0.2;

        const payout = bet * multi;
        const won = multi >= 1;

        grid.innerHTML = cells.map(c => `<span class="fruit-cell">${c}</span>`).join("");
        result.textContent = `Cluster: ${maxCluster}`;

        if (payout > 0) Shared.payout(payout, "casino:fruitparty:win");
        Shared.finish("fruitparty", bet, payout, won, maxCluster);
        Shared.setStatus(won ? "Win" : "Loss", `${multi.toFixed(2)}×`);
      }, window.CasinoState?.isTurbo ? 450 : 1100);
    },

    stop() {
      Shared.clearTimers(this);
      Shared.setPlaying(false);
      Shared.setStatus("Stopped", "FruitParty interrupted");
    },

    destroy() {
      Shared.clearTimers(this);
    }
  };

  /* =========================================================
     12) BANANAFARM
  ========================================================= */
  CasinoGames.engines.bananafarm = {
    rows: 3,
    cols: 3,

    mount() {
      Shared.stage(`
        <div class="engine engine-bananafarm">
          <div class="banana-grid" id="bananaGrid">
            ${Array.from({ length: 9 }).map(() => `<span class="banana-cell">🌱</span>`).join("")}
          </div>
          <div class="banana-status" id="bananaStatus">Plant and harvest</div>
        </div>
      `);

      Shared.controls(`
        <div class="casino-dynamic-control">
          <label>Farm Mode</label>
          <select id="bananaMode">
            <option value="safe">Safe</option>
            <option value="wild">Wild</option>
          </select>
        </div>
      `);

      Shared.setStatus("Ready", "BananaFarm loaded");
    },

    play() {
      const bet = Shared.getBet();
      const grid = $("bananaGrid");
      const status = $("bananaStatus");
      if (!grid || !status) return;

      Shared.setPlaying(true);
      status.textContent = "Growing...";

      this._timer = setTimeout(() => {
        const mode = $("bananaMode")?.value || "safe";
        const cells = Array.from({ length: 9 }).map(() => Math.random() > 0.5 ? "🍌" : "🌱");
        const bananas = cells.filter(x => x === "🍌").length;

        let multi = mode === "wild"
          ? (bananas >= 6 ? 5 : bananas >= 4 ? 2 : 0.2)
          : (bananas >= 5 ? 3 : bananas >= 3 ? 1.4 : 0.4);

        const payout = bet * multi;
        const won = multi >= 1;

        grid.innerHTML = cells.map(c => `<span class="banana-cell">${c}</span>`).join("");
        status.textContent = `${bananas} bananas harvested`;

        if (payout > 0) Shared.payout(payout, "casino:bananafarm:win");
        Shared.finish("bananafarm", bet, payout, won, bananas);
        Shared.setStatus(won ? "Harvest Win" : "Weak Harvest", `${multi.toFixed(2)}×`);
      }, window.CasinoState?.isTurbo ? 450 : 1200);
    },

    stop() {
      Shared.clearTimers(this);
      Shared.setPlaying(false);
      Shared.setStatus("Stopped", "Farm interrupted");
    },

    destroy() {
      Shared.clearTimers(this);
    }
  };

  /* =========================================================
     GLOBAL BIND
  ========================================================= */
  window.CasinoGames = CasinoGames;

  window.addEventListener("casino:game:mounted", (e) => {
    const game = e.detail?.game;
    if (!game) return;
    CasinoGames.mount(game);
  });

})();
