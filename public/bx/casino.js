/* =====================================================
   BLOXIO CASINO ENGINE V6 (12 GAMES)
===================================================== */

(() => {
  "use strict";

  const BX_USD = 45;

  const CASINO = {
    state: {
      wallet: 100, // demo
      currentGame: null,
      isPlaying: false,
      bet: 1,
      auto: false,
    },

    refs: {},

    /* ================= INIT ================= */

    init() {
      this.cache();
      this.bind();
      this.updateWallet();
    },

    cache() {
      this.refs.wallet = document.getElementById("casinoWalletText");
      this.refs.walletUSD = document.getElementById("casinoWalletUSD");
      this.refs.betInput = document.getElementById("betAmountInput");
      this.refs.playBtn = document.getElementById("playBtn");
      this.refs.stage = document.getElementById("casinoGameStage");
    },

    bind() {
      document.querySelectorAll(".bx-game-card").forEach(el => {
        el.onclick = () => this.openGame(el.dataset.game);
      });

      this.refs.playBtn.onclick = () => this.play();

      this.refs.betInput.oninput = e => {
        this.state.bet = Number(e.target.value);
        this.updateBetUSD();
      };
    },

    /* ================= WALLET ================= */

    updateWallet() {
      const bx = this.state.wallet;
      const usd = bx * BX_USD;

      this.refs.wallet.textContent = bx.toFixed(2) + " BX";
      this.refs.walletUSD.textContent = "~$" + usd.toFixed(2);
    },

    updateBetUSD() {
      const usd = this.state.bet * BX_USD;
      document.getElementById("betUSD").textContent = "~$" + usd.toFixed(2);
    },

    debit(x) {
      this.state.wallet -= x;
      this.updateWallet();
    },

    credit(x) {
      this.state.wallet += x;
      this.updateWallet();
    },

    /* ================= GAME FLOW ================= */

    openGame(game) {
      this.state.currentGame = game;
      document.getElementById("view").classList.remove("hidden");

      this.renderStage("Loading " + game + "...");
    },

    play() {
      if (this.state.isPlaying) return;

      const bet = this.state.bet;

      if (bet <= 0 || bet > this.state.wallet) {
        return alert("Invalid bet");
      }

      this.state.isPlaying = true;
      this.debit(bet);

      setTimeout(() => {
        const result = this.runGame(this.state.currentGame, bet);
        this.finish(result);
      }, 500);
    },

    finish(res) {
      this.state.isPlaying = false;

      if (res.win) {
        this.credit(res.payout);
      }

      this.renderStage(res.text);
    },

    /* ================= ENGINE ================= */

    runGame(game, bet) {
      switch (game) {
        case "dice":
          return this.dice(bet);
        case "crash":
          return this.crash(bet);
        case "limbo":
          return this.limbo(bet);
        case "plinko":
          return this.plinko(bet);
        case "coinflip":
          return this.coinflip(bet);
        case "hilo":
          return this.hilo(bet);
        case "blackjack":
          return this.blackjack(bet);
        case "slots":
          return this.slots(bet);
        case "wheel":
          return this.wheel(bet);
        case "keno":
          return this.keno(bet);
        case "airboss":
          return this.airboss(bet);
        case "birds":
          return this.birds(bet);
        default:
          return { win: false, payout: 0, text: "Error" };
      }
    },

    /* ================= 12 GAMES ================= */

    dice(bet) {
      const roll = Math.random() * 100;
      const win = roll > 50;
      return {
        win,
        payout: win ? bet * 2 : 0,
        text: `🎲 ${roll.toFixed(2)} → ${win ? "WIN" : "LOSE"}`
      };
    },

    crash(bet) {
      const mult = (Math.random() * 5).toFixed(2);
      const win = mult > 2;
      return {
        win,
        payout: win ? bet * mult : 0,
        text: `🚀 ${mult}x`
      };
    },

    limbo(bet) {
      const target = 2;
      const hit = Math.random() * 5;
      const win = hit >= target;
      return {
        win,
        payout: win ? bet * target : 0,
        text: `🎯 ${hit.toFixed(2)}x`
      };
    },

    plinko(bet) {
      const mults = [0, 0.5, 1, 2, 5];
      const m = mults[Math.floor(Math.random() * mults.length)];
      return {
        win: m > 1,
        payout: bet * m,
        text: `🔻 ${m}x`
      };
    },

    coinflip(bet) {
      const win = Math.random() > 0.5;
      return {
        win,
        payout: win ? bet * 2 : 0,
        text: `🪙 ${win ? "WIN" : "LOSE"}`
      };
    },

    hilo(bet) {
      const win = Math.random() > 0.5;
      return {
        win,
        payout: win ? bet * 1.8 : 0,
        text: `⬆️ ${win ? "HIGH" : "LOW"}`
      };
    },

    blackjack(bet) {
      const player = 15 + Math.random() * 6;
      const dealer = 15 + Math.random() * 6;
      const win = player > dealer;
      return {
        win,
        payout: win ? bet * 2 : 0,
        text: `🃏 ${player.toFixed(0)} vs ${dealer.toFixed(0)}`
      };
    },

    slots(bet) {
      const win = Math.random() > 0.7;
      return {
        win,
        payout: win ? bet * 5 : 0,
        text: `🎰 ${win ? "JACKPOT" : "LOSE"}`
      };
    },

    wheel(bet) {
      const m = [0, 2, 3, 5][Math.floor(Math.random() * 4)];
      return {
        win: m > 0,
        payout: bet * m,
        text: `🎡 ${m}x`
      };
    },

    keno(bet) {
      const win = Math.random() > 0.6;
      return {
        win,
        payout: win ? bet * 3 : 0,
        text: `🔢 ${win ? "HIT" : "MISS"}`
      };
    },

    airboss(bet) {
      const mult = Math.random() * 10;
      const win = mult > 3;
      return {
        win,
        payout: win ? bet * mult : 0,
        text: `✈️ ${mult.toFixed(2)}x`
      };
    },

    birds(bet) {
      const safe = Math.random() > 0.5;
      return {
        win: safe,
        payout: safe ? bet * 2 : 0,
        text: `💣 ${safe ? "SAFE" : "BOOM"}`
      };
    },

    /* ================= UI ================= */

    renderStage(text) {
      this.refs.stage.innerHTML = `<div style="font-size:20px">${text}</div>`;
    }

  };

  /* ================= START ================= */

  document.addEventListener("DOMContentLoaded", () => {

  console.log("CASINO READY");

  // 🎮 فتح الألعاب
  document.querySelectorAll(".bx-game-card").forEach(el => {
    el.addEventListener("click", () => {
      const game = el.dataset.game;

      console.log("OPEN GAME:", game);

      const view = document.getElementById("casinoGameView");
      view.classList.remove("hidden");

      document.getElementById("gameTitle").textContent = game;

      document.getElementById("casinoGameStage").innerHTML =
        "<div style='color:white'>Playing " + game + "</div>";
    });
  });

  // ▶️ زر Play
  document.getElementById("playBtn")?.addEventListener("click", () => {
    console.log("PLAY CLICK");

    const stage = document.getElementById("casinoGameStage");
    stage.innerHTML = "<div style='color:lime'>Result: " + (Math.random() > 0.5 ? "WIN" : "LOSE") + "</div>";
  });

  // 🔙 رجوع
  document.getElementById("casinoBackBtn")?.addEventListener("click", () => {
    document.getElementById("casinoGameView").classList.add("hidden");
  });

});
