/* BLOXIO GAME PAGE — server-authoritative session adapter */
"use strict";
import { Registry, BetEngine, Currency, STATE } from "./casino.js";

(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));

  function resolveGame() {
    const params = new URLSearchParams(location.search);
    const id = params.get("game") || params.get("id") || sessionStorage.getItem("bloxio:selected-game");
    return id ? Registry.get(id) : null;
  }

  function render() {
    const host = $("casinoGameContainer"), status = $("casinoRuntimeStatus");
    if (!host) return;
    const game = resolveGame();
    if (!game) {
      host.innerHTML = '<div class="bx-empty-state"><div><h2>No game selected</h2><p>Return to Casino and choose a game to open a standalone session.</p><a class="header-btn secondary" href="/pages/casino.html">Open Casino</a></div></div>';
      if (status) status.textContent = "Select a game from the Casino lobby.";
      return;
    }

    if (game.id === "mines") {
      host.innerHTML = `
        <section class="bx-mines-shell" aria-labelledby="bxMinesTitle">
          <header class="bx-mines-head">
            <div><span class="bx-game-kicker">BLOXIO ORIGINAL</span><h2 id="bxMinesTitle">${esc(game.name)}</h2><p>Choose your risk, reveal safe tiles and cash out when the game engine is enabled.</p></div>
            <span class="bx-engine-status">ENGINE NOT ENABLED</span>
          </header>
          <div class="bx-mines-stage">
            <div class="bx-mines-result" role="status" aria-live="polite">The game result will be displayed here</div>
            <div class="bx-mines-grid" aria-label="5 by 5 Mines board">
              ${Array.from({length:25},(_,i)=>`<button class="bx-mine-tile" type="button" disabled aria-label="Tile ${i+1}"></button>`).join("")}
            </div>
          </div>
          <div class="bx-mines-cases" aria-label="Potential cashout multipliers">
            ${[["Case 1","1.16×"],["Case 2","1.40×"],["Case 3","1.69×"],["Case 4","2.07×"]].map(([name,mult],i)=>`<div class="bx-mines-case ${i===0?"active":""}"><strong>${name}</strong><b>${mult}</b><small>Multiplier preview</small></div>`).join("")}
          </div>
          <div class="bx-mines-controls">
            <button class="bx-mines-play" type="button" disabled>Bet</button>
            <p class="bx-mines-demo-note">ⓘ Betting is unavailable until the server-side Mines round, fairness and settlement engine is implemented.</p>
            <label class="bx-mines-label" for="bxMinesAmount">Bet amount <span>≈ 0</span></label>
            <div class="bx-mines-amount"><span class="bx-mines-currency">$</span><input id="bxMinesAmount" type="number" min="0.1" step="0.0001" value="0" disabled/><button type="button" disabled>½</button><button type="button" disabled>2×</button><button type="button" disabled>⌃⌄</button></div>
            <label class="bx-mines-label" for="bxMinesCount">Number of mines <strong id="bxMinesCountValue">4</strong></label>
            <div class="bx-mines-slider"><span>4</span><input id="bxMinesCount" type="range" min="1" max="24" value="4" disabled/><span>24</span></div>
          </div>
        </section>`;
      if (status) status.textContent = "Mines visual interface loaded. Wagering remains disabled until its trusted game engine is implemented.";
      return;
    }

    const playable = ["dice", "coinflip"].includes(game.id);
    if (!playable) {
      host.innerHTML = `<div class="card"><div class="bx-page-intro"><div><h2>${esc(game.name)}</h2><p>${esc(game.provider || "BLOXIO")} · ${esc(game.category || "Game")}</p></div><a class="header-btn secondary" href="/pages/casino.html">Back to Casino</a></div><p>This title is in the catalogue, but its complete server-authoritative round lifecycle is not enabled. Wagering is disabled until its engine, settlement, limits and fairness checks are implemented.</p></div>`;
      if (status) status.textContent = "Catalogue entry only — wagering disabled.";
      return;
    }

    host.innerHTML = `
      <div class="card">
        <div class="bx-page-intro">
          <div><h2>${esc(game.name)}</h2><p>${esc(game.provider || "BLOXIO")} · Server-authoritative session</p></div>
          <a class="header-btn secondary" href="/pages/casino.html">Back to Casino</a>
        </div>
        <form id="bxGamePlayForm" class="bx-game-controls">
          <label for="bxGameCurrency">Currency</label>
          <select id="bxGameCurrency">
            <option value="BX">BX</option><option value="STR">STR</option>
            <option value="EUBX">EUBX</option><option value="XBC">XBC</option>
          </select>
          <label for="bxGameBet">Bet amount</label>
          <input id="bxGameBet" type="number" min="0.1" step="0.0001" value="1" required />
          ${game.id === "coinflip" ? `
            <label for="bxGameSide">Choose a side</label>
            <select id="bxGameSide"><option value="heads">Heads</option><option value="tails">Tails</option></select>
          ` : `
            <label for="bxGameTarget">Win threshold (0–99.99)</label>
            <input id="bxGameTarget" type="number" min="0.01" max="99.99" step="0.01" value="50" required />
          `}
          <button class="header-btn primary" id="bxGameSubmit" type="submit">Place bet</button>
        </form>
        <p id="bxGameResult" role="status" aria-live="polite">Game is ready. Your bet is processed by the backend.</p>
      </div>`;

    const form = $("bxGamePlayForm");
    const currency = $("bxGameCurrency");
    currency.value = Currency.get();
    currency.addEventListener("change", () => Currency.set(currency.value));
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const button = $("bxGameSubmit"), output = $("bxGameResult");
      const amount = Number($("bxGameBet").value);
      const selectedCurrency = currency.value;
      const minimum = selectedCurrency === "XBC" ? 10 : 0.1;
      if (!Number.isFinite(amount) || amount < minimum) {
        output.textContent = `Minimum bet for ${selectedCurrency} is ${minimum}.`;
        return;
      }
      const data = game.id === "coinflip"
        ? { side: $("bxGameSide").value }
        : { target: Number($("bxGameTarget").value) };
      button.disabled = true;
      output.textContent = "Submitting bet securely…";
      try {
        Currency.set(selectedCurrency);
        const response = await BetEngine.place(amount, game.id, data);
        const result = response?.result;
        output.textContent = result
          ? `Result: ${JSON.stringify(result.result)} · Payout: ${result.payout} ${selectedCurrency}`
          : "Bet accepted for processing. Refresh your history shortly for the settled result.";
      } catch (error) {
        output.textContent = `Bet failed: ${error.message || "Request error"}`;
      } finally {
        button.disabled = false;
      }
    });
    if (status) status.textContent = "Verified server-side handler available for this game.";
  }

  function init() {
    try { render(); }
    catch (error) {
      console.error("[BLOXIO GAME]", error);
      const status = $("casinoRuntimeStatus");
      if (status) status.textContent = "Unable to initialize game session.";
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
