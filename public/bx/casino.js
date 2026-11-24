
/* BLOXIO unified SVG icon adapter — safe when the icon library is not loaded. */
const BLOXIO_ICON = (() => {
  const get = (kind, code, options) => {
    const api = window.BLOXIO_ICONS;
    if (!api) return "";
    const fn = api[kind];
    if (typeof fn !== "function") return "";
    try { return fn.call(api, code, options); } catch (_) { return ""; }
  };
  return Object.freeze({
    token: (code, fallback = "", options = { extension: "png" }) => get("token", code, options) || fallback,
    game: (code, fallback = "") => get("game", code) || fallback,
    casino: (code, fallback = "") => get("casino", code) || fallback,
    commodity: (code, fallback = "") => get("commodity", code) || fallback,
    flag: (code, fallback = "", options = { width: 40 }) => get("flag", code, options) || fallback,
    action: (code, fallback = "") => get("action", code) || fallback
  });
})();

/* =========================================================
   BLOXIO CASINO V4.0 — ENTERPRISE REBUILD
   Central WS • Backend-authoritative • Lifecycle-safe
   ========================================================= */

"use strict";

// تأكد من مسار ملف games.js (إذا كان في نفس المجلد استخدم "./games.js")
import { CASINO_COINS, MIN_BETS } from "./data/coins.js";
import { CASINO_GAMES } from "./data/games.js";
import { createBloxioChartEngine, createBloxioFullscreenController } from "./chart.games.js";
 

/* =========================================================
   1. HELPERS
   ========================================================= */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.min(Math.max(Number(value) || 0, min), max);
const safeNumber = value => { const number = Number(value); return Number.isFinite(number) ? number : 0; };
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

const STORAGE = { SETTINGS: "bloxio_casino_settings", STATE: "bloxio_casino_state" };
const API = { games: "/api/casino/games", play: "/api/casino/play", history: "/api/casino/history", verify: "/api/casino/verify", crashJoin: "/api/casino/crash/join", crashCashout: "/api/casino/crash/cashout" };

/* =========================================================
   2. EVENT BUS
   ========================================================= */

class EventBus {
    constructor() { this.events = new Map(); }
    on(name, callback) { if (typeof callback !== "function") return () => {}; if (!this.events.has(name)) this.events.set(name, new Set()); this.events.get(name).add(callback); return () => this.off(name, callback); }
    off(name, callback) { this.events.get(name)?.delete(callback); }
    emit(name, payload) { this.events.get(name)?.forEach(callback => { try { callback(payload); } catch (error) { console.error(`[CASINO BUS:${name}]`, error); } }); }
    clear() { this.events.clear(); }
}

export const BUS = new EventBus();

/* =========================================================
   3. STATE
   ========================================================= */

export const STATE = {
    ready: false, booted: false, version: "4.0.0", currency: "BX", online: false, activeGame: null, activeView: "lobby",
    wallet: Object.fromEntries(CASINO_COINS.map(code => [code, 0])) ,
    user: { id: null, username: null, vip: 0, level: 1, verified: false },
    casino: { onlinePlayers: 0, games: [], featured: [], jackpots: {}, leaderboard: [], tournaments: [], providers: [] },
    filters: { search: "", category: "all", provider: "all" },
    feeds: { live: [], winners: [], bigWins: [] },
    analytics: { wagered: 0, won: 0, lost: 0, profit: 0, bets: 0, wins: 0, losses: 0 },
    runtime: { socket: false, pixi: false, audio: false, charts: false }
};

/* =========================================================
   4. SETTINGS
   ========================================================= */

export const Settings = {
    sound: true, music: false, animations: true, currency: "BX", theme: "dark",
    load() { try { const data = JSON.parse(localStorage.getItem(STORAGE.SETTINGS) || "{}"); this.sound = data.sound !== false; this.music = data.music === true; this.animations = data.animations !== false; this.currency = CASINO_COINS.includes(data.currency) ? data.currency : "BX"; this.theme = data.theme || "dark"; } catch (error) { console.warn("[CASINO SETTINGS]", error); } },
    save() { try { localStorage.setItem(STORAGE.SETTINGS, JSON.stringify({ sound: this.sound, music: this.music, animations: this.animations, currency: this.currency, theme: this.theme })); } catch (error) { console.warn("[CASINO SETTINGS]", error); } }
};

/* =========================================================
   5. PERSISTENCE
   ========================================================= */

export const Persistence = {
    saveState() { try { localStorage.setItem(STORAGE.STATE, JSON.stringify({ currency: STATE.currency, analytics: STATE.analytics })); } catch (error) { console.warn("[CASINO STATE]", error); } },
    loadState() { try { const data = JSON.parse(localStorage.getItem(STORAGE.STATE) || "{}"); if (data.currency && CASINO_COINS.includes(data.currency)) STATE.currency = data.currency; if (data.analytics && typeof data.analytics === "object") Object.assign(STATE.analytics, data.analytics); } catch (error) { console.warn("[CASINO STATE]", error); } }
};

/* =========================================================
   6. WALLET DISPLAY ADAPTER
   ========================================================= */

export const Wallet = {
    get(currency = STATE.currency) { return safeNumber(STATE.wallet[currency]); },
    set(currency, value) { if (!CASINO_COINS.includes(currency)) return false; STATE.wallet[currency] = safeNumber(value); BUS.emit("wallet:update", STATE.wallet); return true; },
    sync(balances = {}) { for (const currency of CASINO_COINS) { if (balances[currency] !== undefined) { STATE.wallet[currency] = safeNumber(typeof balances[currency] === "object" ? balances[currency].available : balances[currency]); } } BUS.emit("wallet:update", STATE.wallet); },
    credit() { console.warn("[CASINO] Wallet changes must be confirmed by backend."); return false; },
    debit() { console.warn("[CASINO] Wallet changes must be confirmed by backend."); return false; }
};

/* =========================================================
   7. CURRENCY
   ========================================================= */

export const Currency = {
    supported: [...CASINO_COINS],
    set(currency) { if (!this.supported.includes(currency)) return false; STATE.currency = currency; Settings.currency = currency; Settings.save(); BUS.emit("currency:change", currency); return true; },
    get() { return STATE.currency; },
    minBet(currency = STATE.currency) { return Number(MIN_BETS[currency]) || 0.1; }
};

/* =========================================================
   8. GAME REGISTRY
   ========================================================= */

