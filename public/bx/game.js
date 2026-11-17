/* BLOXIO GAME SESSION ADAPTER
   ES module: connects game.html to the existing Casino runtime.
   Does not invent game results, odds, balances, or payouts.
*/
import { CasinoApp, GameView, Registry, BUS } from "./casino.js";

const $ = (id) => document.getElementById(id);
const status = $("casinoRuntimeStatus");
const container = $("casinoGameContainer");

function setStatus(message) {
  if (status) status.textContent = message;
}

function getRequestedGame() {
  const params = new URLSearchParams(location.search);
  return params.get("game") || params.get("id") || "";
}

function findGame(id) {
  if (!id || !Registry?.all) return null;
  const normalized = id.toLowerCase();
  return Registry.all().find((game) =>
    String(game.id || game.slug || game.key || "").toLowerCase() === normalized
  ) || null;
}

function startSession() {
  if (!container) return;
  const gameId = getRequestedGame();

  if (!gameId) {
    setStatus("Choose a game from Casino. The selected game will open here when its game identifier is provided.");
    return;
  }

  const game = findGame(gameId);
  if (!game) {
    setStatus(`Game "${gameId}" is not available in the current Casino registry. Return to Casino and choose an available game.`);
    return;
  }

  try {
    if (!CasinoApp.started) CasinoApp.start();

    // The casino's own navigation/runtime remains authoritative.
    if (GameView && typeof GameView.open === "function") {
      GameView.open(game);
      setStatus(`Opening ${game.name || game.title || gameId} in the BLOXIO Casino runtime.`);
      return;
    }

    setStatus("Casino runtime is ready, but this build does not expose a standalone GameView.open adapter.");
  } catch (error) {
    console.error("[BLOXIO GAME]", error);
    setStatus("Unable to start the selected game. Check the browser console and Casino runtime.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startSession, { once: true });
} else {
  startSession();
}

window.BLOXIO_GAME = {
  start: startSession,
  requestedGame: getRequestedGame
};

BUS?.on?.("casino:started", () => {
  if (getRequestedGame()) startSession();
});
