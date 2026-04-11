/* =========================================================
   BLOXIO CASINO V7 — PRO ENGINE
   Architecture: Core + Engine + Controller + UI
========================================================= */

(() => {
  "use strict";

  const BX_USD = 45;

  /* ================= CORE ================= */

  const CORE = {
    state: {
      wallet: 100,
      currentGame: null,
      isPlaying: false,
      bet: 1,
      history: []
    },

    getBalance() {
      return this.state.wallet;
    },

    debit(x) {
      this.state.wallet -= x;
    },

    credit(x) {
      this.state.wallet += x;
    }
  };

  /* ================= ENGINE ================= */

  const ENGINE = {

    play(game, bet) {
      switch (game) {
        case "dice": return this.dice(bet);
        case "crash": return this.crash(bet);
        case "limbo": return this.limbo(bet);
        case "plinko": return this.plinko(bet);
        case "coinflip": return this.coinflip(bet);
        case "hilo": return this.hilo(bet);
        case "blackjack": return this.blackjack(bet);
        case "slots": return this.slots(bet);
        case "wheel": return this.wheel(bet);
        case "keno": return this.keno(bet);
        case "airboss": return this.airboss(bet);
        case "birds": return this.birds(bet);
      }
    },

    dice(bet) {
      const roll = Math.random() * 100;
      const win = roll > 50;
      return { win, payout: win ? bet * 2 : 0, text: `🎲 ${roll.toFixed(2)}` };
    },

    crash(bet) {
      const mult = 1 + Math.random() * 5;
      const win = mult > 2;
      return { win, payout: win ? bet * mult : 0, text: `🚀 ${mult.toFixed(2)}x` };
    },

    limbo(bet) {
      const hit = Math.random() * 5;
      const win = hit >= 2;
      return { win, payout: win ? bet * 2 : 0, text: `🎯 ${hit.toFixed(2)}x` };
    },

    plinko(bet) {
      const m = [0, 0.5, 1, 2, 5][Math.floor(Math.random()*5)];
      return { win: m>1, payout: bet*m, text: `🔻 ${m}x` };
    },

    coinflip(bet) {
      const win = Math.random() > 0.5;
      return { win, payout: win?bet*2:0, text: "🪙" };
    },

    hilo(bet) {
      const win = Math.random() > 0.5;
      return { win, payout: win?bet*1.8:0, text: "⬆️⬇️" };
    },

    blackjack(bet) {
      const p = 15 + Math.random()*6;
      const d = 15 + Math.random()*6;
      const win = p > d;
      return { win, payout: win?bet*2:0, text: `🃏 ${p.toFixed(0)} vs ${d.toFixed(0)}` };
    },

    slots(bet) {
      const win = Math.random() > 0.7;
      return { win, payout: win?bet*5:0, text: "🎰" };
    },

    wheel(bet) {
      const m = [0,2,3,5][Math.floor(Math.random()*4)];
      return { win: m>0, payout: bet*m, text: `🎡 ${m}x` };
    },

    keno(bet) {
      const win = Math.random() > 0.6;
      return { win, payout: win?bet*3:0, text: "🔢" };
    },

    airboss(bet) {
      const m = Math.random()*10;
      return { win: m>3, payout: m>3?bet*m:0, text: `✈️ ${m.toFixed(2)}x` };
    },

    birds(bet) {
      const safe = Math.random()>0.5;
      return { win: safe, payout: safe?bet*2:0, text: safe?"SAFE":"BOOM" };
    }
  };

  /* ================= CONTROLLER ================= */

  const CONTROLLER = {

    play() {
      if (CORE.state.isPlaying) return;

      const bet = CORE.state.bet;

      if (bet <= 0 || bet > CORE.getBalance()) {
        return UI.toast("Invalid bet");
      }

      CORE.state.isPlaying = true;
      CORE.debit(bet);
      UI.updateWallet();

      setTimeout(() => {
        const res = ENGINE.play(CORE.state.currentGame, bet);
        this.finish(res, bet);
      }, 300);
    },

    finish(res, bet) {
      CORE.state.isPlaying = false;

      if (res.win) {
        CORE.credit(res.payout);
      }

      CORE.state.history.unshift(res);

      UI.updateWallet();
      UI.renderResult(res);
    }
  };

  /* ================= UI ================= */

  const UI = {

    init() {
      this.cache();
      this.bind();
      this.updateWallet();
    },

    cache() {
      this.wallet = document.getElementById("casinoWalletText");
      this.walletUSD = document.getElementById("casinoWalletUSD");
      this.betInput = document.getElementById("betAmountInput");
      this.stage = document.getElementById("casinoGameStage");
    },

    bind() {

      // 🎮 games
      document.addEventListener("click", e => {

        const card = e.target.closest(".bx-game-card");
        if (card) {
          CORE.state.currentGame = card.dataset.game;
          this.openGame(card.dataset.game);
        }

        if (e.target.id === "playBtn") {
          CONTROLLER.play();
        }

        if (e.target.id === "casinoBackBtn") {
          this.closeGame();
        }

      });

      this.betInput.oninput = e => {
        CORE.state.bet = Number(e.target.value);
        this.updateBetUSD();
      };
    },

    openGame(game) {
      document.getElementById("casinoGameView").classList.remove("hidden");
      document.getElementById("gameTitle").textContent = game;
      this.stage.innerHTML = "Loading " + game;
    },

    closeGame() {
      document.getElementById("casinoGameView").classList.add("hidden");
      CORE.state.isPlaying = false;
    },

    renderResult(res) {
      this.stage.innerHTML =
        `<div style="font-size:20px">
          ${res.text}<br>
          ${res.win ? "WIN" : "LOSE"}
        </div>`;
    },

    updateWallet() {
      const bx = CORE.state.wallet;
      this.wallet.textContent = bx.toFixed(2) + " BX";
      this.walletUSD.textContent = "~$" + (bx * BX_USD).toFixed(2);
    },

    updateBetUSD() {
      document.getElementById("betUSD").textContent =
        "~$" + (CORE.state.bet * BX_USD).toFixed(2);
    },

    toast(msg) {
      alert(msg);
    }

  };

  /* ================= START ================= */

  document.addEventListener("DOMContentLoaded", () => {
    UI.init();
  });

})();
