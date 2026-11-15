/*
 * BLOXIO CASINO PREMIUM EXPERIENCE
 * UI enhancement layer for the supplied Casino V4 module.
 * Game outcomes, wallet balances and payouts remain backend-authoritative.
 */
import {
  BUS, STATE, Registry, BetEngine, CasinoAPI, Currency, CrashGame, PixiEngine
} from "./casino.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));
const number = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const GAME_META = {
  crash: { tagline:"Ride the curve. Cash out in time.", mode:"Multiplier", options:[["autoCashout","Auto cashout (x)", "number", "2.00"]] },
  dice: { tagline:"Set your line. Roll for the result.", mode:"Over / Under", options:[["target","Target (0–99.99)", "number", "50"],["side","Direction","select",["over","under"]]] },
  limbo: { tagline:"Choose a target multiplier.", mode:"Target multiplier", options:[["targetMultiplier","Target multiplier (x)","number","2.00"]] },
  mines: { tagline:"Pick your risk and reveal tiles.", mode:"Grid strategy", options:[["mines","Number of mines","select",["3","5","10","15","20"]]] },
  hilo: { tagline:"Predict whether the next card is higher or lower.", mode:"Next card", options:[["choice","Prediction","select",["higher","lower","same"]]] },
  coinflip: { tagline:"One call. Two sides.", mode:"Choose a side", options:[["choice","Side","select",["heads","tails"]]] },
  plinko: { tagline:"Set the board risk and drop.", mode:"Drop settings", options:[["risk","Risk","select",["low","medium","high"]],["rows","Rows","select",["8","12","16"]]] },
  wheel: { tagline:"Choose a segment and spin.", mode:"Spin", options:[["choice","Pick a segment","select",["red","black","green"]]] },
  keno: { tagline:"Choose your numbers before the draw.", mode:"Number picks", options:[["picks","Number of picks","select",["3","5","7","10"]]] },
  blackjack: { tagline:"Play your hand against the dealer.", mode:"Table", options:[["action","Action","select",["deal"]]] },
  baccarat: { tagline:"Choose Player, Banker or Tie.", mode:"Bet type", options:[["choice","Bet on","select",["player","banker","tie"]]] },
  roulette: { tagline:"Choose a bet type for the wheel.", mode:"Bet type", options:[["choice","Selection","select",["red","black","odd","even","green"]]] },
  airboss: { tagline:"Arcade flight challenge.", mode:"Arcade", options:[["action","Action","select",["start"]]] },
  "birds-party": { tagline:"Arcade skill challenge.", mode:"Arcade", options:[["action","Action","select",["start"]]] },
  "tower-rush": { tagline:"Build your tower. Time each move.", mode:"Arcade", options:[["action","Action","select",["start"]]] },
  "chicken-road": { tagline:"Advance carefully and decide when to stop.", mode:"Arcade", options:[["action","Action","select",["start"]]] },
  bananafarm: { tagline:"A bright slot adventure.", mode:"Slots", options:[["lines","Lines","select",["10","20","25"]]] },
  fruitparty: { tagline:"Fruit symbols. Big-match energy.", mode:"Slots", options:[["lines","Lines","select",["10","20","25"]]] }
};