export const Registry = {
    games: [],
    init() {
        this.games = Array.isArray(CASINO_GAMES) ? CASINO_GAMES : [];
        STATE.casino.games = this.games;
        STATE.casino.featured = this.games.filter(game => game.featured);
        STATE.casino.providers = [...new Set(this.games.map(game => game.provider || "BLOXIO"))];
        return this.games;
    },
    all() { return this.games; },
    featured() { return STATE.casino.featured; },
    get(id) { return this.games.find(game => game.id === id); },
    search(term = "") { const value = term.toLowerCase(); return this.games.filter(game => `${game.name || ""} ${game.category || ""} ${game.provider || ""}`.toLowerCase().includes(value)); },
    
    // تم تحديث هذه الدالة لتفهم التصنيفات المفردة
    category(category = "all") {
        if (category === "all") return this.games;
        
        // خريطة تحويل من صيغة الجمع (في HTML) إلى المفرد (في games.js)
        const aliases = { originals: "original", slots: "slot", cards: "card" };
        const target = aliases[category] || category;
        
        return this.games.filter(game => game.category === target);
    },
    provider(provider = "all") { return provider === "all" ? this.games : this.games.filter(game => game.provider === provider); }
};

/* =========================================================
   9. ANALYTICS
   ========================================================= */

export const Analytics = {
    bet(amount) { STATE.analytics.bets++; STATE.analytics.wagered += safeNumber(amount); this.save(); },
    win(amount) { STATE.analytics.wins++; STATE.analytics.won += safeNumber(amount); this.recalculate(); },
    loss(amount) { STATE.analytics.losses++; STATE.analytics.lost += safeNumber(amount); this.recalculate(); },
    recalculate() { STATE.analytics.profit = STATE.analytics.won - STATE.analytics.lost; this.save(); },
    save() { Persistence.saveState(); }
};

/* =========================================================
   10. BACKEND API
   ========================================================= */

export const CasinoAPI = {
    async request(path, options = {}) {
        const token = localStorage.getItem("token");
        const headers = { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers };
        const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
        const contentType = response.headers.get("content-type") || "";
        const data = contentType.includes("application/json") ? await response.json() : await response.text();
        if (!response.ok) { const error = new Error(data?.message || data?.error || `HTTP ${response.status}`); error.status = response.status; error.data = data; throw error; }
        return data;
    },
    get(path) { return this.request(path); },
    post(path, payload) { return this.request(path, { method: "POST", body: JSON.stringify(payload) }); },
    async play(payload) {
        const key = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
        return this.request(API.play, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Idempotency-Key": key },
            body: JSON.stringify({ ...payload, currency: payload?.currency || Currency.get() })
        });
    },
    async history() { return this.get(API.history); },
    async games() { return this.get(API.games); },
    async crashJoin(payload) { return this.post(API.crashJoin, payload); },
    async crashCashout(payload) { return this.post(API.crashCashout, payload); },
    async verify(payload) { return this.post(API.verify, payload); }
};

/* =========================================================
   11. CASINO CORE
   ========================================================= */

export const CasinoCore = {
    boot() { if (STATE.booted) return; Settings.load(); Persistence.loadState(); STATE.currency = Settings.currency || STATE.currency; Registry.init(); STATE.booted = true; BUS.emit("core:booted", STATE); },
    start() { if (STATE.ready) return; this.boot(); STATE.ready = true; BUS.emit("casino:ready", STATE); },
    destroy() { STATE.ready = false; STATE.booted = false; BUS.emit("casino:destroyed"); }
};

/* =========================================================
   12. DOM REFERENCES
   ========================================================= */

export const DOM = {
    gamesGrid: $("#casinoGamesGrid"), featuredTrack: $("#casinoFeaturedTrack"), searchInput: $("#casinoSearch"), gameView: $("#casinoGameView"), gameContainer: $("#casinoGameContainer"), leaderboard: $("#casinoLeaderboard"), leaderboardTop3: $("#casinoLeaderboardTop3"), liveFeed: $("#casinoTickerTrack"), liveWinners: $("#casinoLiveWinners"), winnerTrack: $("#casinoLiveWinnerTrack"), tournaments: $("#casinoTournamentList"), tournamentCountdown: $("#casinoTournamentCountdown"), bigWins: $("#bigWinsTrack"), bigWinStats: $("#casinoBigWinStats"), bxBalance: $("#casinoBXBalance"), strBalance: $("#casinoSTRBalance"), eubxBalance: $("#casinoEUBXBalance"), xbcBalance: $("#casinoXBCBalance"), gamesCount: $("#casinoGamesCount"), onlinePlayers: $("#casinoOnlineText"), volume: $("#casinoVolumeText"), catOriginals: $("#catOriginals"), catArcade: $("#catArcade"), catCards: $("#catCards"), catSlots: $("#catSlots"), catRoulette: $("#catRoulette"), jackpotCrash: $("#jackpotCrash"), jackpotMines: $("#jackpotMines"), jackpotPlinko: $("#jackpotPlinko"), jackpotWheel: $("#jackpotWheel")
};

/* =========================================================
   13. TEMPLATES
   ========================================================= */

export const Templates = {
    game(game) {
        return `<button class="casino-game-card" type="button" data-game="${escapeHTML(game.id)}" data-category="${escapeHTML(game.category || "all")}">
            <div class="casino-game-cover"><img loading="lazy" src="${escapeHTML(game.image || (window.BLOXIO_ICONS ? (BLOXIO_ICON.casino(game.id) || BLOXIO_ICON.game(game.id)) : ""))}" alt="${escapeHTML(game.name || "Casino game")}" onerror="this.style.visibility='hidden'"></div>
            <div class="casino-game-body">
                <h3>${escapeHTML(game.name)}</h3>
                <p>${escapeHTML(game.provider || "BLOXIO")}</p>
                <div class="casino-game-meta"><span>${escapeHTML(game.category || "casino")}</span><span>RTP ${escapeHTML(game.rtp ?? "—")}${game.rtp != null ? "%" : ""}</span></div>
            </div></button>`;
    },
    featured(game) { return `<button class="casino-featured-card" type="button" data-game="${escapeHTML(game.id)}"><img loading="lazy" src="${escapeHTML(game.image || (window.BLOXIO_ICONS ? (BLOXIO_ICON.casino(game.id) || BLOXIO_ICON.game(game.id)) : ""))}" alt="${escapeHTML(game.name || "Featured game")}"><div><h4>${escapeHTML(game.name)}</h4><p>${escapeHTML(game.provider || "BLOXIO")}</p></div></button>`; },
    feed(row) { return `<div class="feed-row"><span>${escapeHTML(row.user)}</span><span>${escapeHTML(row.game)}</span><strong>${escapeHTML(row.amount)} ${escapeHTML(row.currency || "BX")}</strong></div>`; },
    winner(row) { return `<div class="winner-row"><span>${escapeHTML(row.user)}</span><span>${escapeHTML(row.game)}</span><strong>${escapeHTML(row.amount)} ${escapeHTML(row.currency || "BX")}</strong></div>`; },
    leaderboard(row) { return `<div class="leaderboard-row"><span>#${escapeHTML(row.rank)}</span><span>${escapeHTML(row.username)}</span><strong>${escapeHTML(row.profit)}</strong></div>`; },
    tournament(row) { return `<div class="tournament-card"><h4>${escapeHTML(row.name)}</h4><p>Prize: ${escapeHTML(row.prize)}</p><p>Players: ${escapeHTML(row.players ?? 0)}</p></div>`; }
};

