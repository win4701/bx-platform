"use strict";

/* ================= BACKEND CONFIG ================= */

const API_BASE = "https://api.bloxio.online";
const WS_BASE = "wss://api.bloxio.online";

/* =========================================================
   PART 1 — CORE / CONFIG / DEBUG
========================================================= */

const $ = (id) => document.getElementById(id);
const $$ = (selector) => document.querySelectorAll(selector);

/* ================= DEBUG MODE ================= */

const DEBUG = (() => {
  try {
    if (location.search.includes("debug=1")) return true;
    if (localStorage.getItem("DEBUG") === "1") return true;
  } catch (e) {}
  return false;
})();

/* ================= LOGGER ================= */

const log = {
  info(...args) {
    if (DEBUG) console.log("[INFO]", ...args);
  },
  warn(...args) {
    if (DEBUG) console.warn("[WARN]", ...args);
  },
   
  error(...args) {
  console.error("[ERROR]", ...args);
  }  
};

/* ================= USER / AUTH ================= */

const USER = {
  token: null,
  authenticated: false,

  /* ================= LOAD ================= */
   
  load() {
    try {
      const token = localStorage.getItem("token");

      if (token && typeof token === "string" && token.length > 10) {
        this.token = token;
        this.authenticated = true;
        log.info("TOKEN loaded");
      } else {
        this.clear();
      }

    } catch (e) {
      log.warn("TOKEN load failed");
      this.clear();
    }
  },

  /* ================= SET ================= */
  set(token) {
    if (!token || typeof token !== "string") return;

    this.token = token;
    this.authenticated = true;

    try {
      localStorage.setItem("token", token);
    } catch (e) {
      log.warn("TOKEN save failed");
    }

    log.info("TOKEN saved");
  },

  /* ================= CLEAR ================= */
  clear() {
    this.token = null;
    this.authenticated = false;

    try {
      localStorage.removeItem("token");
    } catch (e) {}

    log.info("TOKEN cleared");
  },

  /* ================= VALIDATION ================= */
  isValid() {
    return !!this.token && this.token.length > 10;
  }
};

/* ================= HELPERS ================= */

function isAuthenticated() {
  return USER.isValid();
}

function authHeaders() {
  return USER.token
    ? { Authorization: "Bearer " + USER.token }
    : {};
}
    log.info("APP initialized");
  }
};

/* ================= SAFE FETCH ================= */

async function safeFetch(path, options = {}) {

  if (options.body && typeof options.body !== "string") {
    options.body = JSON.stringify(options.body);
  }

  const headers = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...(options.headers || {})
  };

  try {

    const res = await fetch(API_BASE + path, {
      ...options,
      headers
    });

    if (!res.ok) {
      log.warn("API error:", path, res.status);
      return null;
    }

    return await res.json();

  } catch (e) {
    log.error("Network error:", path);
    return null;
  }
}

/* ================= APP view ================= */

const APP = {
  view: null,

  init() {
    console.log("APP started");
    USER.load();
  }
};

/* =========================================================
   PART 2 — NAVIGATION ( SPA ENGINE PRO )
================================================*/

const SPA = {

  current: null,

  routes: {

    wallet: {
      onEnter: () => loadWallet(),
      onExit: () => {}
    },

    market: {
      onEnter: () => initMarket?.(),
      onExit: () => stopMarket?.()
    },

    casino: {
      onEnter: () => initCasino?.(),
      onExit: () => {
        if (window.CASINO?.ws) CASINO.ws.close();
      }
    },

    mining: {
      onEnter: () => renderMining(),
      onExit: () => {}
    },

    airdrop: {
      onEnter: () => loadAirdrop(),
      onExit: () => {}
    }

  },

  init() {

    this.bindNav();

    // start
    setTimeout(() => {
      this.navigate("wallet");
    }, 50);

  },

  navigate(route) {

    if (!this.routes[route]) {
      console.error("Route not found:", route);
      return;
    }

    if (this.current === route) return;

    // exit previous
    if (this.current && this.routes[this.current]) {
      this.routes[this.current].onExit?.();
    }

    this.current = route;

    // render UI
    this.render(route);

    // enter new
    this.routes[route].onEnter?.();

  },

  render(route) {

    // views
    document.querySelectorAll(".view").forEach(v => {
      v.classList.remove("active");
    });

    const el = document.getElementById(route);
    if (el) el.classList.add("active");

    // nav buttons
    document.querySelectorAll(".bottom-nav button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === route);
    });

  },

  bindNav() {

    document.querySelectorAll(".bottom-nav button").forEach(btn => {

      btn.onclick = () => {
        const view = btn.dataset.view;
        this.navigate(view);
      };

    });

  }

};

  

