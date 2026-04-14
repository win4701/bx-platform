// =====================================================
// BLOXIO CASINO CORE — PART 1
// 1. CONFIG
// =====================================================

const BLOXIO = (() => {

const CONFIG = {
  VERSION: "1.0.0",

  ECONOMY: {
    BX_TO_USDT: 45,
    MIN_DEPOSIT: 10,
    AIRDROP_BX: 1
  },

  GAME: {
    HOUSE_EDGE: 0.02,
    MAX_BET: 1000,
    MIN_BET: 0.01
  },

  SECURITY: {
    SEED_LENGTH: 32
  },

  API: {
    BASE: "/api"
  }
};
  
// =====================================================
// BLOXIO CASINO CORE — PART 2
// 2. STATE MANAGER
// =====================================================

const STATE = {

  user: {
    id: null,
    username: null
  },

  wallet: {
    BX: 0,
    USDT: 0
  },

  casino: {
    balance: 0
  },

  fairness: {
    clientSeed: null,
    serverSeed: null,
    nonce: 0
  },

  session: {
    isLogged: false,
    token: null
  }

};
// =====================================================
// BLOXIO CASINO CORE — PART 3
// 3. API LAYER
// =====================================================

const API = {

  async request(endpoint, data = {}) {
    try {
      const res = await fetch(`${CONFIG.API.BASE}/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": STATE.session.token ? `Bearer ${STATE.session.token}` : ""
        },
        body: JSON.stringify(data)
      });

      return await res.json();
    } catch (err) {
      console.error("API ERROR", err);
      return null;
    }
  },

  async bet(game, payload) {
    return await this.request("bet", {
      game,
      ...payload
    });
  },

  async getBalance() {
    return await this.request("balance");
  },

  async syncUser() {
    const res = await this.request("me");

    if (!res) return;

    STATE.user.id = res.id;
    STATE.user.username = res.username;

    STATE.wallet.BX = res.walletBX;
    STATE.wallet.USDT = res.walletUSDT;
    STATE.casino.balance = res.casinoBalance;

    STATE.session.isLogged = true;
  }

};

// =====================================================
// BLOXIO CASINO CORE — PART 4
// 4. WALLET ENGINE
// =====================================================

const Wallet = {

  depositUSDT(amount) {
    if (amount < CONFIG.ECONOMY.MIN_DEPOSIT) {
      UI.toast(`Minimum deposit is ${CONFIG.ECONOMY.MIN_DEPOSIT} USDT`);
      return false;
    }

    STATE.wallet.USDT += amount;
    UI.updateWallet();
    return true;
  },

  convertToBX(usdtAmount) {
    if (STATE.wallet.USDT < usdtAmount) {
      UI.toast("Insufficient USDT");
      return false;
    }

    const bx = usdtAmount / CONFIG.ECONOMY.BX_TO_USDT;

    STATE.wallet.USDT -= usdtAmount;
    STATE.wallet.BX += bx;

    UI.updateWallet();
    return true;
  },

  transferToCasino(amount) {
    if (STATE.wallet.BX < amount) {
      UI.toast("Not enough BX");
      return false;
    }

    STATE.wallet.BX -= amount;
    STATE.casino.balance += amount;

    UI.updateWallet();
    UI.updateCasino();
    return true;
  },

  airdrop() {
    STATE.wallet.BX += CONFIG.ECONOMY.AIRDROP_BX;
    this.transferToCasino(CONFIG.ECONOMY.AIRDROP_BX);
  },

  async sync() {
    const res = await API.getBalance();
    if (!res) return;

    STATE.wallet.BX = res.walletBX;
    STATE.wallet.USDT = res.walletUSDT;
    STATE.casino.balance = res.casinoBalance;

    UI.updateWallet();
    UI.updateCasino();
  }

};
// =====================================================
// BLOXIO CASINO CORE — PART 5
// 5. FAIRNESS ENGINE
// =====================================================

const Fairness = {

  init() {
    STATE.fairness.clientSeed = this.generateSeed();
    STATE.fairness.serverSeed = this.generateSeed();
    STATE.fairness.nonce = 0;
  },

  generateSeed() {
    const chars = "abcdef0123456789";
    let seed = "";
    for (let i = 0; i < CONFIG.SECURITY.SEED_LENGTH; i++) {
      seed += chars[Math.floor(Math.random() * chars.length)];
    }
    return seed;
  },

  hash(input) {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  },

  roll() {
    const { clientSeed, serverSeed, nonce } = STATE.fairness;

    const combined = `${clientSeed}:${serverSeed}:${nonce}`;
    const hashed = this.hash(combined);

    STATE.fairness.nonce++;

    return (hashed % 10000) / 100; // 0 - 100
  }

};
// =====================================================
// BLOXIO CASINO CORE — PART 6
// 6. GAME ENGINE
// =====================================================

const GameEngine = {

  placeBet({ game, amount, data }) {

    if (amount < CONFIG.GAME.MIN_BET) {
      return UI.toast("Minimum bet too low");
    }

    if (amount > STATE.casino.balance) {
      return UI.toast("Not enough balance");
    }

    // deduct immediately
    STATE.casino.balance -= amount;
    UI.updateCasino();

    API.bet(game, {
      amount,
      data
    }).then(result => {

      if (!result) {
        UI.toast("Server error");
        return;
      }

      this.resolveBet(result);

    });

  },

  resolveBet(result) {

    const { win, payout, newBalance } = result;

    if (win) {
      STATE.casino.balance = newBalance;
      UI.toast(`Win +${payout} BX`);
    } else {
      UI.toast("Lost");
    }

    UI.updateCasino();
  }

};          
// =====================================================
// BLOXIO CASINO CORE — PART 7
// 7. UI ENGINE
// =====================================================

const UI = {

  updateWallet() {
    const bxEl = document.getElementById("bal-bx");
    const usdtEl = document.getElementById("bal-usdt");

    if (bxEl) bxEl.innerText = this.format(STATE.wallet.BX);
    if (usdtEl) usdtEl.innerText = this.format(STATE.wallet.USDT);
  },

  updateCasino() {
    const el = document.getElementById("casinoWalletText");
    if (el) {
      el.innerText = this.format(STATE.casino.balance) + " BX";
    }
  },

  toast(message) {
    console.log("[BLOXIO]", message);
  },

  format(num, dec = 4) {
    return Number(num || 0).toFixed(dec);
  },

  bindWallet() {

    const depositBtn = document.getElementById("openDepositBtn");
    const withdrawBtn = document.getElementById("openWithdrawBtn");
    const transferBtn = document.getElementById("openTransferBtn");

    if (depositBtn) {
      depositBtn.onclick = () => {
        const amount = parseFloat(prompt("Deposit USDT"));
        if (!isNaN(amount)) Wallet.depositUSDT(amount);
      };
    }

    if (transferBtn) {
      transferBtn.onclick = () => {
        const amount = parseFloat(prompt("Transfer BX to Casino"));
        if (!isNaN(amount)) Wallet.transferToCasino(amount);
      };
    }

  }

};
// =====================================================
// BLOXIO CASINO CORE — PART 8 (REFINED)
// 8. GAMES — HTML ALIGNED + PRO STRUCTURE
// =====================================================

const Games = {

  registry: {},

  register(name, config) {
    this.registry[name] = config;
  },

  play(name, amount, data = {}) {
    const game = this.registry[name];
    if (!game) return UI.toast("Game not found");

    game.play(amount, data);
  }

};


// ===============================
// DICE (data-game="dice")
// ===============================
Games.register("dice", {

  rollOver: true,
  target: 50,

  getMultiplier(target, over) {
    const edge = CONFIG.GAME.HOUSE_EDGE;
    const chance = over ? (100 - target) : target;
    return (100 / chance) * (1 - edge);
  },

  play(amount, data = {}) {

    const target = data.target ?? this.target;
    const rollOver = data.rollOver ?? this.rollOver;

    const multiplier = this.getMultiplier(target, rollOver);

    GameEngine.placeBet({
      game: "dice",
      amount,
      data: { target, rollOver, multiplier }
    });

  }

});


// ===============================
// CRASH (data-game="crash")
// ===============================
Games.register("crash", {

  play(amount, data = {}) {

    const cashoutAt = data.cashoutAt || 2;

    GameEngine.placeBet({
      game: "crash",
      amount,
      data: { cashoutAt }
    });

  }

});


// ===============================
// PLINKO (data-game="plinko")
// ===============================
Games.register("plinko", {

  play(amount, data = {}) {

    const risk = data.risk || "medium";

    GameEngine.placeBet({
      game: "plinko",
      amount,
      data: { risk }
    });

  }

});


// ===============================
// BLACKJACK (data-game="blackjack")
// ===============================
Games.register("blackjack", {

  play(amount) {
    GameEngine.placeBet({
      game: "blackjack",
      amount,
      data: {}
    });
  }

});


// ===============================
// HILO (data-game="hilo")
// ===============================
Games.register("hilo", {

  play(amount) {
    GameEngine.placeBet({
      game: "hilo",
      amount,
      data: {}
    });
  }

});


// ===============================
// COINFLIP (data-game="coinflip")
// ===============================
Games.register("coinflip", {

  play(amount, data = {}) {

    const side = data.side || "heads";

    GameEngine.placeBet({
      game: "coinflip",
      amount,
      data: { side }
    });

  }

});


// ===============================
// LIMBO (data-game="limbo")
// ===============================
Games.register("limbo", {

  play(amount, data = {}) {

    const target = data.target || 2;

    GameEngine.placeBet({
      game: "limbo",
      amount,
      data: { target }
    });

  }

});


// ===============================
// SLOTS (data-game="slots")
// ===============================
Games.register("slots", {

  play(amount) {
    GameEngine.placeBet({
      game: "slots",
      amount,
      data: {}
    });
  }

});


// ===============================
// BRIDS / MINES (data-game="brids")
// ===============================
Games.register("brids", {

  play(amount, data = {}) {

    const mines = data.mines || 3;

    GameEngine.placeBet({
      game: "brids",
      amount,
      data: { mines }
    });

  }

});


// ===============================
// FRUIT PARTY (data-game="fruitparty")
// ===============================
Games.register("fruitparty", {

  play(amount) {
    GameEngine.placeBet({
      game: "fruitparty",
      amount,
      data: {}
    });
  }

});


// ===============================
// BANANA FARM (data-game="bananafarm")
// ===============================
Games.register("bananafarm", {

  play(amount) {
    GameEngine.placeBet({
      game: "bananafarm",
      amount,
      data: {}
    });
  }

});


// ===============================
// AIRBOSS (data-game="airboss")
// ===============================
Games.register("airboss", {

  play(amount, data = {}) {

    const cashoutAt = data.cashoutAt || 2;

    GameEngine.placeBet({
      game: "airboss",
      amount,
      data: { cashoutAt }
    });

  }

});


// ===============================
// UI BINDING (AUTO FROM HTML)
// ===============================
UI.bindCasino = function () {

  const buttons = document.querySelectorAll(".casino-game-card");

  buttons.forEach(btn => {

    btn.onclick = () => {

      const game = btn.dataset.game;

      const amount = parseFloat(prompt(`Play ${game} - Enter BX amount`));

      if (!amount || amount <= 0) return;

      Games.play(game, amount);

    };

  });

};


// ===============================
// INIT EXTEND
// ===============================
const __initOld = typeof Init !== "undefined" ? Init.start : null;

if (typeof Init !== "undefined") {
  Init.start = function () {

    if (__initOld) __initOld();

    UI.bindCasino();

  };
}
// =====================================================
// BLOXIO CASINO CORE — PART 8.5
// GAME VIEWS SYSTEM (OPEN REAL GAME SCREENS)
// =====================================================

const GameViews = {

  current: null,

  open(game) {

    this.current = game;

    const lobby = document.getElementById("casinoLobby");
    if (lobby) lobby.style.display = "none";

    let view = document.getElementById("gameView");

    if (!view) {
      view = document.createElement("div");
      view.id = "gameView";
      view.className = "game-view";
      document.getElementById("casino").appendChild(view);
    }

    view.innerHTML = this.render(game);

    this.bind(game);
  },

  close() {
    const lobby = document.getElementById("casinoLobby");
    const view = document.getElementById("gameView");

    if (view) view.remove();
    if (lobby) lobby.style.display = "block";
  },

  render(game) {

    return `
      <div class="game-header">
        <button id="gameBackBtn">← Back</button>
        <h2>${game.toUpperCase()}</h2>
      </div>

      <div class="game-body">

        <input id="gameAmount" type="number" placeholder="Bet BX" />

        <button id="gamePlayBtn">PLAY</button>

        <div id="gameResult"></div>

      </div>
    `;
  },

  bind(game) {

    document.getElementById("gameBackBtn").onclick = () => {
      this.close();
    };

    document.getElementById("gamePlayBtn").onclick = () => {

      const amount = parseFloat(document.getElementById("gameAmount").value);

      if (!amount) return UI.toast("Enter amount");

      Games.play(game, amount);

    };

  }

};


// ===============================
// OVERRIDE CASINO CLICK
// ===============================
const __oldBindCasino = UI.bindCasino;

UI.bindCasino = function () {

  const cards = document.querySelectorAll(".casino-game-card");

  cards.forEach(card => {

    card.onclick = () => {

      const game = card.dataset.game;

      GameViews.open(game);

    };

  });

};
// =====================================================
// BLOXIO CASINO CORE — PART 9 (UPGRADED)
// 9. TELEGRAM + REALTIME + EVENTS SYSTEM
// =====================================================

const Realtime = {

  socket: null,

  connect() {
    try {
      this.socket = new WebSocket(`wss://${location.host}/ws`);

      this.socket.onopen = () => {
        console.log("WS CONNECTED");
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handle(msg);
        } catch (e) {}
      };

      this.socket.onclose = () => {
        setTimeout(() => this.connect(), 3000);
      };

    } catch (e) {
      console.log("WS FAIL");
    }
  },

  handle(msg) {

    if (msg.type === "balance") {
      STATE.casino.balance = msg.balance;
      UI.updateCasino();
    }

    if (msg.type === "stats") {
      const online = document.getElementById("casinoOnlineText");
      const volume = document.getElementById("casinoVolumeText");

      if (online) online.innerText = msg.online;
      if (volume) volume.innerText = msg.volume + " BX";
    }

  }

};


const Telegram = {

  app: null,

  init() {
    if (!window.Telegram || !window.Telegram.WebApp) return;

    this.app = window.Telegram.WebApp;

    this.app.ready();
    this.app.expand();

    this.setupUser();
    this.bindUI();
  },

  setupUser() {
    const user = this.app.initDataUnsafe?.user;

    if (!user) return;

    STATE.user.id = user.id;
    STATE.user.username = user.username || user.first_name;

    API.request("telegram-auth", {
      id: user.id,
      username: STATE.user.username
    }).then(res => {
      if (res?.token) {
        STATE.session.token = res.token;
        STATE.session.isLogged = true;
      }
    });
  },

  bindUI() {

    const mainBtn = this.app.MainButton;

    mainBtn.setText("OPEN CASINO");
    mainBtn.show();

    mainBtn.onClick(() => {
      document.getElementById("casino")?.classList.add("active");
    });

  },

  haptic(type = "impact") {
    try {
      this.app.HapticFeedback.impactOccurred(type);
    } catch (e) {}
  }

};


// ===============================
// GLOBAL EVENT BUS
// ===============================
const Events = {

  events: {},

  on(name, cb) {
    if (!this.events[name]) this.events[name] = [];
    this.events[name].push(cb);
  },

  emit(name, data) {
    if (!this.events[name]) return;
    this.events[name].forEach(cb => cb(data));
  }

};


// ===============================
// SOUND SYSTEM (HTML READY)
// ===============================
const Sound = {

  play(id) {
    const el = document.getElementById(id);
    if (!el) return;

    try {
      el.currentTime = 0;
      el.play();
    } catch (e) {}
  },

  click() { this.play("snd-click"); },
  win() { this.play("snd-win"); },
  lose() { this.play("snd-lose"); },
  spin() { this.play("snd-spin"); }

};


// ===============================
// GAME ENGINE HOOKS (UPGRADE)
// ===============================
const __oldResolve = GameEngine.resolveBet;

GameEngine.resolveBet = function(result) {

  if (result.win) {
    Sound.win();
    Telegram.haptic("medium");
  } else {
    Sound.lose();
    Telegram.haptic("light");
  }

  Events.emit("bet:resolved", result);

  __oldResolve.call(this, result);
};  
    // ===============================
    // TELEGRAM
    // ===============================
    if (typeof Telegram !== "undefined") {
      Telegram.init();
    }

    // ===============================
    // USER SYNC
    // ===============================
    if (API && API.syncUser) {
      await API.syncUser();
    }

    // ===============================
    // FAIRNESS
    // ===============================
    if (typeof Fairness !== "undefined") {
      Fairness.init();
    }

    // ===============================
    // WALLET SYNC
    // ===============================
    if (Wallet && Wallet.sync) {
      await Wallet.sync();
    }

    // ===============================
    // AIRDROP AUTO
    // ===============================
    const claimed = localStorage.getItem("bloxio_airdrop");

    if (!claimed) {
      Wallet.airdrop();
      localStorage.setItem("bloxio_airdrop", "1");
    }

    // ===============================
    // UI BINDINGS
    // ===============================
    if (UI) {
      UI.updateWallet();
      UI.updateCasino();

      if (UI.bindWallet) UI.bindWallet();
      if (UI.bindCasino) UI.bindCasino();
    }

    console.log("BLOXIO READY");
  }

};


// ===============================
// AUTO START
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  Init.start();
});  