/* =========================================================
   14. RENDERING
   ========================================================= */

export const VirtualList = { render(root, items, renderer) { if (!root) return; root.innerHTML = (Array.isArray(items) ? items : []).map(renderer).join(""); } };

export const WalletUI = {
    update() { if (DOM.bxBalance) DOM.bxBalance.textContent = Wallet.get("BX").toFixed(4); if (DOM.strBalance) DOM.strBalance.textContent = Wallet.get("STR").toFixed(4); if (DOM.eubxBalance) DOM.eubxBalance.textContent = Wallet.get("EUBX").toFixed(4); if (DOM.xbcBalance) DOM.xbcBalance.textContent = Wallet.get("XBC").toFixed(2); const walletText = $("#casinoWalletText"); if (walletText) walletText.textContent = `${Wallet.get()} ${STATE.currency}`; }
};

// تم تحديث هذه الدالة لتقرأ التصنيفات المفردة وتطابق games.js
export const CategoryUI = {
    update() {
        const games = Registry.all();
        const count = category => games.filter(game => game.category === category).length;
        
        if (DOM.catOriginals) DOM.catOriginals.textContent = count("original");
        if (DOM.catArcade) DOM.catArcade.textContent = count("arcade");
        if (DOM.catCards) DOM.catCards.textContent = count("card");
        if (DOM.catSlots) DOM.catSlots.textContent = count("slot");
        if (DOM.catRoulette) DOM.catRoulette.textContent = count("roulette");
    }
};

export const GamesUI = { render(games = Registry.all()) { VirtualList.render(DOM.gamesGrid, games, Templates.game); }, refresh() { this.render(); } };
export const FeaturedUI = { render() { VirtualList.render(DOM.featuredTrack, Registry.featured(), Templates.featured); } };
export const FeedUI = { render() { VirtualList.render(DOM.liveFeed, STATE.feeds.live, Templates.feed); } };
export const WinnersUI = { render() { VirtualList.render(DOM.liveWinners, STATE.feeds.winners, Templates.winner); } };
export const LeaderboardUI = { render() { VirtualList.render(DOM.leaderboard, STATE.casino.leaderboard, Templates.leaderboard); } };
export const TournamentUI = { render() { VirtualList.render(DOM.tournaments, STATE.casino.tournaments, Templates.tournament); } };

export const JackpotUI = {
    update() { const values = STATE.casino.jackpots; const elements = { crash: DOM.jackpotCrash, mines: DOM.jackpotMines, plinko: DOM.jackpotPlinko, wheel: DOM.jackpotWheel }; Object.entries(elements).forEach(([key, element]) => { if (element && values[key] !== undefined) element.textContent = String(values[key]); }); }
};

export const StatsUI = {
    update() { if (DOM.gamesCount) DOM.gamesCount.textContent = Registry.all().length; if (DOM.onlinePlayers) DOM.onlinePlayers.textContent = String(STATE.casino.onlinePlayers); }
};

/* =========================================================
   15. SEARCH AND FILTERS
   ========================================================= */

export const SearchUI = {
    init() {
        if (!DOM.searchInput || this.bound) return; this.bound = true;
        DOM.searchInput.addEventListener("input", event => {
            STATE.filters.search = event.target.value.trim();
            let games = Registry.search(STATE.filters.search);
            if (STATE.filters.category !== "all") {
                const category = Registry.category(STATE.filters.category);
                const ids = new Set(category.map(game => game.id));
                games = games.filter(game => ids.has(game.id));
            }
            GamesUI.render(games);
        });
    }, bound: false
};

export const FilterUI = {
    init() {
        if (this.bound) return; this.bound = true;
        $$(".casino-filter-btn").forEach(button => {
            button.addEventListener("click", () => {
                $$(".casino-filter-btn").forEach(item => item.classList.remove("active"));
                button.classList.add("active");
                const category = button.dataset.tab || "all";
                STATE.filters.category = category;
                let games = Registry.category(category);
                if (STATE.filters.search) {
                    const ids = new Set(Registry.search(STATE.filters.search).map(game => game.id));
                    games = games.filter(game => ids.has(game.id));
                }
                GamesUI.render(games);
            });
        });
    }, bound: false
};

/* =========================================================
   16. GAME VIEW
   ========================================================= */

export const GameView = {
    open(id) {
        const game = Registry.get(id);
        if (!game || !DOM.gameContainer || !DOM.gameView) return false;
        this.close(false);
        STATE.activeGame = game.id;
        DOM.gameView.classList.remove("hidden");
        if (game.status && game.status !== "active") {
            DOM.gameContainer.innerHTML = `<div class="casino-active-view casino-coming-soon"><div class="casino-active-header"><div><span class="casino-game-kicker">BLOXIO CASINO</span><h2>${escapeHTML(game.name)}</h2></div><button type="button" id="closeGame">Back to games</button></div><div class="casino-coming-soon-body"><div class="casino-coming-soon-icon" aria-hidden="true">🎮</div><h3>Coming soon</h3><p>${escapeHTML(game.name)} is listed in the casino lobby, but its verified game engine is not enabled yet.</p><span>Choose an available game to play.</span></div></div>`;
            requestAnimationFrame(() => DOM.gameView.scrollIntoView({ behavior: "smooth", block: "start" }));
            return true;
        }
        DOM.gameContainer.innerHTML = `<div class="casino-active-view"><div class="casino-active-header"><div><span class="casino-game-kicker">BLOXIO CASINO</span><h2>${escapeHTML(game.name)}</h2></div><button type="button" id="closeGame">Back to games</button></div><div id="casinoRuntime" data-game="${escapeHTML(game.id)}"><div class="casino-runtime-placeholder"><p>${escapeHTML(game.name)}</p><span>Connecting to game service...</span></div></div><p class="casino-runtime-status" id="casinoRuntimeStatus" role="status"></p></div>`;
        BUS.emit("game:open", game);
        requestAnimationFrame(() => DOM.gameView.scrollIntoView({ behavior: "smooth", block: "start" }));
        return true;
    },
    close(emit = true) {
        const previous = STATE.activeGame; PixiEngine.destroyAll(); CrashPixi.stop(); STATE.activeGame = null;
        if (DOM.gameView) DOM.gameView.classList.add("hidden");
        if (DOM.gameContainer) DOM.gameContainer.innerHTML = "";
        if (emit && previous) BUS.emit("game:close", previous);
    }
};

/* =========================================================
   17. CLICK ROUTER
   ========================================================= */

export const ClickRouter = {
    init() {
        if (this.bound) return; this.bound = true;
        document.addEventListener("click", event => {
            const gameButton = event.target.closest(".casino-game-card, .casino-featured-card");
            if (gameButton) {
                const gameId = gameButton.dataset.game;
                if (!gameId) return;
                event.preventDefault();
                try { sessionStorage.setItem("bloxio:selected-game", gameId); } catch (_) {}
                window.location.assign(`/pages/game.html?game=${encodeURIComponent(gameId)}`);
                return;
            }
            if (event.target.closest("#closeGame")) { GameView.close(); }
        });
    }, bound: false
};