/* =========================================================
   PART 3 — WALLET (General Update)
========================================================= */

const WALLET = {
  BX: 0,
  USDT: 0,
  USDC: 0,
  BTC: 0,
  BNB: 0,
  ETH: 0,
  AVAX: 0,
  ZEC: 0,
  TON: 0,
  SOL: 0,
  LTC: 0,
  loaded: false
};

/* ================= DOM MAP ================= */

const WALLET_DOM = {
  BX: "bal-bx",
  USDT: "bal-usdt",
  USDC: "bal-usdc",
  BTC: "bal-btc",
  BNB: "bal-bnb",
  ETH: "bal-eth",
  AVAX: "bal-avax",
  ZEC: "bal-zec",
  TON: "bal-ton",
  SOL: "bal-sol",
  LTC: "bal-ltc",
};

/* ================= RENDER ================= */

function renderWallet() {
  let total = 0;

  Object.keys(WALLET_DOM).forEach(symbol => {
    const el = $(WALLET_DOM[symbol]);
    if (!el) return;

    const value = Number(WALLET[symbol] || 0);
    el.textContent = value.toFixed(2);
    if(symbol === "BX") total += value;
  });

  const totalEl = $("walletTotal");
  if (totalEl) {
    totalEl.textContent = total.toFixed(2);
  }
}


    async function loadWallet() {

  if (!isAuthenticated()) {
    log.warn("Wallet: not authenticated");
    return;
  }

  const data = await safeFetch("/finance/wallet");

  if (!data) {
    log.warn("Wallet load failed");
    return;
  }

  Object.keys(WALLET).forEach(k => {
    if (data[k] !== undefined) {
      WALLET[k] = Number(data[k]);
    }
  });

  renderWallet();
  }

/* ======================================================
   CONNECT WALLET – SSOT (TON + EVM)
====================================================== */

const WALLET_STATE = {
  type: null,          // ton | evm
  address: null,
  connected: false
};

/* ================= UI RENDER ================= */

function renderWalletButtons() {

  const wcBtn = document.getElementById("walletConnectBtn");
  const binanceBtn = document.getElementById("binanceConnectBtn");

  /* ===== WalletConnect ===== */

  if (wcBtn) {

    wcBtn.classList.toggle("connected", WALLET_STATE.connected);

    wcBtn.textContent = WALLET_STATE.connected
      ? `Connected`
      : `WalletConnect`;

  }

  /* ===== Binance Pay ===== */

  if (binanceBtn) {

    binanceBtn.disabled = false;
    binanceBtn.textContent = "Binance Pay";

    binanceBtn.onclick = async () => {

      try{

        const amount = prompt("Enter amount (USDT)");

        if (!amount || Number(amount) <= 0) {
          return alert("Invalid amount");
        }

        const res = await safeFetch("/payments/binance/create", {
          method: "POST",
          body: {
            amount: Number(amount),
            asset: "USDT"
          }
        });

        if (!res) {
          return alert("Payment failed");
        }

        /* ===== Binance Response Handling ===== */

        const url =
          res.data?.checkoutUrl ||
          res.checkoutUrl ||
          res.url;

        if (!url) {
          console.error("Invalid Binance response", res);
          return alert("Payment link error");
        }

        /* ===== OPEN PAYMENT ===== */

        window.open(url, "_blank");

      }catch(e){
        console.error(e);
        alert("Binance Pay error");
      }

    };

  }
}

/* ================= TON WALLETCONNECT ================= */

let tonConnectUI = null;

function initTonConnect() {
  if (!window.TON_CONNECT_UI) return;

  tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: "https://www.bloxio.online/tonconnect-manifest.json",
    buttonRootId: "walletConnectBtn"
  });

  tonConnectUI.onStatusChange(wallet => {
    if (!wallet) return;

    WALLET_STATE.type = "ton";
    WALLET_STATE.address = wallet.account.address;
    WALLET_STATE.connected = true;

    saveWalletSession();
    notifyBackend();
    renderWalletButtons();

    console.log("TON connected:", WALLET_STATE.address);
  });
}

