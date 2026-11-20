/* BLOXIO GAME ARENA — standalone responsive game session */
"use strict";

import { Registry, BetEngine, Currency, CasinoAPI } from "./casino.js";
import { createBloxioChartEngine } from "./chart.games.js";

(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
  const MIN_BETS = { BX: 0.1, STR: 0.1, EUBX: 0.1, XBC: 10 };
  const ACTIVE_HANDLERS = new Set(["dice", "coinflip"]);
  const CHART_ENGINE = createBloxioChartEngine();

  function resolveGame() {
    const params = new URLSearchParams(location.search);
    const id = params.get("game") || params.get("id");
    return id ? Registry.get(id) : null;
  }

  function gameArtwork(game) {
    return game.image || "/assets/images/casino/roulette.webp";
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
        height: 300,
        responsive: true,
        showVolume: true,
        currency: Currency.get(),
        theme: {
          background: "#051411",
          text: "#F4F7F5",
          grid: "rgba(140,163,157,.12)",
          accent: "#D4AF37"
        }
      });
      const response = await CasinoAPI.history();
      const sessions = Array.isArray(response) ? response : (response?.sessions || []);
      const rows = sessions
        .filter(row => row && row.game === gameId && row.created_at)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const records = rows.map(row => {
        const bet = Math.max(0, Number(row.bet) || 0);
        const payout = Math.max(0, Number(row.payout) || 0);
        const multiplier = Number(row.multiplier) || (bet > 0 ? payout / bet : 0);
        const timestamp = new Date(row.created_at).getTime();
        if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
        return {
          gameId,
          roundId: String(row.id ?? `${gameId}-${timestamp}`),
          timestamp,
          currency: null,
          result: multiplier,
          metadata: { bet, payout, outcome: row.result ?? null }
        };
      }).filter(Boolean);
      if (records.length) {
        CHART_ENGINE.ingestMany(records);
        CHART_ENGINE.refresh(gameId, { currency: Currency.get() });
        empty.hidden = true;
        canvas.hidden = false;
        count.textContent = `${records.length} verified rounds`;
        history.innerHTML = rows.slice(-6).reverse().map(row => {
          const value = row.multiplier ?? (Number(row.bet) > 0 ? Number(row.payout) / Number(row.bet) : null);
          const stamp = new Date(row.created_at).toLocaleString();
          return `<div class="bxg-result-row"><span>${esc(stamp)}</span><strong>${value == null ? "—" : `${Number(value).toFixed(2)}×`}</strong></div>`;
        }).join("");
      } else {
        canvas.hidden = true;
        empty.hidden = false;
        chartStatus.textContent = "Waiting for verified round data";
        count.textContent = "0 verified rounds";
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
    const canBet = ACTIVE_HANDLERS.has(game.id);
    const currency = Currency.get();
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

            <section class="bxg-history-card">
              <div class="bxg-panel-heading"><div><span class="bxg-eyebrow">ACTIVITY</span><h2>Recent results</h2></div><span class="bxg-muted">LIVE</span></div>
              <div class="bxg-results-list" id="bxGameHistory" aria-live="polite">
                <div class="bxg-empty-row">Verified results will be listed here when the game feed is connected.</div>
              </div>
            </section>
          </section>

          <aside class="bxg-control-column">
            <section class="bxg-play-card">
              <div class="bxg-panel-heading"><div><span class="bxg-eyebrow">PLAY PANEL</span><h2>Place your bet</h2></div></div>
              ${canBet ? `
                <form id="bxGamePlayForm" class="bxg-form">
                  <label for="bxGameBet">Bet amount</label>
                  <div class="bxg-input-wrap"><input id="bxGameBet" type="number" min="${MIN_BETS[currency] || 0.1}" step="0.0001" value="${MIN_BETS[currency] || 0.1}" required><span id="bxGameCurrencySuffix">${esc(currency)}</span></div>
                  <div class="bxg-quick-bets">
                    <button type="button" data-bx-adjust="half">½</button>
                    <button type="button" data-bx-adjust="double">2×</button>
                    <button type="button" data-bx-adjust="max">MAX</button>
                  </div>
                  <label for="bxGameCurrency">Currency</label>
                  <select id="bxGameCurrency">
                    <option value="BX">BX</option><option value="STR">STR</option>
                    <option value="EUBX">EUBX</option><option value="XBC">XBC</option>
                  </select>
                  ${game.id === "coinflip" ? `
                    <label for="bxGameSide">Choose a side</label>
                    <select id="bxGameSide"><option value="heads">Heads</option><option value="tails">Tails</option></select>
                  ` : `
                    <label for="bxGameTarget">Win threshold</label>
                    <input id="bxGameTarget" type="number" min="0.01" max="99.99" step="0.01" value="50" required>
                  `}
                  <button class="bxg-submit" id="bxGameSubmit" type="submit">PLACE BET <span>→</span></button>
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
    updateCurrencyFields();
    currencySelect.addEventListener("change", () => {
      Currency.set(currencySelect.value);
      updateCurrencyFields();
    });

    function updateCurrencyFields() {
      const selected = currencySelect.value;
      $("bxGameCurrencySuffix").textContent = selected;
      amountInput.min = String(MIN_BETS[selected] || 0.1);
      amountInput.value = String(MIN_BETS[selected] || 0.1);
    }

    host.querySelectorAll("[data-bx-adjust]").forEach(button => {
      button.addEventListener("click", () => {
        const min = MIN_BETS[currencySelect.value] || 0.1;
        const current = Math.max(min, Number(amountInput.value) || min);
        const action = button.dataset.bxAdjust;
        amountInput.value = String(action === "half" ? Math.max(min, current / 2) :
          action === "double" ? current * 2 : current);
      });
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const amount = Number(amountInput.value);
      const selectedCurrency = currencySelect.value;
      const minimum = MIN_BETS[selectedCurrency] || 0.1;
      if (!Number.isFinite(amount) || amount < minimum) {
        result.textContent = `Minimum bet for ${selectedCurrency} is ${minimum}.`;
        return;
      }
      const data = game.id === "coinflip"
        ? { side: $("bxGameSide").value }
        : { target: Number($("bxGameTarget").value) };
      submit.disabled = true;
      result.textContent = "Submitting bet securely…";
      try {
        Currency.set(selectedCurrency);
        const response = await BetEngine.place(amount, game.id, data);
        const settled = response?.result;
        result.textContent = settled
          ? `Verified result: ${JSON.stringify(settled.result)} · Payout: ${settled.payout ?? "—"} ${selectedCurrency}`
          : "Bet submitted. Waiting for the server-confirmed round result.";
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