/* =========================================================
   18. CENTRAL REALTIME ADAPTER
   ========================================================= */

export const SocketEngine = {
    connected: false, cleanups: [],
    connect() {
        const ws = window.WS; if (!ws) { console.warn("[CASINO WS] Central WS service unavailable."); return false; }
        if (typeof ws.on === "function") {
            const events = {
                "casino:online": count => { STATE.casino.onlinePlayers = safeNumber(count); StatsUI.update(); },
                "casino:feed": payload => { if (!payload) return; STATE.feeds.live.unshift(payload); STATE.feeds.live = STATE.feeds.live.slice(0, 50); FeedUI.render(); },
                "casino:winner": payload => { if (!payload) return; STATE.feeds.winners.unshift(payload); STATE.feeds.winners = STATE.feeds.winners.slice(0, 50); WinnersUI.render(); },
                "casino:bigwin": payload => { if (!payload) return; STATE.feeds.bigWins.unshift(payload); STATE.feeds.bigWins = STATE.feeds.bigWins.slice(0, 30); BUS.emit("bigwin:update", payload); },
                "casino:leaderboard": rows => { if (!Array.isArray(rows)) return; STATE.casino.leaderboard = rows; LeaderboardUI.render(); },
                "casino:jackpot": payload => { if (!payload || typeof payload !== "object") return; Object.assign(STATE.casino.jackpots, payload); JackpotUI.update(); },
                "casino:tournaments": rows => { if (!Array.isArray(rows)) return; STATE.casino.tournaments = rows; TournamentUI.render(); },
                "casino:rain": payload => BUS.emit("rain:update", payload)
            };
            Object.entries(events).forEach(([name, callback]) => { const cleanup = ws.on(name, callback); if (typeof cleanup === "function") this.cleanups.push(cleanup); });
        }
        if (typeof ws.subscribe === "function") ws.subscribe("casino");
        this.connected = Boolean(typeof ws.connected === "function" ? ws.connected() : ws.connected);
        STATE.runtime.socket = this.connected; return true;
    },
    disconnect() { this.cleanups.forEach(cleanup => cleanup()); this.cleanups = []; if (window.WS?.unsubscribe) window.WS.unsubscribe("casino"); this.connected = false; STATE.runtime.socket = false; },
    emit(event, data = {}) { if (!window.WS?.send) return false; return window.WS.send({ type: event, ...data }); }
};

/* =========================================================
   19. CONFIRMED GAME OPERATIONS
   ========================================================= */

export const BetEngine = {
    pending: false,
    async place(amount, gameId = STATE.activeGame, extra = {}) {
        amount = safeNumber(amount);
        if (this.pending) throw new Error("A bet is already being processed.");
        if (!gameId || amount < Currency.minBet()) throw new Error("Invalid game or bet amount.");
        this.pending = true; BUS.emit("bet:pending", { amount, gameId });
        try {
            const result = await CasinoAPI.play({ game: gameId, bet: amount, data: { currency: STATE.currency, ...extra } });
            if (result?.balance) Wallet.sync(result.balance);
            if (result?.wallet) Wallet.sync(result.wallet);
            if (result?.analytics) { Object.assign(STATE.analytics, result.analytics); Persistence.saveState(); }
            BUS.emit("bet:confirmed", result); return result;
        } catch (error) { BUS.emit("bet:error", error); throw error; } finally { this.pending = false; }
    }
};

/* =========================================================
   20. CRASH GAME
   ========================================================= */

export const CrashGame = {
    running: false, multiplier: 1, roundId: null,
    async start(amount) {
        if (this.running) throw new Error("Crash round already active.");
        const result = await CasinoAPI.crashJoin({ bet: safeNumber(amount), autoCashout: null });
        this.running = true; this.multiplier = safeNumber(result?.multiplier) || 1; this.roundId = result?.roundId || result?.id || "server-managed";
        BUS.emit("crash:joined", result); return result;
    },
    async cashout() {
        if (!this.running) throw new Error("No active Crash round.");
        const result = await CasinoAPI.crashCashout({});
        this.running = false; BUS.emit("crash:cashout", result); return result;
    },
    update(payload) { if (!payload) return; this.multiplier = safeNumber(payload.multiplier) || 1; this.running = payload.running !== false; BUS.emit("crash:update", this.multiplier); },
    stop() { this.running = false; this.roundId = null; }
};

/* =========================================================
   21. LEGACY GAME ADAPTERS
   ========================================================= */

export const MinesGame = { async play(payload = {}) { return BetEngine.place(payload.amount, "mines", payload); } };
export const PlinkoGame = { async drop(payload = {}) { return BetEngine.place(payload.amount, "plinko", payload); } };
export const WheelGame = { async spin(payload = {}) { return BetEngine.place(payload.amount, "wheel", payload); } };
export const DiceGame = { async roll(payload = {}) { return BetEngine.place(payload.amount, "dice", payload); } };
export const CoinflipGame = { async flip(payload = {}) { return BetEngine.place(payload.amount, "coinflip", payload); } };
export const LimboGame = { async roll(payload = {}) { return BetEngine.place(payload.amount, "limbo", payload); } };
export const HiloGame = { async draw(payload = {}) { return BetEngine.place(payload.amount, "hilo", payload); } };

export const GameFactory = {
    get(id) {
        const games = { crash: CrashGame, mines: MinesGame, plinko: PlinkoGame, wheel: WheelGame, dice: DiceGame, coinflip: CoinflipGame, limbo: LimboGame, hilo: HiloGame };
        return games[id] || null;
    }
};

/* =========================================================
   22. RAIN AND TIPS
   ========================================================= */

export const RainRuntime = {
    current: null,
    update(payload) { this.current = payload || null; BUS.emit("rain:update", this.current); },
    async join() { return SocketEngine.emit("casino:rain:join"); },
    async claim() { return SocketEngine.emit("casino:rain:claim"); }
};

export const TipsEngine = {
    open() { BUS.emit("tips:open"); },
    send(user, amount, currency = STATE.currency) {
        amount = safeNumber(amount);
        if (!user || amount <= 0) throw new Error("Invalid tip details.");
        return SocketEngine.emit("casino:tip", { user, amount, currency });
    }
};

/* =========================================================
   23. VISUAL ENGINES
   ========================================================= */

export const AnimationEngine = {
    enabled: false,
    init() { this.enabled = Settings.animations && typeof window.gsap !== "undefined"; return this.enabled; },
    cards() { if (!this.enabled) return; window.gsap.from(".casino-game-card", { opacity: 0, y: 20, duration: 0.35, stagger: 0.025 }); },
    featured() { if (!this.enabled) return; window.gsap.from(".casino-featured-card", { opacity: 0, scale: 0.96, duration: 0.35, stagger: 0.04 }); },
    kill() { if (this.enabled) window.gsap.killTweensOf(".casino-game-card, .casino-featured-card"); }
};