/* ================= EVM WALLETCONNECT ================= */

async function connectEVM(){

  try{

    const provider = new WalletConnectProvider.default({
      rpc: {
        1: "https://rpc.ankr.com/eth",
        56: "https://rpc.ankr.com/bsc"
      }
    });

    await provider.enable();

    const web3 = new Web3(provider);

    const accounts = await web3.eth.getAccounts();

    WALLET_STATE.type = "evm";
    WALLET_STATE.address = accounts[0];
    WALLET_STATE.connected = true;

    saveWalletSession();
    notifyBackend();
    renderWalletButtons();

    alert("Wallet Connected: " + accounts[0]);

  }catch(e){
    alert("Wallet connect failed");
  }

}

/* ================= SESSION ================= */

function saveWalletSession() {
  localStorage.setItem("wallet_session", JSON.stringify(WALLET_STATE));
}

function restoreWalletSession() {
  const saved = localStorage.getItem("wallet_session");
  if (!saved) return;

  try {
    const data = JSON.parse(saved);
    Object.assign(WALLET_STATE, data);
  } catch {}
}

/* ================= BACKEND SYNC ================= */

async function notifyBackend() {

  try{

    await safeFetch("/finance/wallet/connect",{
      method:"POST",
      body:{
        type: WALLET_STATE.type,
        address: WALLET_STATE.address
      }
    });

  }catch(e){
    log.warn("Wallet sync failed");
  }
}
/* ================= WITHDRAW ================= */

async function requestWithdraw(asset, amount, toAddress) {
  if (!WALLET_STATE.connected) {
    alert("Connect wallet first");
    return;
  }

  const res = await safeFetch("/finance/withdraw", {
    method: "POST",
    body: JSON.stringify({
      asset,
      amount,
      address: toAddress
    })
  });

  if (!res) {
    alert("Withdraw failed");
    return;
  }

  alert(res.message || "Withdraw submitted");
}

/* ================= DEPOSIT ================= */

function getDepositAddress(asset) {

  if (!WALLET_STATE.connected) return null;

  return safeFetch(`/finance/deposit/${asset}`, {
    method: "GET"
  });
}

/* ================= EVENTS ================= */

function bindWalletUI() {
  const wcBtn = document.getElementById("walletConnectBtn");

  if (wcBtn) {
    wcBtn.addEventListener("click", () => {
      if (window.TON_CONNECT_UI) {
        initTonConnect();
      } else {
        connectEVM();
      }
    });
  }
}

/* ================= Bin WALLET ===============*/

function bindWalletActions() {

  const depositBtn = document.querySelector(".wallet-actions .primary");
  const withdrawBtn = document.querySelectorAll(".wallet-actions .btn")[1];

  if (depositBtn) {
    depositBtn.onclick = async () => {
      const res = await safeFetch(`/finance/deposit/USDT`);
      if (!res) return alert("Failed to load deposit address");
      const addr = res.address || res.deposit_address || "Not available";
      alert(`Deposit Address:\n${addr}`);
    };
  }

  if (withdrawBtn) {
    withdrawBtn.onclick = async () => {
      const amount = prompt("Amount?");
      const address = prompt("Destination address?");
      if (!amount || !address) return;

      const res = await safeFetch("/finance/withdraw", {
        method: "POST",
        body: JSON.stringify({
          asset: "USDT",
          amount: parseFloat(amount),
          address
        })
      });

      if (!res) return alert("Withdraw failed");
      alert("Withdraw submitted");
    };
  }
   const transferBtn = document.querySelector(".wallet-transfer .confirm");

if (transferBtn) {

  transferBtn.onclick = async () => {

    const user = document.getElementById("transferTelegram").value;
    const amount = Number(document.getElementById("transferAmount").value);

    if (!user || !amount) return alert("Invalid transfer");

    const res = await safeFetch("/finance/transfer", {
      method: "POST",
      body: JSON.stringify({
        to_user: user,
        asset: "BX",
        amount: amount
      })
    });

    if (!res) return alert("Transfer failed");

    alert("Transfer sent");
    loadWallet();
  };
  }
 }

/* ================= INIT TÉLÉGRAMME ===============*/

