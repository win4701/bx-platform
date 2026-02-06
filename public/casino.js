/* =================================================
   CASINO
================================================= */

const CASINO = {
  history: []
};

const CASINO_GAMES = {
  coinflip: true,
  crash: true,
  limbo: true,
  dice: true,
  slot: true,
  plinko: true,
  hilo: true,
  airboss: true,

  // غير مفعلة
  roulette: false,
  chicken: false,
  fortune: false,
  coins4x4: false
};

/*============== Bind CASINO ================= */
	function bindCasinoGames() {
  document.querySelectorAll("[data-casino-game]").forEach(card => {
    const game = card.dataset.casinoGame;

    if (!CASINO_GAMES[game]) {
      card.classList.add("disabled");
      card.onclick = () => {
        alert(" This game is coming soon");
      };
      return;
    }

    card.onclick = () => startCasinoGame(game);
  });
}
/*=============== Start Casino ================= */
	
async function startCasinoGame(game) {
  if (!isAuthenticated()) {
    alert("Please login first");
    return;
  }

  const bet = Number(prompt(`Enter bet amount for ${game}`));
  if (!bet || bet <= 0) return;

  const payload = {
    uid: USER.uid,
    game,
    bet,
    client_seed: Date.now().toString()
  };

  const res = await safeFetch("/casino/play", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  if (!res) {
    alert("Game failed");
    return;
  }

  alert(
    res.win
      ? ` You WIN!\nPayout: ${res.payout}`
      : ` You lost`
  );

  addCasinoResult();
}

/* ================= INIT CASINO ================= */

function initCasino() {
  bindCasinoGames();   
  addCasinoResult();
  log.info("Casino initialized");
}

/* ================= ADD RESULT ================= */

function addCasinoResult() {
  const win = Math.random() > 2.5;

  CASINO.history.unshift({
    result: win ? "WIN" : "LOSE",
    time: new Date().toLocaleTimeString()
  });

  CASINO.history.splice(8);

  renderCasinoHistory();
}

/* ================= RENDER HISTORY ================= */

function renderCasinoHistory() {
  const el = $("casinoHistory");
  if (!el) return;

  el.innerHTML = CASINO.history
    .map(item => `
      <div class="casino-row ${item.result.toLowerCase()}">
        ${item.result} — ${item.time}
      </div>
    `)
    .join("");
     }
