/* BLOXIO GAME ARENA — standalone responsive game session */
"use strict";

import { Registry, BetEngine, Currency, CasinoAPI, GameFactory } from "./casino.js";
import { createBloxioChartEngine } from "./chart.games.js";
import { CASINO_COINS, MIN_BETS } from "./data/coins.js";

(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
  const MIN_BETS_BY_CURRENCY = MIN_BETS;
  const GAME_ASSETS = [
    { code: "BX", name: "Bloxio" }, { code: "XBC", name: "Bloxio Casino" },
    { code: "STR", name: "STR" }, { code: "EUBX", name: "Euro Bloxio" },
    { code: "SHIB", name: "Shiba Inu" }, { code: "PEPE", name: "Pepe" },
    { code: "BONK", name: "Bonk" }
  ].filter(asset => CASINO_COINS.includes(asset.code) &&
    ["BX", "STR", "EUBX", "XBC"].includes(asset.code) &&
    Number(MIN_BETS_BY_CURRENCY[asset.code]) > 0
  ).map(asset => ({ ...asset, enabled: true }));
  const minBetFor = code => {
    const sharedMinimum = Number(MIN_BETS_BY_CURRENCY[code]);
    return Number.isFinite(sharedMinimum) && sharedMinimum > 0 ? sharedMinimum : 0;
  };
  // Only engines that exist in casino.js are enabled here. The remaining catalogue
  // entries stay safely disabled until their server lifecycle is implemented.
  const ACTIVE_HANDLERS = new Set(["crash", "mines", "plinko", "wheel", "dice", "coinflip", "limbo", "hilo"]);
  const ENGINE_METHODS = {
    mines: "play", plinko: "drop", wheel: "spin", dice: "roll",
    coinflip: "flip", limbo: "roll", hilo: "draw"
  };
  const CHART_ENGINE = createBloxioChartEngine();

  function resolveGame() {
    const params = new URLSearchParams(location.search);
    const id = params.get("game") || params.get("id");
    return id ? Registry.get(id) : null;
  }

  function gameArtwork(game) {
    return game.image || "/assets/images/casino/roulette.webp";
  }

  function parseResult(value) {
    if (value && typeof value === "object") return value;
    if (typeof value !== "string") return value ?? null;
    try { return JSON.parse(value); } catch (_) { return value; }
  }

  function canonicalGameId(value) {
    const id = String(value || "").trim().toLowerCase();
    const aliases = { "hi-lo": "hilo", "coin-flip": "coinflip", "tower_rush": "tower-rush" };
    return aliases[id] || id;
  }

  function chartResultFor(gameId, row) {
    const raw = parseResult(row.result);
    const obj = raw && typeof raw === "object" ? raw : null;
    switch (gameId) {
      case "crash":
      case "limbo": {
        const multiplier = Number(row.multiplier ?? obj?.multiplier ?? obj?.value);
        return Number.isFinite(multiplier) && multiplier > 0 ? { multiplier } : null;
      }
      case "dice": {
        const value = Number(obj?.value ?? obj?.roll ?? raw);
        return Number.isFinite(value) ? { value } : null;
      }
      case "coinflip": {
        const outcome = obj?.outcome ?? obj?.side ?? obj?.result ?? raw;
        return outcome == null || outcome === "" ? null : { outcome: String(outcome).toLowerCase() };
      }
      case "mines": {
        const events = obj?.events ?? obj?.cells;
        return Array.isArray(events) && events.length ? { events } : null;
      }
      case "plinko": {
        const slot = obj?.slot ?? obj?.index;
        return slot == null ? null : { slot: Number.isFinite(Number(slot)) ? Number(slot) : slot };
      }
      case "wheel": {
        const segmentId = obj?.segmentId ?? obj?.id ?? obj?.segment;
        return segmentId == null ? null : { segmentId };
      }
      case "hilo": {
        const rank = obj?.rank ?? obj?.value;
        return rank == null ? null : { rank: Number(rank) };
      }
      default:
        return obj || (raw == null ? null : raw);
    }
  }

  async function loadVerifiedHistory(gameId) {
    const canvas = $("bxGameChartCanvas");
    const empty = $("bxGameChartEmpty");
    const chartStatus = $("bxGameChartStatus");
    const count = $("bxGameRoundCount");
    const history = $("bxGameHistory");
    if (!canvas || !empty) return;
    try {
      CHART_ENGINE.mount(gameId, canvas, {
        height: window.matchMedia("(max-width: 760px)").matches ? 270 : 360,
        responsive: true,
        showVolume: true,
        theme: {
          background: "#051411", text: "#F4F7F5",
          grid: "rgba(140,163,157,.12)", accent: "#D4AF37"
        }
      });
      const response = await CasinoAPI.history();
      const sessions = Array.isArray(response) ? response : (response?.sessions || []);
      const rows = sessions.filter(row => row && canonicalGameId(row.game) === gameId && row.created_at)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const records = rows.map(row => {
        const timestamp = new Date(row.created_at).getTime();
        const result = chartResultFor(gameId, row);
        if (!Number.isFinite(timestamp) || timestamp <= 0 || result == null) return null;
        return {
          gameId,
          roundId: String(row.id ?? row.round_id ?? `${gameId}-${timestamp}`),
          timestamp,
          currency: null,
          result,
          metadata: {
            bet: Math.max(0, Number(row.bet) || 0),
            payout: Math.max(0, Number(row.payout) || 0),
            nonce: row.nonce ?? null
          }
        };
      }).filter(Boolean);
      if (records.length) {
        CHART_ENGINE.ingestMany(records);
        CHART_ENGINE.refresh(gameId);
        empty.hidden = true;
        canvas.hidden = false;
        count.textContent = `${records.length} server records`;
        if (history) history.innerHTML = rows.slice(-6).reverse().map(row => {
          const result = chartResultFor(gameId, row);
          const shown = gameId === "crash" || gameId === "limbo"
            ? (result?.multiplier != null ? `${Number(result.multiplier).toFixed(2)}×` : "—")
            : (typeof result === "object" ? esc(JSON.stringify(result)) : esc(result ?? "—"));
          return `<div class="bxg-result-row"><span>${esc(new Date(row.created_at).toLocaleString())}</span><strong>${shown}</strong></div>`;
        }).join("");
        if (chartStatus) chartStatus.textContent = "Server-confirmed history loaded";
      } else {
        canvas.hidden = true;
        empty.hidden = false;
        chartStatus.textContent = rows.length ? "No chart-compatible result fields in server history" : "Waiting for server-confirmed round data";
        count.textContent = "0 chartable rounds";
        if (history) history.innerHTML = `<div class="bxg-empty-row">No chart-compatible server results yet.</div>`;
      }
    } catch (error) {
      canvas.hidden = true;
      empty.hidden = false;
      chartStatus.textContent = error?.status === 401 ? "Sign in to view round history" : "Verified chart data unavailable";
      count.textContent = "History unavailable";
      if (history) history.innerHTML = `<div class="bxg-empty-row">${esc(chartStatus.textContent)}</div>`;
      console.warn("[BLOXIO GAME CHART]", error);
    }
  }

  function renderShell(game) {
    const host = $("casinoGameContainer");
    if (!host) return;
    const canBet = ACTIVE_HANDLERS.has(game.id) && Boolean(GameFactory.get(game.id));
    const gameAssets = game.id === "crash" ? GAME_ASSETS.filter(asset => asset.code === "BX") : GAME_ASSETS;
    const currency = gameAssets.some(asset => asset.code === Currency.get()) ? Currency.get() : (gameAssets[0]?.code || "BX");
    host.innerHTML = `
      <div class="bxg-layout">
        <header class="bxg-game-head">
          <a class="bxg-back-link" href="/pages/casino.html" aria-label="Back to Casino">← <span>Casino</span></a>
          <div class="bxg-game-identity">
            <img src="${esc(gameArtwork(game))}" alt="${esc(game.name)}" class="bxg-game-art">
            <div class="bxg-game-heading">
              <span class="bxg-eyebrow">${esc(game.provider || "BLOXIO CASINO")}</span>
              <h1>${esc(game.name)}</h1>
              <p>${esc(game.category || "Original")} · Provably fair session</p>
            </div>
          </div>
          <span class="bxg-status ${canBet ? "is-ready" : "is-pending"}">${canBet ? "SERVER HANDLER AVAILABLE" : "ENGINE NOT ENABLED"}</span>
        </header>

        <section class="bxg-asset-strip" aria-label="Available game currencies">
          ${gameAssets.map(asset => `
            <button type="button" class="bxg-asset ${asset.enabled ? "" : "is-catalog-only"} ${asset.code === currency ? "is-active" : ""}"
              data-bx-game-currency="${asset.code}" ${asset.enabled ? "" : "disabled aria-disabled=\"true\""}>
              <span class="bxg-asset-icon">
                <img src="/assets/images/coins/${asset.code.toLowerCase()}.png" alt=""
                  onerror="this.hidden=true;this.nextElementSibling.hidden=false">
                <b hidden>${asset.code.slice(0,2)}</b>
              </span>
              <strong>${asset.code}</strong>
              <small>${!asset.enabled ? "Catalog only" : (canBet ? "Casino" : "Engine pending")}</small>
            </button>`).join("")}
        </section>

        <div class="bxg-main-grid">
          <section class="bxg-stage-column">
            <section class="bxg-stage-card">
              <div class="bxg-panel-heading">
                <div><span class="bxg-eyebrow">GAME ARENA</span><h2>${esc(game.name)} chart</h2></div>
                <span class="bxg-live-label"><i></i> VERIFIED DATA</span>
              </div>
              <div class="bxg-chart" id="bxGameChart" aria-label="Verified game round chart">
                <canvas id="bxGameChartCanvas" role="img" aria-label="Verified round history chart"></canvas>
                <div class="bxg-chart-empty" id="bxGameChartEmpty">
                  <span class="bxg-chart-mark">⌁</span>
                  <strong id="bxGameChartStatus">Loading verified round data</strong>
                  <p>Only server-confirmed results are shown. No sample or simulated outcomes are used.</p>
                </div>
              </div>
              <div class="bxg-chart-foot">
                <span>Round history</span>
                <strong id="bxGameRoundCount">Loading…</strong>
              </div>
            </section>


          </section>

          <aside class="bxg-control-column">
            <section class="bxg-play-card">
              <div class="bxg-panel-heading"><div><span class="bxg-eyebrow">PLAY PANEL</span><h2>Place your bet</h2></div></div>
              ${canBet ? `
                <form id="bxGamePlayForm" class="bxg-form">
                  <label for="bxGameBet">Bet amount</label>
                  <div class="bxg-input-wrap"><input id="bxGameBet" type="number" min="${minBetFor(currency)}" step="0.0001" value="${minBetFor(currency)}" required><span id="bxGameCurrencySuffix">${esc(currency)}</span></div>
                  <div class="bxg-quick-bets">
                    <button type="button" data-bx-adjust="half">½</button>
                    <button type="button" data-bx-adjust="double">2×</button>
                    <button type="button" data-bx-adjust="max">MAX</button>
                  </div>
                  <label for="bxGameCurrency">Currency</label>
                  <select id="bxGameCurrency">
                    ${gameAssets.map(asset => `<option value="${asset.code}">${asset.code}</option>`).join("")}
                  </select>
                  ${game.id === "coinflip" ? `
                    <label for="bxGameSide">Choose a side</label>
                    <select id="bxGameSide"><option value="heads">Heads</option><option value="tails">Tails</option></select>
                  ` : game.id === "mines" ? `
                    <label for="bxGameMines">Number of mines</label>
                    <select id="bxGameMines">${[1,2,3,5,8,10,12,15,20,24].map(n => `<option value="${n}" ${n===3?"selected":""}>${n}</option>`).join("")}</select>
                  ` : game.id === "plinko" ? `
                    <label for="bxGameRows">Rows</label><select id="bxGameRows">${[8,12,16].map(n=>`<option value="${n}" ${n===16?"selected":""}>${n}</option>`).join("")}</select>
                    <label for="bxGameRisk">Risk</label><select id="bxGameRisk"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select>
                  ` : game.id === "wheel" ? `
                    <label for="bxGameRisk">Risk</label><select id="bxGameRisk"><option value="low">Low</option><option value="medium" selected>Medium</option><option value="high">High</option></select>
                  ` : game.id === "hilo" ? `
                    <label for="bxGameGuess">Next card</label><select id="bxGameGuess"><option value="higher">Higher</option><option value="lower">Lower</option></select>
                  ` : `
                    <label for="bxGameTarget">${game.id === "limbo" ? "Target multiplier" : "Win threshold"}</label>
                    <input id="bxGameTarget" type="number" min="${game.id === "limbo" ? "1.01" : "0.01"}" max="${game.id === "limbo" ? "1000" : "99.99"}" step="0.01" value="${game.id === "limbo" ? "2" : "50"}" required>
                  `}
                  <button class="bxg-submit" id="bxGameSubmit" type="submit">${game.id === "crash" ? "JOIN CRASH" : "PLAY NOW"} <span>→</span></button>
                  <p class="bxg-security-note">Bets, outcomes and payouts must be confirmed by BLOXIO servers.</p>
                  <p class="bxg-server-note">◇ Server-authoritative gameplay · Client-side results are never trusted.</p>
                </form>
              ` : `
                <div class="bxg-disabled-panel">
                  <span class="bxg-disabled-icon">⌁</span>
                  <h3>Game engine is not connected</h3>
                  <p>This game is listed in the casino catalogue, but its complete server-side round lifecycle, chart feed and settlement handler are not enabled.</p>
                  <span class="bxg-disabled-tag">BETTING DISABLED</span>
                </div>
              `}
              <p class="bxg-result-message" id="bxGameResult" role="status" aria-live="polite">${canBet ? "Ready when you are. Bet validation and settlement are handled by the server." : "Waiting for the verified game engine."}</p>
            </section>

            <section class="bxg-history-card">
              <div class="bxg-panel-heading"><div><span class="bxg-eyebrow">ACTIVITY</span><h2>Recent results</h2></div><span class="bxg-muted">LIVE</span></div>
              <div class="bxg-results-list" id="bxGameHistory" aria-live="polite">
                <div class="bxg-empty-row">Verified results will be listed here when the game feed is connected.</div>
              </div>
            </section>

            <section class="bxg-competition-card">
              <div class="bxg-panel-heading"><div><span class="bxg-eyebrow">COMPETITION</span><h2>Game leaderboard</h2></div></div>
              <div class="bxg-competition-empty">
                <span>♜</span>
                <strong>No active competition data</strong>
                <p>Rankings, prizes and tournament progress will appear after the competition service is connected.</p>
              </div>
            </section>
          </aside>
        </div>
        <footer class="bxg-fair-footer">
          <span>PROVABLY FAIR</span>
          <span>Server seed · Client seed · Nonce · SHA-256</span>
        </footer>
      </div>`;

    loadVerifiedHistory(game.id);
    if (!canBet) return;
    const form = $("bxGamePlayForm");
    const currencySelect = $("bxGameCurrency");
    const amountInput = $("bxGameBet");
    const result = $("bxGameResult");
    const submit = $("bxGameSubmit");
    currencySelect.value = currency;
    Currency.set(currency);
    updateCurrencyFields();
    host.querySelectorAll("[data-bx-game-currency]").forEach(button => {
      button.addEventListener("click", () => {
        const code = button.dataset.bxGameCurrency;
        if (!gameAssets.some(asset => asset.code === code) || !Currency.set(code)) return;
        currencySelect.value = code;
        updateCurrencyFields();
        syncAssetStrip(code);
      });
    });
    currencySelect.addEventListener("change", () => {
      if (!gameAssets.some(asset => asset.code === currencySelect.value) || !Currency.set(currencySelect.value)) {
        currencySelect.value = Currency.get();
        return;
      }
      updateCurrencyFields();
      syncAssetStrip(currencySelect.value);
    });

    function syncAssetStrip(selected) {
      host.querySelectorAll("[data-bx-game-currency]").forEach(button => {
        const active = button.dataset.bxGameCurrency === selected;
        button.classList.toggle("is-active", active);
        if (active) button.setAttribute("aria-current", "true");
        else button.removeAttribute("aria-current");
      });
    }

    function updateCurrencyFields() {
      const selected = currencySelect.value;
      const minimum = minBetFor(selected);
      $("bxGameCurrencySuffix").textContent = selected;
      amountInput.min = String(minimum);
      amountInput.value = String(minimum);
    }

    host.querySelectorAll("[data-bx-adjust]").forEach(button => {
      button.addEventListener("click", () => {
        const min = minBetFor(currencySelect.value);
        const current = Math.max(min, Number(amountInput.value) || min);
        const action = button.dataset.bxAdjust;
        amountInput.value = String(action === "half" ? Math.max(min, current / 2) :
          action === "double" ? current * 2 : current);
      });
    });

    if (game.id === "crash") {
      submit.addEventListener("click", async event => {
        if (submit.dataset.crashJoined !== "true") return;
        event.preventDefault();
        submit.disabled = true;
        result.textContent = "Requesting server cashout…";
        try {
          const response = await GameFactory.get("crash").cashout();
          submit.dataset.crashJoined = "false";
          submit.textContent = "JOIN CRASH →";
          const cashout = response?.result ?? response;
          result.textContent = `Cashout response received from server · Payout: ${cashout?.payout ?? "—"} ${Currency.get()}`;
          loadVerifiedHistory(game.id);
        } catch (error) {
          result.textContent = `Cashout failed: ${error?.message || "Server request error"}`;
        } finally { submit.disabled = false; }
      });
    }

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const amount = Number(amountInput.value);
      const selectedCurrency = currencySelect.value;
      const minimum = minBetFor(selectedCurrency);
      if (!Number.isFinite(amount) || minimum <= 0 || amount < minimum) {
        result.textContent = `Minimum bet for ${selectedCurrency} is ${minimum}.`;
        return;
      }
      const data = { currency: selectedCurrency };
      if (game.id === "coinflip") data.side = $("bxGameSide").value;
      if (game.id === "mines") data.mines = Number($("bxGameMines").value);
      if (game.id === "plinko") { data.rows = Number($("bxGameRows").value); data.risk = $("bxGameRisk").value; }
      if (game.id === "wheel") data.risk = $("bxGameRisk").value;
      if (game.id === "hilo") data.guess = $("bxGameGuess").value;
      if (game.id === "dice") data.target = Number($("bxGameTarget").value);
      if (game.id === "limbo") data.targetMultiplier = Number($("bxGameTarget").value);
      submit.disabled = true;
      result.textContent = game.id === "crash" ? "Joining server round…" : "Submitting bet securely…";
      try {
        Currency.set(selectedCurrency);
        let response;
        if (game.id === "crash") {
          response = await GameFactory.get("crash").start(amount);
          result.textContent = "Crash round joined. Cashout is controlled by the server.";
          submit.textContent = "CASH OUT";
          submit.dataset.crashJoined = "true";
        } else {
          const engine = GameFactory.get(game.id);
          const method = ENGINE_METHODS[game.id];
          if (!engine || !method || typeof engine[method] !== "function") throw new Error("This game engine is not wired.");
          response = await engine[method]({ amount, ...data });
          const settled = response?.result ?? response?.round ?? response;
          result.textContent = settled
            ? `Server response received · Payout: ${settled.payout ?? response?.payout ?? "—"} ${selectedCurrency}`
            : "Bet submitted. Waiting for the server-confirmed round result.";
        }
        loadVerifiedHistory(game.id);
      } catch (error) {
        result.textContent = `Bet failed: ${error?.message || "Server request error"}`;
      } finally {
        submit.disabled = false;
      }
    });
  }

  function init() {
    const host = $("casinoGameContainer");
    const status = $("casinoRuntimeStatus");
    try {
      const game = resolveGame();
      if (!game) {
        if (host) host.innerHTML = `<div class="bxg-not-found"><h1>No game selected</h1><p>Return to the casino lobby and select a game.</p><a href="/pages/casino.html" class="bxg-back-link">← Back to Casino</a></div>`;
        if (status) status.textContent = "No game selected.";
        return;
      }
      renderShell(game);
      document.title = `BLOXIO | ${game.name}`;
      if (status) status.textContent = `${game.name} standalone game page loaded.`;
    } catch (error) {
      console.error("[BLOXIO GAME]", error);
      if (status) status.textContent = "Unable to initialize this game session.";
      if (host) host.innerHTML = `<div class="bxg-not-found"><h2>Game could not be loaded</h2><p>Please return to Casino and try again.</p><a href="/pages/casino.html">Back to Casino</a></div>`;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