async function initTelegramLogin() {

  if (!window.Telegram || !window.Telegram.WebApp) {
    console.warn("Telegram WebApp not detected");
    return;
  }

  const tg = window.Telegram.WebApp;
  tg.ready();

  const user = tg.initDataUnsafe?.user;

  if (!user) {
    console.warn("No Telegram user");
    return;
  }

  try {

    const res = await safeFetch("/auth/telegram", {
      method: "POST",
      body: {
        telegram_id: user.id,
        username: user.username,
        first_name: user.first_name
      }
    });

    if (!res || !res.token) {
      console.error("Login failed", res);
      return;
    }

    USER.set(res.token);

    console.log(" Logged in:", res.user);

    await loadWallet();

  } catch (e) {
    console.error("Telegram login error", e);
  }
}

/* =========================================
GLOBAL WS CONNECTION
========================================= */

let ws;

function connectWS(){

  if(ws) return;

  ws = new WebSocket(WS_BASE);

  ws.onopen = () => {

    console.log("✅ WS Connected");

    ws.send(JSON.stringify({ type:"subscribe", channel:"market" }));
    ws.send(JSON.stringify({ type:"subscribe", channel:"casino" }));
    ws.send(JSON.stringify({ type:"subscribe", channel:"system" }));

  };

  ws.onmessage = (event)=>{

    try{
      const msg = JSON.parse(event.data);
      handleWSMessage(msg);
    }catch(e){
      console.error("WS parse error");
    }

  };

  ws.onclose = ()=>{

    console.log(" WS Disconnected");

    ws = null;

    setTimeout(connectWS, 2000);

  };

}

/* =========================================
WS HANDLER
========================================= */

function handleWSMessage(msg){

  /* ===== MARKET ===== */
  if(msg.channel === "market"){

    if(msg.type === "tick"){

      if(typeof marketPrice !== "undefined"){
        marketPrice = msg.price;
      }

      if(typeof updatePriceUI === "function"){
        updatePriceUI();
      }

      if(typeof generateOrderBook === "function"){
        generateOrderBook();
        renderOrderBook();
      }

      if(window.PRO_CHART){
        PRO_CHART.update(msg.price);
      }

    }

  }

  /* ===== CASINO ===== */
  if(msg.channel === "casino"){

    if(msg.type === "big_win"){

      const box = document.getElementById("crashPlayers");
      if(!box) return;

      const el = document.createElement("div");

      el.innerText = `🔥 ${msg.user} won ${msg.amount} BX`;
      el.style.color = "#22c55e";

      box.prepend(el);

    }

  }

  /* ===== SYSTEM ===== */
  if(msg.channel === "system"){

    console.log("📊 System:", msg.services);

  }

}

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", async () => {

  USER.load();
  SPA.init(); 
  connectWS();
  restoreWalletSession();
  bindWalletUI();
  bindWalletActions();
  renderWalletButtons();
  await initTelegramLogin();

});

/* =================================== */

const CASINO = {
  currentGame: null,
  flags: {},
  ws: null
 };

/* =====================================================
   GAME UI SCHEMA (12 GAMES)
===================================================== */

const GAME_UI = {
  coinflip: ["bet"],
  crash: ["bet", "multiplier"],
  limbo: ["bet", "multiplier"],
  dice: ["bet", "multiplier"],
  slot: ["bet"],
  plinko: ["bet", "multiplier"],
  hilo: ["bet", "choice"],
  airboss: ["bet", "multiplier"],
  fruit_party: ["bet"],
  banana_farm: ["bet"],
  blackjack_fast: ["bet"],
  birds_party: ["bet"]
};

/* =====================================================
   SOUND FX (Telegram-friendly)
===================================================== */

const sounds = {
  win: new Audio("/assets/sounds/win.mp3"),
  lose: new Audio("/assets/sounds/lose.mp3")
};

function playSound(type) {
  try {
    sounds[type].currentTime = 0;
    sounds[type].play();
  } catch (_) {}
}

/* =====================================================
   CARD ANIMATION (WIN / LOSE)
===================================================== */

function animateGameResult(game, win) {
  const card = document.querySelector(`.game[data-game="${game}"]`);
  if (!card) return;

  card.classList.remove("win", "lose");
  card.classList.add(win ? "win" : "lose");

  setTimeout(() => {
    card.classList.remove("win", "lose");
  }, 900);
}

/* =====================================================
   BIND CASINO CARDS
===================================================== */