export const PixiEngine = {
    enabled: false, apps: new Map(),
    init() { this.enabled = typeof window.PIXI !== "undefined"; STATE.runtime.pixi = this.enabled; return this.enabled; },
    async create(id, container) {
        if (!this.enabled || !container) return null;
        if (this.apps.has(id)) return this.apps.get(id);
        const PIXI = window.PIXI; let app;
        try {
            app = new PIXI.Application();
            if (typeof app.init === "function") { await app.init({ resizeTo: container, antialias: true, backgroundAlpha: 0 }); }
            else { app = new PIXI.Application({ resizeTo: container, antialias: true, backgroundAlpha: 0 }); }
            const canvas = app.canvas || app.view;
            if (canvas && !canvas.parentNode) container.appendChild(canvas);
            this.apps.set(id, app); return app;
        } catch (error) { console.error("[CASINO PIXI]", error); return null; }
    },
    get(id) { return this.apps.get(id) || null; },
    destroy(id) { const app = this.apps.get(id); if (!app) return; try { app.destroy(true, { children: true, texture: false, textureSource: false }); } catch (error) { console.warn("[PIXI DESTROY]", error); } this.apps.delete(id); },
    destroyAll() { [...this.apps.keys()].forEach(id => this.destroy(id)); }
};

export const AudioEngine = {
    enabled: false, sounds: {},
    init() {
        if (typeof window.Howl === "undefined") return false;
        this.enabled = Settings.sound; STATE.runtime.audio = true;
        const files = { click: "click", win: "win", lose: "lose", jackpot: "jackpot", rain: "rain", tip: "tip", spin: "spin", crash: "crash" };
        Object.entries(files).forEach(([key, file]) => { this.sounds[key] = new window.Howl({ src: [`/assets/sounds/${file}.mp3`], preload: false, volume: 0.65 }); });
        return true;
    },
    play(name) { if (!this.enabled) return; this.sounds[name]?.play(); },
    stop(name) { this.sounds[name]?.stop(); },
    toggle() { this.enabled = !this.enabled; Settings.sound = this.enabled; Settings.save(); return this.enabled; },
    destroy() { Object.values(this.sounds).forEach(sound => sound.unload()); this.sounds = {}; }
};

export const ChartsEngine = {
    chart: null, series: null, observer: null,
    init() {
        const library = window.LightweightCharts; const root = DOM.bigWinStats;
        if (!library || !root) return false;
        try {
            this.chart = library.createChart(root, { width: root.clientWidth || 300, height: 220, layout: { background: { color: "transparent" }, textColor: "#aebbd0" }, grid: { vertLines: { color: "rgba(255,255,255,.04)" }, horzLines: { color: "rgba(255,255,255,.04)" } } });
            if (typeof this.chart.addAreaSeries === "function") { this.series = this.chart.addAreaSeries(); }
            else if (typeof this.chart.addSeries === "function" && library.AreaSeries) { this.series = this.chart.addSeries(library.AreaSeries); }
            if (typeof ResizeObserver !== "undefined") { this.observer = new ResizeObserver(entries => { const width = entries[0]?.contentRect?.width; if (width) this.chart?.applyOptions({ width }); }); this.observer.observe(root); }
            STATE.runtime.charts = Boolean(this.series); return Boolean(this.series);
        } catch (error) { console.warn("[CASINO CHART]", error); return false; }
    },
    update(point) { if (!this.series || !point) return; if (point.time == null || point.value == null) return; this.series.update({ time: point.time, value: safeNumber(point.value) }); },
    destroy() { this.observer?.disconnect(); this.observer = null; this.chart?.remove(); this.chart = null; this.series = null; STATE.runtime.charts = false; }
};

/* =========================================================
   24. GAME RENDER BRIDGES
   ========================================================= */

export const CrashPixi = {
    app: null, line: null,
    async mount(container) { this.app = await PixiEngine.create("crash", container); if (!this.app || !window.PIXI) return; this.line = new window.PIXI.Graphics(); this.app.stage.addChild(this.line); },
    render(multiplier) { if (!this.line) return; this.line.clear(); if (this.line.moveTo && this.line.lineTo) { this.line.moveTo(0, 200); this.line.lineTo(clamp(multiplier, 1, 30) * 12, 200 - clamp(multiplier, 1, 30) * 5); this.line.stroke?.({ width: 4, color: 0x22d68a }); } },
    stop() { this.line = null; this.app = null; }
};

export const PlinkoPixi = { app: null, async mount(container) { this.app = await PixiEngine.create("plinko", container); return this.app; } };
export const RoulettePixi = { app: null, async mount(container) { this.app = await PixiEngine.create("roulette", container); return this.app; } };

/* =========================================================
   25. VISUAL EVENTS
   ========================================================= */

BUS.on("wallet:update", () => WalletUI.update());
BUS.on("currency:change", () => WalletUI.update());
BUS.on("feed:update", () => FeedUI.render());
BUS.on("winner:update", () => WinnersUI.render());
BUS.on("leaderboard:update", () => LeaderboardUI.render());
BUS.on("tournament:update", () => TournamentUI.render());
BUS.on("jackpot:update", () => JackpotUI.update());

BUS.on("crash:update", value => { const element = $("#crashMultiplier"); if (element) element.textContent = `${safeNumber(value).toFixed(2)}x`; CrashPixi.render(value); });

BUS.on("game:open", async game => {
    const runtime = $("#casinoRuntime"); if (!runtime) return;
    if (game.id === "crash") await CrashPixi.mount(runtime);
    else if (game.id === "plinko") await PlinkoPixi.mount(runtime);
    else if (["roulette", "wheel"].includes(game.id)) await RoulettePixi.mount(runtime);
});

BUS.on("game:close", () => { CrashPixi.stop(); PixiEngine.destroyAll(); });

/* =========================================================
   26. APP UTILITIES
   ========================================================= */

export const HealthEngine = { run() { return [{ name: "Wallet", status: Boolean(Wallet) }, { name: "Registry", status: Boolean(Registry) }, { name: "Central WS", status: Boolean(window.WS) }, { name: "PixiJS", status: typeof window.PIXI !== "undefined" }, { name: "Howler", status: typeof window.Howl !== "undefined" }, { name: "Lightweight Charts", status: typeof window.LightweightCharts !== "undefined" }]; } };

export const CasinoAnalytics = { sessionStart: Date.now(), sessionDuration() { return Math.floor((Date.now() - this.sessionStart) / 1000); }, snapshot() { return { version: STATE.version, currency: STATE.currency, analytics: { ...STATE.analytics }, online: STATE.casino.onlinePlayers, games: Registry.all().length }; } };

export const Hotkeys = { init() { if (this.bound) return; this.bound = true; document.addEventListener("keydown", event => { if (event.key === "Escape") GameView.close(); if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) { event.preventDefault(); DOM.searchInput?.focus(); } }); }, bound: false };