const PREMIUM = {
  chart: null,
  pixiApp: null,
  activeGame: null,
  busy: false,
  init() {
    this.bindGameOpen();
    this.bindGlobalPolish();
    this.exposeHealth();
  },
  bindGlobalPolish() {
    const animate = () => {
      if (!window.gsap || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      window.gsap.fromTo(".casino-game-card", { y: 14, opacity: 0 }, {
        y: 0, opacity: 1, duration: .42, stagger: .025, ease: "power2.out", clearProps: "all"
      });
      window.gsap.fromTo(".casino-featured-card", { scale: .97, opacity: 0 }, {
        scale: 1, opacity: 1, duration: .4, stagger: .04, ease: "power2.out", clearProps: "all"
      });
    };
    BUS.on("casino:started", animate);
    BUS.on("game:close", () => this.cleanup());
    BUS.on("game:open", game => this.mount(game));
    // Search/filter updates are rendered by the original engine; animate only newly rendered cards.
    const grid = $("#casinoGamesGrid");
    if (grid && "MutationObserver" in window) {
      let scheduled = false;
      new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => { scheduled = false; animate(); });
      }).observe(grid, { childList: true });
    }
  },
  bindGameOpen() {},
  exposeHealth() {
    window.BloxioCasinoPremium = {
      version: "1.0.0",
      status: () => ({
        activeGame: this.activeGame,
        chart: !!this.chart,
        pixi: !!this.pixiApp,
        gsap: !!window.gsap,
        bloxioChart: !!window.BloxioChart
      })
    };
  },
  mount(game) {
    this.cleanup();
    this.activeGame = game;
    const host = $("#casinoRuntime");
    if (!host) return;
    const meta = GAME_META[game.id] || { tagline:"Bloxio Original Game", mode:"Game", options:[["action","Action","select",["play"]]] };
    host.innerHTML = `
      <section class="bxp-game-shell" aria-label="${esc(game.name)} game">
        <header class="bxp-game-top">
          <div class="bxp-game-identity">
            <span class="bxp-live-dot"></span>
            <div><span class="bxp-eyebrow">BLOXIO ORIGINALS</span><h2>${esc(game.name)}</h2><p>${esc(meta.tagline)}</p></div>
          </div>
          <div class="bxp-game-top-actions">
            <span class="bxp-status" data-bxp-status>Ready to connect</span>
            <button type="button" class="bxp-close" data-bxp-close aria-label="Close game">×</button>
          </div>
        </header>
        <div class="bxp-game-layout">
          <section class="bxp-stage-card">
            <div class="bxp-stage-head"><span>${esc(meta.mode)}</span><span class="bxp-stage-chip">${esc(STATE.currency)}</span></div>
            <div class="bxp-visual-stage" data-bxp-stage>
              <div class="bxp-pixi-layer" data-bxp-pixi aria-hidden="true"></div>
              <div class="bxp-stage-center">
                <span class="bxp-game-symbol">${esc(game.name.slice(0,2).toUpperCase())}</span>
                <strong data-bxp-result>—</strong>
                <small data-bxp-result-label>Waiting for a server-confirmed round</small>
              </div>
            </div>
            <div class="bxp-chart-wrap">
              <div class="bxp-chart-head"><div><strong>GAME CHART</strong><small>Verified round history</small></div><span data-bxp-chart-status>Loading chart data…</span></div>
              <div class="bxp-chart" data-bxp-chart></div>
            </div>
          </section>
          <aside class="bxp-control-card">
            <div class="bxp-control-title"><span>PLAY PANEL</span><strong>Place your bet</strong></div>
            <label class="bxp-field-label" for="bxpBetAmount">Bet amount</label>
            <div class="bxp-amount-row"><input id="bxpBetAmount" type="number" inputmode="decimal" min="0" step="any" value="${STATE.currency === "XBC" ? "10" : "0.1"}"><b>${esc(STATE.currency)}</b></div>
            <div class="bxp-quick-bets"><button type="button" data-bxp-add="0.5">½</button><button type="button" data-bxp-add="1">1×</button><button type="button" data-bxp-add="2">2×</button><button type="button" data-bxp-add="max">MAX</button></div>
            <div class="bxp-options" data-bxp-options></div>
            <div class="bxp-control-foot"><span>Currency</span><div class="bxp-currencies"><button type="button" data-bxp-currency="BX" class="${STATE.currency==="BX"?"active":""}">BX</button><button type="button" data-bxp-currency="XBC" class="${STATE.currency==="XBC"?"active":""}">XBC</button></div></div>
            <button type="button" class="bxp-play" data-bxp-play>${game.id === "crash" ? "JOIN CRASH" : "PLACE BET"} <span>→</span></button>
            <p class="bxp-feedback" data-bxp-feedback role="status" aria-live="polite">Bets, outcomes and payouts must be confirmed by Bloxio servers.</p>
            <div class="bxp-fairness-note"><span>◇</span><span>Server-authoritative gameplay<br><small>Never trust client-side results for payouts.</small></span></div>
          </aside>
        </div>
      </section>`;
    this.renderOptions(meta.options || []);
    this.bindControls(game);
    this.mountPixi(game.id, $("[data-bxp-pixi]", host));
    this.mountChart(game.id, $("[data-bxp-chart]", host));
    if (window.gsap && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.gsap.fromTo(".bxp-game-shell", { opacity:0, y:12 }, { opacity:1, y:0, duration:.35, ease:"power2.out" });
      window.gsap.fromTo(".bxp-control-card", { x:12, opacity:0 }, { x:0, opacity:1, duration:.4, delay:.08 });
    }
    this.setStatus("UI ready · waiting for backend", "neutral");
  },
  renderOptions(options) {
    const root = $("[data-bxp-options]");
    if (!root) return;
    root.innerHTML = options.map(([name,label,type,value]) => {
      if (type === "select") return `<label class="bxp-field-label" for="bxpOpt-${esc(name)}">${esc(label)}</label><select id="bxpOpt-${esc(name)}" data-bxp-option="${esc(name)}">${value.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join("")}</select>`;
      return `<label class="bxp-field-label" for="bxpOpt-${esc(name)}">${esc(label)}</label><input id="bxpOpt-${esc(name)}" data-bxp-option="${esc(name)}" type="number" step="any" value="${esc(value)}">`;
    }).join("");
  },
  bindControls(game) {
    const host = $("#casinoRuntime");
    $("[data-bxp-close]", host)?.addEventListener("click", () => {
      const close = $("#closeGame");
      if (close) close.click();
      else { $("#casinoGameView")?.classList.add("hidden"); }
    });
    $$("[data-bxp-currency]", host).forEach(btn => btn.addEventListener("click", () => {
      Currency.set(btn.dataset.bxpCurrency);
      $$("[data-bxp-currency]", host).forEach(b=>b.classList.toggle("active",b===btn));
      const amount = $("#bxpBetAmount",host);
      if (amount) amount.value = btn.dataset.bxpCurrency === "XBC" ? "10" : "0.1";
      const chip = $(".bxp-stage-chip",host); if (chip) chip.textContent = btn.dataset.bxpCurrency;
    }));
    $$("[data-bxp-add]", host).forEach(btn => btn.addEventListener("click", () => {
      const input = $("#bxpBetAmount",host), current = number(input.value);
      const min = STATE.currency === "XBC" ? 10 : .1;
      input.value = btn.dataset.bxpAdd === "max"
        ? String(Math.max(0, number(STATE.wallet?.[STATE.currency])))
        : String(Math.max(min, current * (number(btn.dataset.bxpAdd) || 1)));
    }));
    $("[data-bxp-play]", host)?.addEventListener("click", () => this.play(game));
  },
  async play(game) {
    if (this.busy) return;
    const host = $("#casinoRuntime");
    const amount = number($("#bxpBetAmount",host)?.value);
    if (!Number.isFinite(amount) || amount < Currency.minBet()) {
      this.feedback(`Minimum bet is ${Currency.minBet()} ${STATE.currency}.`, "error"); return;
    }
    const options = {};
    $$("[data-bxp-option]",host).forEach(el => { options[el.dataset.bxpOption] = el.type === "number" ? number(el.value) : el.value; });
    this.busy = true;
    const button = $("[data-bxp-play]",host);
    if (button) { button.disabled = true; button.textContent = "WAITING FOR SERVER…"; }
    this.feedback("Submitting a secure round request…", "pending");
    this.setStatus("Request in progress", "pending");
    try {
      let result;
      if (game.id === "crash") {
        // Crash join and cashout are separate backend-authoritative operations.
        result = CrashGame.running ? await CrashGame.cashout() : await CrashGame.start(amount);
      } else {
        result = await BetEngine.place(amount, game.id, { options, ...options });
      }
      const display = result?.multiplier != null ? `${number(result.multiplier).toFixed(2)}×` :
        result?.payout != null ? `${number(result.payout).toFixed(4)} ${STATE.currency}` :
        result?.result?.multiplier != null ? `${number(result.result.multiplier).toFixed(2)}×` :
        result?.status || "Round accepted";
      const output = $("[data-bxp-result]",host);
      if (output) output.textContent = display;
      const label = $("[data-bxp-result-label]",host);
      if (label) label.textContent = "Server response · not a client-generated outcome";
      this.feedback("The server accepted the request. Result details are shown only when returned by the backend.", "success");
      this.setStatus("Server response received", "success");
      if (game.id === "crash" && button) {
        button.innerHTML = CrashGame.running ? 'CASH OUT <span>↗</span>' : 'JOIN CRASH <span>→</span>';
      }
      BUS.emit("premium:round", { gameId:game.id, result });
    } catch (error) {
      this.feedback(error?.message || "The server could not process this round. Check the casino API.", "error");
      this.setStatus("Backend action unavailable", "error");
    } finally {
      this.busy = false;
      if (button?.isConnected) { button.disabled = false; button.innerHTML = 'PLACE BET <span>→</span>'; }
    }
  },
  feedback(message, state) {
    const node = $("[data-bxp-feedback]");
    if (node) { node.textContent = message; node.dataset.state = state; }
  },
  setStatus(message, state) {
    const node = $("[data-bxp-status]");
    if (node) { node.textContent = message; node.dataset.state = state; }
  },
  async mountChart(gameId, node) {
    if (!node) return;
    if (!window.BloxioChart?.create) {
      $("[data-bxp-chart-status]").textContent = "Chart engine not loaded";
      return;
    }
    try {
      this.chart = window.BloxioChart.create(node, {
        symbol: `${gameId.toUpperCase()} · ROUND HISTORY`,
        interval: "ROUND",
        height: 250,
        minHeight: 210,
        precision: 4,
        showVolume: true,
        showToolbar: true,
        showHeader: false,
        showWatermark: true,
        watermark: "BLOXIO GAME",
        background: "#080d18",
        autoFit: true
      });

      // Build a payout-history chart only from persisted server sessions.
      const response = await CasinoAPI.history();
      const sessions = Array.isArray(response) ? response : (response?.sessions || []);
      const rows = sessions
        .filter(row => row && row.game === gameId && row.created_at)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      let lastTime = 0;
      const candles = rows.map(row => {
        let time = Math.floor(new Date(row.created_at).getTime() / 1000);
        if (!Number.isFinite(time)) return null;
        if (time <= lastTime) time = lastTime + 1;
        lastTime = time;
        const bet = Math.max(0, number(row.bet));
        const payout = Math.max(0, number(row.payout));
        return {
          time,
          open: bet,
          high: Math.max(bet, payout),
          low: Math.min(bet, payout),
          close: payout,
          volume: bet
        };
      }).filter(Boolean);

      if (candles.length) {
        this.chart.setData(candles);
        $("[data-bxp-chart-status]").textContent = `${candles.length} verified rounds`;
      } else {
        $("[data-bxp-chart-status]").textContent = "No saved rounds for this game yet";
      }
    } catch (error) {
      $("[data-bxp-chart-status]").textContent =
        error?.status === 401 ? "Sign in to view round history" : "Round history unavailable";
    }
  },
  async mountPixi(gameId, node) {
    if (!node || !window.PIXI) return;
    try {
      const app = await PixiEngine.create(`premium-${gameId}`, node);
      if (!app || !window.PIXI.Graphics) return;
      this.pixiApp = app;
      const PIXI = window.PIXI;
      const graphics = new PIXI.Graphics();
      // Decorative Bloxio particles only; game logic and outcomes remain on the server.
      const width = Math.max(280, node.clientWidth || 600);
      const height = Math.max(180, node.clientHeight || 300);
      for (let i=0; i<34; i++) {
        const x = (i * 83 + 29) % width;
        const y = (i * 47 + 13) % height;
        const radius = 1 + (i % 3);
        if (graphics.beginFill && graphics.drawCircle) {
          graphics.beginFill(i % 4 === 0 ? 0x00e6a0 : 0x6576a8, .12 + (i%3)*.04);
          graphics.drawCircle(x,y,radius);
          graphics.endFill();
        } else if (graphics.circle && graphics.fill) {
          graphics.circle(x,y,radius).fill({ color: i%4===0 ? 0x00e6a0 : 0x6576a8, alpha:.18 });
        }
      }
      app.stage.addChild(graphics);
      if (app.renderer?.resize) {
        const resize = () => app.renderer.resize(Math.max(1,node.clientWidth), Math.max(1,node.clientHeight));
        if (window.ResizeObserver) {
          this.pixiObserver = new ResizeObserver(resize);
          this.pixiObserver.observe(node);
        }
      }
    } catch (error) {
      console.warn("[BLOXIO PREMIUM PIXI]", error);
    }
  },
  cleanup() {
    try { this.chart?.destroy(); } catch (_) {}
    this.chart = null;
    this.pixiObserver?.disconnect();
    this.pixiObserver = null;
    if (this.activeGame) {
      try { PixiEngine.destroy(`premium-${this.activeGame.id}`); } catch (_) {}
    }
    this.pixiApp = null;
    this.activeGame = null;
    this.busy = false;
  }
};

PREMIUM.init();