function bindCasinoGames() {
  document.querySelectorAll(".game[data-game]").forEach(card => {
    const game = card.dataset.game;

    if (CASINO.flags[game] === false) {
      card.classList.add("disabled");
      card.onclick = () => alert(" Game disabled");
      return;
    }

    card.classList.remove("disabled");
    card.onclick = () => openCasinoGame(game);
  });
}

/* =====================================================
   OPEN GAME
===================================================== */

function openCasinoGame(game) {

  CASINO.currentGame = game;

  document.querySelectorAll(".game").forEach(g =>
    g.classList.remove("active")
  );

  const card = document.querySelector(`.game[data-game="${game}"]`);
  if (card) card.classList.add("active");

  /* ================= CRASH SPECIAL ================= */

  if (game === "crash") {

    const box = document.getElementById("casinoGameBox");

    box.innerHTML = `
      <div id="crashGame">

        <canvas id="crashChart" width="600" height="300"></canvas>

        <h1 id="crashMultiplier">1.00x</h1>

        <button id="crashBetBtn">BET</button>
        <button id="crashCashoutBtn">CASHOUT</button>

        <div id="crashPlayers"></div>

      </div>
    `;

    if (window.initCrash) {
      setTimeout(() => {
        window.initCrash();
      }, 100);
    }

    return; 
  }

  /* ================= OTHER GAMES ================= */

  renderGameUI(game);
 }

/* =====================================================
   RENDER GAME UI
===================================================== */

function renderGameUI(game) {
  const box = $("casinoGameBox");
  if (!box) return;

  const fields = GAME_UI[game] || ["bet"];
  let html = `<h3>${game.replace("_", " ").toUpperCase()}</h3>`;

  fields.forEach(f => {
    if (f === "choice") {
      html += `
        <select id="choice">
          <option value="high">High</option>
          <option value="low">Low</option>
        </select>`;
    } else {
      html += `<input id="${f}" type="number" placeholder="${f}">`;
    }
  });

  html += `<button id="playBtn">Play</button>`;
  box.innerHTML = html;

  $("playBtn").onclick = startCasinoGame;
}

/* =====================================================
   START GAME
===================================================== */