export const VisibilityEngine = { init() { if (this.bound) return; this.bound = true; document.addEventListener("visibilitychange", () => { BUS.emit(document.hidden ? "app:hidden" : "app:visible"); }); }, bound: false };

export const MobileEngine = { init() { if (this.bound) return; this.bound = true; $("#mobileCasinoSearch")?.addEventListener("click", () => { DOM.searchInput?.focus(); }); $("#mobileCasinoWallet")?.addEventListener("click", () => { BUS.emit("wallet:open"); }); $("#mobileCasinoLeaderboard")?.addEventListener("click", () => { DOM.leaderboard?.scrollIntoView({ behavior: "smooth" }); }); }, bound: false };

/* =========================================================
   27. APP LIFECYCLE
   ========================================================= */

export const CasinoApp = {
    started: false,
    start() {
        if (this.started) return true;
        CasinoCore.start(); GameLoader.load(); WalletSync.start(); FeedSync.start(); JackpotSync.start(); TournamentSync.start(); LeaderboardSync.start();
        SearchUI.init(); FilterUI.init(); ClickRouter.init();
        AnimationEngine.init(); AnimationEngine.cards(); AnimationEngine.featured();
        PixiEngine.init(); AudioEngine.init(); ChartsEngine.init(); SocketEngine.connect();
        Hotkeys.init(); VisibilityEngine.init(); MobileEngine.init();
        
        $$(".casino-currency").forEach(button => {
            if (button.dataset.casinoBound) return; button.dataset.casinoBound = "1";
            button.addEventListener("click", () => {
                const currency = button.dataset.currency;
                if (!Currency.supported.includes(currency)) return;
                if (!Currency.set(currency)) return;
                $$(".casino-currency").forEach(item => {
                    const active = item.dataset.currency === currency;
                    item.classList.toggle("active", active);
                    item.setAttribute("aria-pressed", active ? "true" : "false");
                });
                WalletUI.update();
            });
        });
        $("#joinRainBtn")?.addEventListener("click", () => { RainRuntime.join(); });
        $("#claimRainBtn")?.addEventListener("click", () => { RainRuntime.claim(); });
        $("#sendTipBtn")?.addEventListener("click", () => { TipsEngine.open(); });
        DevTools.mount();
        STATE.ready = true; this.started = true;
        BUS.emit("casino:started", STATE);
        console.log(`[${VERSION.name} ${VERSION.version}] READY`);
        return true;
    },
    stop() {
        if (!this.started) return;
        SocketEngine.disconnect(); AnimationEngine.kill(); ChartsEngine.destroy(); PixiEngine.destroyAll(); AudioEngine.destroy(); CrashGame.stop();
        STATE.ready = false; this.started = false;
        BUS.emit("casino:stopped");
    },
    destroy() { this.stop(); CasinoCore.destroy(); }
};

/* =========================================================
   28. SYNC ADAPTERS
   ========================================================= */

export const GameLoader = { load() { const games = Registry.all(); games.forEach(game => { if (!game.provider) game.provider = "BLOXIO"; }); return games.length; } };
export const WalletSync = { start() { WalletUI.update(); BUS.emit("wallet:sync"); } };
export const FeedSync = { start() { FeedUI.render(); WinnersUI.render(); } };
export const JackpotSync = { start() { JackpotUI.update(); } };
export const TournamentSync = { start() { TournamentUI.render(); } };
export const LeaderboardSync = { start() { LeaderboardUI.render(); } };
export const RealtimeRuntime = { start() { return SocketEngine.connect(); }, stop() { SocketEngine.disconnect(); } };

/* =========================================================
   29. COMPATIBILITY GLOBALS
   ========================================================= */

export const VERSION = { name: "BLOXIO CASINO", version: "4.0.0", build: "ENTERPRISE", release: "2026" };

export const DevTools = {
    mount() {
        window.BLOXIO = { VERSION, STATE, BUS, Wallet, Currency, Registry, Analytics, CasinoAPI, SocketEngine, CasinoAnalytics };
        window.CasinoCore = CasinoCore; window.CasinoState = STATE; window.CasinoWallet = Wallet; window.CasinoRegistry = Registry; window.CasinoBus = BUS;
    }
};

window.CasinoApp = CasinoApp; window.CasinoVersion = VERSION; window.CasinoAnalytics = CasinoAnalytics; window.CASINO = CasinoApp;

/* =========================================================
   30. PREMIUM EXPERIENCE (MERGED)
   ========================================================= */

/*
 * BLOXIO CASINO PREMIUM EXPERIENCE
 * UI enhancement layer for the supplied Casino V4 module.
 * Game outcomes, wallet balances and payouts remain backend-authoritative.
 */