async function startCasinoGame() {
  if (!isAuthenticated()) {
    alert("Please login first");
    return;
  }

  const game = CASINO.currentGame;
  if (!game) return;

  const bet = Number($("bet")?.value || 0);
  if (bet <= 0) {
    alert("Invalid bet");
    return;
  }

  const payload = {
    game,
    bet,
    multiplier: Number($("multiplier")?.value || null),
    choice: $("choice")?.value || null,
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

  handleCasinoResult(res);
}

/* =====================================================
   HANDLE RESULT
===================================================== */

function handleCasinoResult(res) {

  animateGameResult(res.game, res.win);

  playSound(res.win ? "win" : "lose");

  if (typeof res.payout === "number" && typeof res.bet === "number") {
  WALLET.BX += (res.payout - res.bet);
}
  renderWallet();

  alert(
    res.win
      ? `WIN!\nPayout: ${res.payout}`
      : `LOSE`
  );
}

/* =====================================================
   BIG WINS — WEBSOCKET TICKER
===================================================== */

function initBigWinsTicker() {
  try {

    CASINO.ws = new WebSocket(`${WS_BASE}/ws/big-wins`);
     
    CASINO.ws.onmessage = e => {
      const w = JSON.parse(e.data);
      pushBigWin(w);
    };

  } catch (_) {}
}

function pushBigWin(w){

  const box = document.getElementById("bigWinsList");

  if(!box) return;

  const row = document.createElement("div");

  row.className = "big-win-row";

  row.innerHTML = `
    <span>${w.user}</span>
    <span>${w.game}</span>
    <strong>+${w.amount} BX</strong>
  `;

  box.prepend(row);

  if(box.children.length > 20){
    box.removeChild(box.lastChild);
  }
 }
   
/* =====================================================
   GAME FLAGS (ADMIN LIVE TOGGLE)
===================================================== */

async function refreshGameFlags() {
  const res = await safeFetch("/casino/flags");
  if (!res) return;

  CASINO.flags = res;
  bindCasinoGames();
}

/* =====================================================
   INIT
===================================================== */

function initCasino() {
  refreshGameFlags();
  initBigWinsTicker();

  CASINO.flagsInterval = setInterval(refreshGameFlags,10000);
  console.info("Casino initialized");
}
  
/* =========================================================
   PART 5 — MINING (Per-Coin Plans)
========================================================= */

const MINING = {
  coin: "BX",
  subscription: null // { coin, planId }
};

/* ================= PLANS BY COIN ================= */

const MINING_PLANS_BY_COIN = {
  BX: [
    { id:"p10", name:"Starter",  days:10, roi:2.5, min:5,   max:60  },
    { id:"p21", name:"Basic",    days:21, roi:5,   min:50,   max:250  },
    { id:"p30", name:"Golden",   days:30, roi:8,   min:200,  max:800  },
    { id:"p45", name:"Pro", days:45, roi:12,  min:400,  max:2500 },
    { id:"p60", name:"Platine",  days:60, roi:17,  min:750,  max:9000 },
    { id:"p90", name:"Infinity", days:90, roi:25,  min:1000, max:20000, sub:true }
  ],

  SOL: [
    { id:"p10", name:"Starter",  days:10, roi:1,   min:1,    max:5   },
    { id:"p21", name:"Basic",    days:21, roi:2.8, min:10,   max:50  },
    { id:"p30", name:"Golden",   days:30, roi:4,   min:40,   max:160 },
    { id:"p45", name:"Pro", days:45, roi:7,   min:120,  max:500 },
    { id:"p60", name:"Platine",  days:60, roi:9,   min:200,  max:1000 },
    { id:"p90", name:"Infinity", days:90, roi:14,  min:500,  max:2500, sub:true }
  ],

  BNB: [
    { id:"p10", name:"Starter",  days:10, roi:0.8, min:0.05, max:1   },
    { id:"p21", name:"Basic",    days:21, roi:1.8, min:1,    max:4   },
    { id:"p30", name:"Golden",   days:30, roi:3,   min:5,    max:50  },
    { id:"p45", name:"Pro", days:45, roi:5,   min:10,   max:100 },
    { id:"p60", name:"Platine",  days:60, roi:7,   min:15,   max:150 },
    { id:"p90", name:"Infinity", days:90, roi:11,  min:25,   max:200, sub:true }
  ]
};

/* ================= ENTRY ================= */

function renderMining() {
  bindMiningTabs();
  renderMiningPlans();
}

/* ================= COIN TABS ================= */

function bindMiningTabs() {
  const buttons = $$(".mining-tabs button");

  buttons.forEach(btn => {
    const coin = btn.dataset.coin;
    if (!MINING_PLANS_BY_COIN[coin]) return;

    btn.classList.toggle("active", coin === MINING.coin);

    btn.onclick = () => {
      if (MINING.coin === coin) return;
      MINING.coin = coin;
      renderMining();
      log.info("Mining coin switched:", coin);
    };
  });
}

/* ================= PLANS RENDER ================= */

function renderMiningPlans() {
  const grid = $("miningGrid");
  if (!grid) return;

  const plans = MINING_PLANS_BY_COIN[MINING.coin] || [];
  grid.innerHTML = "";

  plans.forEach(plan => {
    const isActive =
      MINING.subscription &&
      MINING.subscription.coin === MINING.coin &&
      MINING.subscription.planId === plan.id;

    const card = document.createElement("div");
    card.className = "card mining-plan";

    card.innerHTML = `
      <h3>
        ${plan.name}
        ${plan.sub ? '<span class="sub-tag">SUB</span>' : ''}
      </h3>
      <div class="mining-profit">${plan.roi}%</div>
      <ul>
        <li>Time: ${plan.days} days</li>
        <li>Min: ${plan.min} ${MINING.coin}</li>
        <li>Max: ${plan.max} ${MINING.coin}</li>
      </ul>
      <button ${isActive ? "disabled" : ""}>
        ${isActive ? "Active" : "Subscribe"}
      </button>
    `;

    card.querySelector("button").onclick = () => {
      if (!isActive) subscribeMining(plan.id);
    };

    grid.appendChild(card);
  });
}

/* ================= SUBSCRIBE ================= */

async function subscribeMining(planId) {

  if(!isAuthenticated()){
    alert("Please login first");
    return;
  }

  const amount = Number(prompt("Amount to mine"));
   
if (!Number.isFinite(amount) || amount <= 0) {
  alert("Invalid amount");
  return;
}
  const res = await safeFetch("/mining/subscribe", {
    method: "POST",
    body: JSON.stringify({
      coin: MINING.coin,
      plan_id: planId,
      amount: Number(amount)
    })
  });

  if (!res) {
    alert("Mining failed");
    return;
  }

  alert("Mining started");

  MINING.subscription = {
    coin: MINING.coin,
    planId
  };

  renderMining();
  loadWallet();
}

/* =========================================================
   AIRDROP SYSTEM (FINAL FIXED)
========================================================= */

const AIRDROP = {
  reward: 0,
  referrals: 0,
  refReward: 0,
  claimed: false,
  refCode: null
};

/* ================= LOAD ================= */

async function loadAirdrop(){

  if (!isAuthenticated()) {
    renderAirdrop(); // 👈 مهم
    return;
  }
   
  try{

    const res = await safeFetch("/airdrop/status");

    if (!res) return;

    AIRDROP.reward     = res.reward || 0;
    AIRDROP.referrals  = res.referrals || 0;
    AIRDROP.refReward  = res.ref_reward || 0;
    AIRDROP.claimed    = res.claimed || false;
    AIRDROP.refCode    = res.ref_code || null;

    renderAirdrop();

  }catch(e){
    console.error("Airdrop load error", e);
  }
}

/* ================= RENDER ================= */

function renderAirdrop(){

  /* ===== REWARD ===== */
  const rewardEl = document.getElementById("airdropReward");
  if (rewardEl){
    rewardEl.innerText = "+" + AIRDROP.reward + " BX";
  }

  /* ===== STATS ===== */
  const stats = document.getElementById("airdrop-ref-stats");
  if (stats){
    stats.innerText =
      `Referrals: ${AIRDROP.referrals} · Each = ${AIRDROP.refReward} BX`;
  }

  /* ===== REF LINK ===== */
  const linkEl = document.getElementById("ref-link-airdrop");

  if (linkEl){
    const link = generateReferralLink();
    linkEl.innerText = link || "Login required";
  }

  /* ===== BUTTON ===== */
  const btn = document.getElementById("claimAirdropBtn");

  if (btn){
    if (AIRDROP.claimed){
      btn.innerText = "Claimed";
      btn.disabled = true;
    } else {
      btn.innerText = `Claim ${AIRDROP.reward} BX`;
      btn.disabled = false;
    }
  }
}

/* ================= CLAIM ================= */

async function claimAirdrop(){

  if (!isAuthenticated()){
    alert("Login first");
    return;
  }

  try{

    const res = await safeFetch("/airdrop/claim", {
      method: "POST"
    });

    if (!res){
      alert("Claim failed");
      return;
    }

    if (res.status === "ok"){

      alert(`Claimed ${res.reward} BX`);

      await loadAirdrop();

      if (typeof loadWallet === "function"){
        loadWallet();
      }

    } else {
      alert("Already claimed");
    }

  }catch(e){
    console.error("Claim error", e);
  }
}

/* ================= REFERRAL ================= */

function generateReferralLink(){

  if (!AIRDROP.refCode) return null;

  return `${location.origin}?ref=${AIRDROP.refCode}`;
}

/* ================= COPY ================= */

function copyReferral(){

  const link = generateReferralLink();

  if (!link){
    alert("No referral link");
    return;
  }

  navigator.clipboard.writeText(link);

  alert("Copied!");
}

/* ================= EVENTS ================= */

document.addEventListener("click", (e)=>{

  if (e.target.id === "claimAirdropBtn"){
    claimAirdrop();
  }

  if (e.target.id === "copyRefBtn"){
    copyReferral();
  }

});

/* ================= HELPERS ================= */

function apiGet(url){
  return safeFetch(url, { method: "GET" });
}

function apiPost(url, body = {}){
  return safeFetch(url, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

/*=========================================================
   AIRDROP / TOPUP v6 — INSTITUTIONAL CLEAN
=========================================================*/

const BX_REFERENCE = 45; // BX = 38 USDT (internal anchor)
const MIN_USDT = 5;

const STATE = {
  fiat: 0,
  usdt: 0,
  bx: 0,
  rate: 0,
  lockedUntil: 0,
  country: "",
  provider: "",
  phone: "",
  hedgeCost: 0
};

const TOPUP_STATS = {
  reserve:100000,
  exposure:0
};

/* ================= INIT ================= */

function initTopupV6() {
  const confirm = document.getElementById("topup-confirm");

  if (confirm) confirm.onclick = confirmTopup;
}

/* ================= SAFE FETCH BINANCE ================= */

async function fetchP2P(fiat) {
  try {
    const res = await fetch(
      "https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset: "USDT",
          fiat,
          tradeType: "SELL",
          page: 1,
          rows: 5
        })
      }
    );

    const data = await res.json();
    const prices = data.data.map(x => parseFloat(x.adv.price));
     if(!data?.data?.length) return 1;
    return prices.reduce((a,b)=>a+b,0) / prices.length;

  } catch {
    return 1;
  }
}

/* ================= CALCULATE ================= */

async function calculate() {

  const amount = parseFloat(document.getElementById("topup-amount")?.value);
  const country = document.getElementById("topup-country")?.value;
  const provider = document.getElementById("topup-provider")?.value;
  const phone = document.getElementById("topup-phone")?.value;
   if(!phone) return renderError("Phone required");

  if (!amount || amount <= 0) return;

  const p2p = await fetchP2P(country);

  const volatility = 0.01;
  const risk = 0.03;

  const baseRate = p2p * (1 + volatility + risk);

  const usdt = amount / baseRate;

  if (usdt < MIN_USDT) {
    renderError("Minimum 5 USDT");
    return;
  }

  const bx = usdt / BX_REFERENCE;

  STATE.fiat = amount;
  STATE.usdt = usdt;
  STATE.bx = bx;
  STATE.rate = baseRate;
  STATE.country = country;
  STATE.provider = provider;
  STATE.phone = phone;
  STATE.lockedUntil = Date.now() + 20000;

  render();
}


/* ================= RENDER ================= */

function render() {

  const box = document.getElementById("topup-result");
  if (!box) return;

  box.innerHTML = `
    <div class="topup-card">
      <div>Rate: ${STATE.rate.toFixed(4)}</div>
      <div>USDT: <b>${STATE.usdt.toFixed(2)}</b></div>
      <div>BX: <b>${STATE.bx.toFixed(4)}</b></div>
      <div class="lock"></div>
    </div>
  `;

  countdown();
}