const premium$ = (s, r = document) => r.querySelector(s);
const premium$$ = (s, r = document) => [...r.querySelectorAll(s)];
const CHART_ENGINE = createBloxioChartEngine();
const premiumEsc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));
const premiumNumber = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const GAME_META = {
  crash: { tagline:"Ride the curve. Cash out in time.", mode:"Multiplier", options:[["autoCashout","Auto cashout (x)", "premiumNumber", "2.00"]] },
  dice: { tagline:"Set your line. Roll for the result.", mode:"Over / Under", options:[["target","Target (0–99.99)", "premiumNumber", "50"],["side","Direction","select",["over","under"]]] },
  limbo: { tagline:"Choose a target multiplier.", mode:"Target multiplier", options:[["targetMultiplier","Target multiplier (x)","premiumNumber","2.00"]] },
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
    this.injectResponsiveStyles();
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
    const grid = premium$("#casinoGamesGrid");
    if (grid && "MutationObserver" in window) {
      let scheduled = false;
      new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => { scheduled = false; animate(); });
      }).observe(grid, { childList: true });
    }
  },
  injectResponsiveStyles() {
    if (premium$("#bloxio-premium-responsive-styles")) return;
    const style = document.createElement("style");
    style.id = "bloxio-premium-responsive-styles";
    style.textContent = `
      .bxp-game-shell{color:var(--text-platinum,#F4F7F5);background:var(--bg-base-core,#071C17);border:1px solid rgba(212,175,55,.22);border-radius:18px;overflow:hidden;min-width:0}
      .bxp-game-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;background:var(--bg-card,#0A261F)}
      .bxp-game-top-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .bxp-fullscreen,.bxp-close{display:inline-flex;align-items:center;justify-content:center;min-width:44px;min-height:44px;border:1px solid rgba(212,175,55,.35);border-radius:12px;background:var(--bg-panel,#0E332B);color:var(--gold-solid,#D4AF37);font-size:22px;cursor:pointer;touch-action:manipulation}
      .bxp-game-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,320px);gap:14px;padding:14px}
      .bxp-stage-card,.bxp-control-card{min-width:0;background:var(--bg-card,#0A261F);border:1px solid rgba(140,163,157,.16);border-radius:14px;padding:14px}
      .bxp-visual-stage{position:relative;min-height:clamp(220px,38vh,420px);overflow:hidden;border-radius:12px;background:var(--chart-bg,#051411)}
      .bxp-chart-wrap{margin-top:14px;min-width:0}.bxp-chart{width:100%;min-height:220px;overflow:hidden;background:var(--chart-bg,#051411);border-radius:12px}
      .bxp-chart-canvas{display:block;width:100%;max-width:100%}
      .bxp-options select,.bxp-options input,.bxp-amount-row input{width:100%;min-height:44px;box-sizing:border-box}
      .bxp-play{width:100%;min-height:50px;touch-action:manipulation}
      .bxp-game-shell:fullscreen{width:100vw;height:100vh;overflow:auto;border-radius:0;background:var(--bg-base-deep,#04120E)}
      .bxp-game-shell.bloxio-fullscreen-fallback{overflow:auto;overscroll-behavior:contain}
      @media(max-width:900px){.bxp-game-layout{grid-template-columns:minmax(0,1fr)}.bxp-game-top{align-items:flex-start}.bxp-visual-stage{min-height:260px}}
      @media(max-width:560px){.bxp-game-shell{border-radius:12px}.bxp-game-top{padding:10px;gap:8px}.bxp-game-top-actions{gap:6px}.bxp-status{max-width:120px;font-size:11px}.bxp-game-layout{padding:8px;gap:8px}.bxp-stage-card,.bxp-control-card{padding:10px}.bxp-visual-stage{min-height:230px}.bxp-chart{min-height:190px}.bxp-game-identity h2{font-size:20px}.bxp-game-identity p{font-size:12px}}
      @media(orientation:landscape) and (max-height:520px){.bxp-game-shell:fullscreen .bxp-game-layout,.bxp-game-shell.bloxio-fullscreen-fallback .bxp-game-layout{grid-template-columns:minmax(0,1fr) 280px}.bxp-game-shell:fullscreen .bxp-visual-stage,.bxp-game-shell.bloxio-fullscreen-fallback .bxp-visual-stage{min-height:180px}}
      @media(prefers-reduced-motion:reduce){.bxp-game-shell *{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
    `;
    document.head.appendChild(style);
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
    const host = premium$("#casinoRuntime");
    if (!host) return;
    const meta = GAME_META[game.id] || { tagline:"Bloxio Original Game", mode:"Game", options:[["action","Action","select",["play"]]] };
    host.innerHTML = `
      <section class="bxp-game-shell" aria-label="premium${premiumEsc(game.name)} game">
        <header class="bxp-game-top">
          <div class="bxp-game-identity">
            <span class="bxp-live-dot"></span>
            <div><span class="bxp-eyebrow">BLOXIO ORIGINALS</span><h2>premium${premiumEsc(game.name)}</h2><p>premium${premiumEsc(meta.tagline)}</p></div>
          </div>
          <div class="bxp-game-top-actions">
            <span class="bxp-status" data-bxp-status>Ready to connect</span>
            <button type="button" class="bxp-fullscreen" data-bxp-fullscreen aria-label="Enter full screen" title="Enter full screen">⛶</button>
            <button type="button" class="bxp-close" data-bxp-close aria-label="Close game">×</button>
          </div>
        </header>
        <div class="bxp-game-layout">
          <section class="bxp-stage-card">
            <div class="bxp-stage-head"><span>premium${premiumEsc(meta.mode)}</span><span class="bxp-stage-chip">premium${premiumEsc(STATE.currency)}</span></div>
            <div class="bxp-visual-stage" data-bxp-stage>
              <div class="bxp-pixi-layer" data-bxp-pixi aria-hidden="true"></div>
              <div class="bxp-stage-center">
                <span class="bxp-game-symbol">premium${premiumEsc(game.name.slice(0,2).toUpperCase())}</span>
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
            <div class="bxp-amount-row"><input id="bxpBetAmount" type="premiumNumber" inputmode="decimal" min="0" step="any" value="premium${STATE.currency === "XBC" ? "10" : "0.1"}"><b>premium${premiumEsc(STATE.currency)}</b></div>
            <div class="bxp-quick-bets"><button type="button" data-bxp-add="0.5">½</button><button type="button" data-bxp-add="1">1×</button><button type="button" data-bxp-add="2">2×</button><button type="button" data-bxp-add="max">MAX</button></div>
            <div class="bxp-options" data-bxp-options></div>
            <div class="bxp-control-foot"><span>Currency</span><div class="bxp-currencies"><button type="button" data-bxp-currency="BX" class="premium${STATE.currency==="BX"?"active":""}">BX</button><button type="button" data-bxp-currency="XBC" class="premium${STATE.currency==="XBC"?"active":""}">XBC</button></div></div>
            <button type="button" class="bxp-play" data-bxp-play>premium${game.id === "crash" ? "JOIN CRASH" : "PLACE BET"} <span>→</span></button>
            <p class="bxp-feedback" data-bxp-feedback role="status" aria-live="polite">Bets, outcomes and payouts must be confirmed by Bloxio servers.</p>
            <div class="bxp-fairness-note"><span>◇</span><span>Server-authoritative gameplay<br><small>Never trust client-side results for payouts.</small></span></div>
          </aside>
        </div>
      </section>`;
    this.fullscreenController = createBloxioFullscreenController({
      element: premium$(".bxp-game-shell", host),
      button: premium$("[data-bxp-fullscreen]", host),
      lockLandscape: false,
      onChange: () => requestAnimationFrame(() => {
        this.chart?.refresh?.(game.id);
      })
    });
    this.renderOptions(meta.options || []);
    this.bindControls(game);
    this.mountPixi(game.id, premium$("[data-bxp-pixi]", host));
    this.mountChart(game.id, premium$("[data-bxp-chart]", host));
    if (window.gsap && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      window.gsap.fromTo(".bxp-game-shell", { opacity:0, y:12 }, { opacity:1, y:0, duration:.35, ease:"power2.out" });
      window.gsap.fromTo(".bxp-control-card", { x:12, opacity:0 }, { x:0, opacity:1, duration:.4, delay:.08 });
    }
    this.setStatus("UI ready · waiting for backend", "neutral");
  },
  renderOptions(options) {
    const root = premium$("[data-bxp-options]");
    if (!root) return;
    root.innerHTML = options.map(([name,label,type,value]) => {
      if (type === "select") return `<label class="bxp-field-label" for="bxpOpt-premium${premiumEsc(name)}">premium${premiumEsc(label)}</label><select id="bxpOpt-premium${premiumEsc(name)}" data-bxp-option="premium${premiumEsc(name)}">premium${value.map(v=>`<option value="premium${premiumEsc(v)}">premium${premiumEsc(v)}</option>`).join("")}</select>`;
      return `<label class="bxp-field-label" for="bxpOpt-premium${premiumEsc(name)}">premium${premiumEsc(label)}</label><input id="bxpOpt-premium${premiumEsc(name)}" data-bxp-option="premium${premiumEsc(name)}" type="premiumNumber" step="any" value="premium${premiumEsc(value)}">`;
    }).join("");
  },
  bindControls(game) {
    const host = premium$("#casinoRuntime");
    premium$("[data-bxp-close]", host)?.addEventListener("click", () => {
      const close = premium$("#closeGame");
      if (close) close.click();
      else { premium$("#casinoGameView")?.classList.add("hidden"); }
    });
    premium$$("[data-bxp-currency]", host).forEach(btn => btn.addEventListener("click", () => {
      Currency.set(btn.dataset.bxpCurrency);
      premium$$("[data-bxp-currency]", host).forEach(b=>b.classList.toggle("active",b===btn));
      const amount = premium$("#bxpBetAmount",host);
      if (amount) amount.value = btn.dataset.bxpCurrency === "XBC" ? "10" : "0.1";
      const chip = premium$(".bxp-stage-chip",host); if (chip) chip.textContent = btn.dataset.bxpCurrency;
    }));
    premium$$("[data-bxp-add]", host).forEach(btn => btn.addEventListener("click", () => {
      const input = premium$("#bxpBetAmount",host), current = premiumNumber(input.value);
      const min = STATE.currency === "XBC" ? 10 : .1;
      input.value = btn.dataset.bxpAdd === "max"
        ? String(Math.max(0, premiumNumber(STATE.wallet?.[STATE.currency])))
        : String(Math.max(min, current * (premiumNumber(btn.dataset.bxpAdd) || 1)));
    }));
    premium$("[data-bxp-play]", host)?.addEventListener("click", () => this.play(game));
  },
  async play(game) {
    if (this.busy) return;
    const host = premium$("#casinoRuntime");
    const amount = premiumNumber(premium$("#bxpBetAmount",host)?.value);
    if (!Number.isFinite(amount) || amount < Currency.minBet()) {
      this.feedback(`Minimum bet is premium${Currency.minBet()} premium${STATE.currency}.`, "error"); return;
    }
    const options = {};
    premium$$("[data-bxp-option]",host).forEach(el => { options[el.dataset.bxpOption] = el.type === "premiumNumber" ? premiumNumber(el.value) : el.value; });
    this.busy = true;
    const button = premium$("[data-bxp-play]",host);
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
      const display = result?.multiplier != null ? `premium${premiumNumber(result.multiplier).toFixed(2)}×` :
        result?.payout != null ? `premium${premiumNumber(result.payout).toFixed(4)} premium${STATE.currency}` :
        result?.result?.multiplier != null ? `premium${premiumNumber(result.result.multiplier).toFixed(2)}×` :
        result?.status || "Round accepted";
      const output = premium$("[data-bxp-result]",host);
      if (output) output.textContent = display;
      const label = premium$("[data-bxp-result-label]",host);
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
      if (button?.isConnected) {
        button.disabled = false;
        button.innerHTML = game.id === "crash"
          ? (CrashGame.running ? 'CASH OUT <span>↗</span>' : 'JOIN CRASH <span>→</span>')
          : 'PLACE BET <span>→</span>';
      }
    }
  },
  feedback(message, state) {
    const node = premium$("[data-bxp-feedback]");
    if (node) { node.textContent = message; node.dataset.state = state; }
  },
  setStatus(message, state) {
    const node = premium$("[data-bxp-status]");
    if (node) { node.textContent = message; node.dataset.state = state; }
  },
  async mountChart(gameId, node) {
    if (!node) return;
    try {
      const canvas = document.createElement("canvas");
      canvas.className = "bxp-chart-canvas";
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `premium${gameId} verified round history chart`);
      node.replaceChildren(canvas);

      this.chart = CHART_ENGINE;
      CHART_ENGINE.mount(gameId, canvas, {
        height: 250,
        responsive: true,
        showVolume: true,
        currency: STATE.currency,
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
        const bet = Math.max(0, premiumNumber(row.bet));
        const payout = Math.max(0, premiumNumber(row.payout));
        const multiplier = premiumNumber(row.multiplier) || (bet > 0 ? payout / bet : 0);
        const timestamp = new Date(row.created_at).getTime();
        if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
        return {
          gameId,
          roundId: String(row.id ?? `premium${gameId}-premium${timestamp}`),
          timestamp,
          currency: null,
          result: multiplier,
          metadata: { bet, payout, outcome: row.result ?? null }
        };
      }).filter(Boolean);

      if (records.length) {
        CHART_ENGINE.ingestMany(records);
        CHART_ENGINE.refresh(gameId, { currency: STATE.currency });
        premium$("[data-bxp-chart-status]").textContent = `premium${records.length} saved rounds`;
      } else {
        premium$("[data-bxp-chart-status]").textContent = "No saved rounds for this game yet";
      }
    } catch (error) {
      premium$("[data-bxp-chart-status]").textContent =
        error?.status === 401 ? "Sign in to view round history" : "Round history unavailable";
      console.warn("[BLOXIO CHART]", error);
    }
  },
  async mountPixi(gameId, node) {
    if (!node || !window.PIXI) return;
    try {
      const app = await PixiEngine.create(`premium-premium${gameId}`, node);
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
    try { this.fullscreenController?.destroy(); } catch (_) {}
    this.fullscreenController = null;
    try { if (this.activeGame?.id) CHART_ENGINE.unmount(this.activeGame.id); } catch (_) {}
    this.chart = null;
    this.pixiObserver?.disconnect();
    this.pixiObserver = null;
    if (this.activeGame) {
      try { PixiEngine.destroy(`premium-premium${this.activeGame.id}`); } catch (_) {}
    }
    this.pixiApp = null;
    this.activeGame = null;
    this.busy = false;
  }
};

PREMIUM.init();

/* =========================================================
   31. CASINO BET ACTIVITY TABS (MERGED)
   ========================================================= */

/* BLOXIO Casino reference UI interactions — presentation only.
   Live rows are supplied by the trusted casino feed; this module never fabricates bets. */
(() => {
  "use strict";
  const tabs = [...document.querySelectorAll("[data-bet-tab]")];
  const host = document.getElementById("casinoBetActivityRows");
  if (!tabs.length || !host) return;
  const labels = {
    all: "Live bet data will appear here when the casino feed is connected.",
    mine: "Your settled and active bets will appear here after the authenticated history feed is connected.",
    high: "Verified high-roller activity will appear here when the trusted casino feed is connected."
  };
  tabs.forEach(tab => tab.addEventListener("click", () => {
    const selected = tab.dataset.betTab;
    tabs.forEach(item => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    host.replaceChildren();
    const empty = document.createElement("div");
    empty.className = "casino-bet-empty";
    empty.textContent = labels[selected] || labels.all;
    host.append(empty);
  }));
})();

/* =========================================================
   32. SINGLE MODULE STARTUP
   ========================================================= */

if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", () => CasinoApp.start(), { once: true }); } else { CasinoApp.start(); }