/* ================= LOCK ================= */

function countdown() {
  const el = document.querySelector(".lock");
  if (!el) return;

  const int = setInterval(() => {
    const left = Math.floor((STATE.lockedUntil - Date.now()) / 1000);
    if (left <= 0) {
      el.innerText = "Expired";
      clearInterval(int);
      return;
    }
    el.innerText = `Lock ${left}s`;
  }, 1000);
}


/* ================= CONFIRM ================= */

async function confirmTopup() {

  if (Date.now() > STATE.lockedUntil) {
    toast("Rate expired");
    return;
  }

  if (STATE.usdt > TOPUP_STATS.reserve) {
  toast("Reserve insufficient");
  return;
}
  TOPUP_STATS.reserve -= STATE.usdt;
  TOPUP_STATS.exposure += STATE.usdt;

  await safeFetch("/topup/execute", {
  method: "POST",
  body: JSON.stringify(STATE)
});

  saveHistory();
  toast("Topup Executed");
}


/* ================= HISTORY ================= */

function saveHistory() {
  const list = JSON.parse(localStorage.getItem("topupHistory") || "[]");
  list.unshift({ ...STATE, time: Date.now() });
  localStorage.setItem("topupHistory", JSON.stringify(list.slice(0,50)));
}


/* ================= ERROR ================= */

function renderError(msg) {
  const box = document.getElementById("topup-result");
  if (box) box.innerHTML = `<div class="error">${msg}</div>`;
}


/* ================= TOAST ================= */

function toast(msg) {
  console.log(msg);
}
   
// ===============================
 // CASINO
 // ===============================

async function openCasino(){

    const data = await safeFetch("/casino/play",{
        method:"POST",
        body: JSON.stringify({ bet:1 })
    });

    alert("Result: " + data.result);
}

// ===============================
 // WALLET
 // ===============================

async function openWallet(){

    const data = await safeFetch("/finance/wallet");

    alert("BX Balance: " + data.BX);
}


// ===============================
 // MINING
 // ===============================

async function openMining(){

    const data = await safeFetch("/mining/start");

    alert(data.status);
}

// ===============================
 // MARKET
 // ===============================

async function openMarket(){

    const r = await safeFetch("/exchange/stats");

    const data = r;
    console.log(data);

    alert("Market loaded");

}
