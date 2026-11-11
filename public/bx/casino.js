
/* =========================================================
   BLOXIO CASINO V4.0 — ENTERPRISE REBUILD
   Central WS • Backend-authoritative • Lifecycle-safe
   ========================================================= */

"use strict";

import { CASINO_GAMES } from "./data/games.js";
import { COINS } from "./data/coins.js";

/* =========================================================
   1. HELPERS
   ========================================================= */

const $ = (selector, root = document) =>
    root.querySelector(selector);

const $$ = (selector, root = document) =>
    [...root.querySelectorAll(selector)];

const clamp = (value, min, max) =>
    Math.min(Math.max(Number(value) || 0, min), max);

const safeNumber = value => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};

const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

const STORAGE = {
    SETTINGS: "bloxio_casino_settings",
    STATE: "bloxio_casino_state"
};

const API = {
    games: "/api/casino/games",
    play: "/api/casino/play",
    history: "/api/casino/history",
    verify: "/api/casino/verify",
    crashJoin: "/api/casino/crash/join",
    crashCashout: "/api/casino/crash/cashout"
};

/* =========================================================
   2. EVENT BUS
   ========================================================= */

class EventBus {
    constructor() {
        this.events = new Map();
    }

    on(name, callback) {
        if (typeof callback !== "function") return () => {};

        if (!this.events.has(name)) {
            this.events.set(name, new Set());
        }

        this.events.get(name).add(callback);

        return () => this.off(name, callback);
    }

    off(name, callback) {
        this.events.get(name)?.delete(callback);
    }

    emit(name, payload) {
        this.events.get(name)?.forEach(callback => {
            try {
                callback(payload);
            } catch (error) {
                console.error(`[CASINO BUS:${name}]`, error);
            }
        });
    }

    clear() {
        this.events.clear();
    }
}

export const BUS = new EventBus();

/* =========================================================
   3. STATE
   ========================================================= */

export const STATE = {
    ready: false,
    booted: false,
    version: "4.0.0",
    currency: "BX",
    online: false,
    activeGame: null,
    activeView: "lobby",

    wallet: {
        BX: 0,
        XBC: 0
    },

    user: {
        id: null,
        username: null,
        vip: 0,
        level: 1,
        verified: false
    },

    casino: {
        onlinePlayers: 0,
        games: [],
        featured: [],
        jackpots: {},
        leaderboard: [],
        tournaments: [],
        providers: []
    },

    filters: {
        search: "",
        category: "all",
        provider: "all"
    },

    feeds: {
        live: [],
        winners: [],
        bigWins: []
    },

    analytics: {
        wagered: 0,
        won: 0,
        lost: 0,
        profit: 0,
        bets: 0,
        wins: 0,
        losses: 0
    },

    runtime: {
        socket: false,
        pixi: false,
        audio: false,
        charts: false
    }
};

/* =========================================================
   4. SETTINGS
   ========================================================= */

export const Settings = {
    sound: true,
    music: false,
    animations: true,
    currency: "BX",
    theme: "dark",

    load() {
        try {
            const data = JSON.parse(
                localStorage.getItem(STORAGE.SETTINGS) || "{}"
            );

            this.sound = data.sound !== false;
            this.music = data.music === true;
            this.animations = data.animations !== false;
            this.currency = ["BX", "XBC"].includes(data.currency)
                ? data.currency
                : "BX";
            this.theme = data.theme || "dark";
        } catch (error) {
            console.warn("[CASINO SETTINGS]", error);
        }
    },

    save() {
        try {
            localStorage.setItem(STORAGE.SETTINGS, JSON.stringify({
                sound: this.sound,
                music: this.music,
                animations: this.animations,
                currency: this.currency,
                theme: this.theme
            }));
        } catch (error) {
            console.warn("[CASINO SETTINGS]", error);
        }
    }
};

/* =========================================================
   5. PERSISTENCE
   Only preferences and display analytics are local.
   Never use localStorage as authoritative wallet storage.
   ========================================================= */

export const Persistence = {
    saveState() {
        try {
            localStorage.setItem(STORAGE.STATE, JSON.stringify({
                currency: STATE.currency,
                analytics: STATE.analytics
            }));
        } catch (error) {
            console.warn("[CASINO STATE]", error);
        }
    },

    loadState() {
        try {
            const data = JSON.parse(
                localStorage.getItem(STORAGE.STATE) || "{}"
            );

            if (data.currency &&
                ["BX", "XBC"].includes(data.currency)) {
                STATE.currency = data.currency;
            }

            if (data.analytics && typeof data.analytics === "object") {
                Object.assign(STATE.analytics, data.analytics);
            }
        } catch (error) {
            console.warn("[CASINO STATE]", error);
        }
    }
};

/* =========================================================
   6. WALLET DISPLAY ADAPTER
   Balance must come from authenticated backend data.
   ========================================================= */

export const Wallet = {
    get(currency = STATE.currency) {
        return safeNumber(STATE.wallet[currency]);
    },

    set(currency, value) {
        if (!["BX", "XBC"].includes(currency)) return false;

        STATE.wallet[currency] = safeNumber(value);
        BUS.emit("wallet:update", STATE.wallet);
        return true;
    },

    sync(balances = {}) {
        for (const currency of ["BX", "XBC"]) {
            if (balances[currency] !== undefined) {
                STATE.wallet[currency] = safeNumber(
                    typeof balances[currency] === "object"
                        ? balances[currency].available
                        : balances[currency]
                );
            }
        }

        BUS.emit("wallet:update", STATE.wallet);
    },

    credit() {
        console.warn("[CASINO] Wallet changes must be confirmed by backend.");
        return false;
    },

    debit() {
        console.warn("[CASINO] Wallet changes must be confirmed by backend.");
        return false;
    }
};

/* =========================================================
   7. CURRENCY
   ========================================================= */

export const Currency = {
    supported: ["BX", "XBC"],

    set(currency) {
        if (!this.supported.includes(currency)) return false;

        STATE.currency = currency;
        Settings.currency = currency;
        Settings.save();

        BUS.emit("currency:change", currency);
        return true;
    },

    get() {
        return STATE.currency;
    },

    minBet() {
        return STATE.currency === "XBC" ? 10 : 0.1;
    }
};

/* =========================================================
   8. GAME REGISTRY
   ========================================================= */

export const Registry = {
    games: [],

    init() {
        this.games = Array.isArray(CASINO_GAMES)
            ? CASINO_GAMES
            : [];

        STATE.casino.games = this.games;
        STATE.casino.featured = this.games.filter(game => game.featured);
        STATE.casino.providers = [
            ...new Set(this.games.map(game => game.provider || "BLOXIO"))
        ];

        return this.games;
    },

    all() {
        return this.games;
    },

    featured() {
        return STATE.casino.featured;
    },

    get(id) {
        return this.games.find(game => game.id === id);
    },

    search(term = "") {
        const value = term.toLowerCase();

        return this.games.filter(game =>
            `${game.name || ""} ${game.category || ""} ${game.provider || ""}`
                .toLowerCase()
                .includes(value)
        );
    },

    category(category = "all") {
        if (category === "all") return this.games;

        const aliases = {
            original: "originals",
            slot: "slots",
            card: "cards"
        };

        const target = aliases[category] || category;

        return this.games.filter(game => {
            const gameCategory = aliases[game.category] || game.category;
            return gameCategory === target;
        });
    },

    provider(provider = "all") {
        return provider === "all"
            ? this.games
            : this.games.filter(game => game.provider === provider);
    }
};

/* =========================================================
   9. ANALYTICS
   Display analytics only; updated from confirmed responses.
   ========================================================= */

export const Analytics = {
    bet(amount) {
        STATE.analytics.bets++;
        STATE.analytics.wagered += safeNumber(amount);
        this.save();
    },

    win(amount) {
        STATE.analytics.wins++;
        STATE.analytics.won += safeNumber(amount);
        this.recalculate();
    },

    loss(amount) {
        STATE.analytics.losses++;
        STATE.analytics.lost += safeNumber(amount);
        this.recalculate();
    },

    recalculate() {
        STATE.analytics.profit =
            STATE.analytics.won - STATE.analytics.lost;

        this.save();
    },

    save() {
        Persistence.saveState();
    }
};

/* =========================================================
   10. BACKEND API
   ========================================================= */

export const CasinoAPI = {
    async request(path, options = {}) {
        const token = localStorage.getItem("token");

        const headers = {
            Accept: "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
        };

        const response = await fetch(path, {
            ...options,
            headers,
            credentials: "same-origin"
        });

        const contentType = response.headers.get("content-type") || "";

        const data = contentType.includes("application/json")
            ? await response.json()
            : await response.text();

        if (!response.ok) {
            const error = new Error(
                data?.message || data?.error || `HTTP ${response.status}`
            );

            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    },

    get(path) {
        return this.request(path);
    },

    post(path, payload) {
        return this.request(path, {
            method: "POST",
            body: JSON.stringify(payload)
        });
    },

    async play(payload) {
        return this.post(API.play, payload);
    },

    async history() {
        return this.get(API.history);
    },

    async games() {
        return this.get(API.games);
    },

    async crashJoin(payload) {
        return this.post(API.crashJoin, payload);
    },

    async crashCashout(payload) {
        return this.post(API.crashCashout, payload);
    },

    async verify(payload) {
        return this.post(API.verify, payload);
    }
};

/* =========================================================
   11. CASINO CORE
   ========================================================= */

export const CasinoCore = {
    boot() {
        if (STATE.booted) return;

        Settings.load();
        Persistence.loadState();

        STATE.currency = Settings.currency || STATE.currency;

        Registry.init();

        STATE.booted = true;
        BUS.emit("core:booted", STATE);
    },

    start() {
        if (STATE.ready) return;

        this.boot();
        STATE.ready = true;

        BUS.emit("casino:ready", STATE);
    },

    destroy() {
        STATE.ready = false;
        STATE.booted = false;
        BUS.emit("casino:destroyed");
    }
};

/* =========================================================
   12. DOM REFERENCES
   ========================================================= */

export const DOM = {
    gamesGrid: $("#casinoGamesGrid"),
    featuredTrack: $("#casinoFeaturedTrack"),
    searchInput: $("#casinoSearch"),
    gameView: $("#casinoGameView"),
    gameContainer: $("#casinoGameContainer"),
    leaderboard: $("#casinoLeaderboard"),
    leaderboardTop3: $("#casinoLeaderboardTop3"),
    liveFeed: $("#casinoTickerTrack"),
    liveWinners: $("#casinoLiveWinners"),
    winnerTrack: $("#casinoLiveWinnerTrack"),
    tournaments: $("#casinoTournamentList"),
    tournamentCountdown: $("#casinoTournamentCountdown"),
    bigWins: $("#bigWinsTrack"),
    bigWinStats: $("#casinoBigWinStats"),
    bxBalance: $("#casinoBXBalance"),
    xbcBalance: $("#casinoXBCBalance"),
    gamesCount: $("#casinoGamesCount"),
    onlinePlayers: $("#casinoOnlineText"),
    volume: $("#casinoVolumeText"),
    catOriginals: $("#catOriginals"),
    catArcade: $("#catArcade"),
    catCards: $("#catCards"),
    catSlots: $("#catSlots"),
    catRoulette: $("#catRoulette"),
    jackpotCrash: $("#jackpotCrash"),
    jackpotMines: $("#jackpotMines"),
    jackpotPlinko: $("#jackpotPlinko"),
    jackpotWheel: $("#jackpotWheel")
};

/* =========================================================
   13. TEMPLATES
   ========================================================= */

export const Templates = {
    game(game) {
        return `
            <button class="casino-game-card"
                type="button"
                data-game="${escapeHTML(game.id)}"
                data-category="${escapeHTML(game.category || "all")}">
                <div class="casino-game-cover">
                    <img loading="lazy"
                        src="${escapeHTML(game.image || "")}"
                        alt="${escapeHTML(game.name || "Casino game")}"
                        onerror="this.style.visibility='hidden'">
                </div>
                <div class="casino-game-body">
                    <h3>${escapeHTML(game.name)}</h3>
                    <p>${escapeHTML(game.provider || "BLOXIO")}</p>
                    <div class="casino-game-meta">
                        <span>${escapeHTML(game.category || "casino")}</span>
                        <span>RTP ${escapeHTML(game.rtp ?? "—")}${game.rtp != null ? "%" : ""}</span>
                    </div>
                </div>
            </button>`;
    },

    featured(game) {
        return `
            <button class="casino-featured-card"
                type="button"
                data-game="${escapeHTML(game.id)}">
                <img loading="lazy"
                    src="${escapeHTML(game.image || "")}"
                    alt="${escapeHTML(game.name || "Featured game")}">
                <div>
                    <h4>${escapeHTML(game.name)}</h4>
                    <p>${escapeHTML(game.provider || "BLOXIO")}</p>
                </div>
            </button>`;
    },

    feed(row) {
        return `
            <div class="feed-row">
                <span>${escapeHTML(row.user)}</span>
                <span>${escapeHTML(row.game)}</span>
                <strong>${escapeHTML(row.amount)} ${escapeHTML(row.currency || "BX")}</strong>
            </div>`;
    },

    winner(row) {
        return `
            <div class="winner-row">
                <span>${escapeHTML(row.user)}</span>
                <span>${escapeHTML(row.game)}</span>
                <strong>${escapeHTML(row.amount)} ${escapeHTML(row.currency || "BX")}</strong>
            </div>`;
    },

    leaderboard(row) {
        return `
            <div class="leaderboard-row">
                <span>#${escapeHTML(row.rank)}</span>
                <span>${escapeHTML(row.username)}</span>
                <strong>${escapeHTML(row.profit)}</strong>
            </div>`;
    },

    tournament(row) {
        return `
            <div class="tournament-card">
                <h4>${escapeHTML(row.name)}</h4>
                <p>Prize: ${escapeHTML(row.prize)}</p>
                <p>Players: ${escapeHTML(row.players ?? 0)}</p>
            </div>`;
    }
};

/* =========================================================
   14. RENDERING
   ========================================================= */

export const VirtualList = {
    render(root, items, renderer) {
        if (!root) return;

        root.innerHTML = (Array.isArray(items) ? items : [])
            .map(renderer)
            .join("");
    }
};

export const WalletUI = {
    update() {
        if (DOM.bxBalance) {
            DOM.bxBalance.textContent = Wallet.get("BX").toFixed(4);
        }

        if (DOM.xbcBalance) {
            DOM.xbcBalance.textContent = Wallet.get("XBC").toFixed(2);
        }

        const walletText = $("#casinoWalletText");

        if (walletText) {
            walletText.textContent =
                `${Wallet.get()} ${STATE.currency}`;
        }
    }
};

export const CategoryUI = {
    update() {
        const games = Registry.all();

        const count = category =>
            games.filter(game => game.category === category).length;

        if (DOM.catOriginals) DOM.catOriginals.textContent = count("originals");
        if (DOM.catArcade) DOM.catArcade.textContent = count("arcade");
        if (DOM.catCards) DOM.catCards.textContent = count("cards");
        if (DOM.catSlots) DOM.catSlots.textContent = count("slots");
        if (DOM.catRoulette) DOM.catRoulette.textContent = count("roulette");
    }
};

export const GamesUI = {
    render(games = Registry.all()) {
        VirtualList.render(DOM.gamesGrid, games, Templates.game);
    },

    refresh() {
        this.render();
    }
};

export const FeaturedUI = {
    render() {
        VirtualList.render(
            DOM.featuredTrack,
            Registry.featured(),
            Templates.featured
        );
    }
};

export const FeedUI = {
    render() {
        VirtualList.render(DOM.liveFeed, STATE.feeds.live, Templates.feed);
    }
};

export const WinnersUI = {
    render() {
        VirtualList.render(
            DOM.liveWinners,
            STATE.feeds.winners,
            Templates.winner
        );
    }
};

export const LeaderboardUI = {
    render() {
        VirtualList.render(
            DOM.leaderboard,
            STATE.casino.leaderboard,
            Templates.leaderboard
        );
    }
};

export const TournamentUI = {
    render() {
        VirtualList.render(
            DOM.tournaments,
            STATE.casino.tournaments,
            Templates.tournament
        );
    }
};

export const JackpotUI = {
    update() {
        const values = STATE.casino.jackpots;

        const elements = {
            crash: DOM.jackpotCrash,
            mines: DOM.jackpotMines,
            plinko: DOM.jackpotPlinko,
            wheel: DOM.jackpotWheel
        };

        Object.entries(elements).forEach(([key, element]) => {
            if (element && values[key] !== undefined) {
                element.textContent = String(values[key]);
            }
        });
    }
};

export const StatsUI = {
    update() {
        if (DOM.gamesCount) {
            DOM.gamesCount.textContent = Registry.all().length;
        }

        if (DOM.onlinePlayers) {
            DOM.onlinePlayers.textContent =
                String(STATE.casino.onlinePlayers);
        }
    }
};

/* =========================================================
   15. SEARCH AND FILTERS
   ========================================================= */

export const SearchUI = {
    init() {
        if (!DOM.searchInput || this.bound) return;

        this.bound = true;

        DOM.searchInput.addEventListener("input", event => {
            STATE.filters.search = event.target.value.trim();

            let games = Registry.search(STATE.filters.search);

            if (STATE.filters.category !== "all") {
                const category = Registry.category(
                    STATE.filters.category
                );

                const ids = new Set(category.map(game => game.id));
                games = games.filter(game => ids.has(game.id));
            }

            GamesUI.render(games);
        });
    },

    bound: false
};

export const FilterUI = {
    init() {
        if (this.bound) return;

        this.bound = true;

        $$(".casino-filter-btn").forEach(button => {
            button.addEventListener("click", () => {
                $$(".casino-filter-btn").forEach(item =>
                    item.classList.remove("active")
                );

                button.classList.add("active");

                const category = button.dataset.tab || "all";
                STATE.filters.category = category;

                let games = Registry.category(category);

                if (STATE.filters.search) {
                    const ids = new Set(
                        Registry.search(STATE.filters.search)
                            .map(game => game.id)
                    );

                    games = games.filter(game => ids.has(game.id));
                }

                GamesUI.render(games);
            });
        });
    },

    bound: false
};

/* =========================================================
   16. GAME VIEW
   ========================================================= */

export const GameView = {
    open(id) {
        const game = Registry.get(id);
        if (!game || !DOM.gameContainer) return false;

        this.close(false);

        STATE.activeGame = game.id;

        if (DOM.gameView) {
            DOM.gameView.classList.remove("hidden");
        }

        DOM.gameContainer.innerHTML = `
            <div class="casino-active-view">
                <div class="casino-active-header">
                    <h2>${escapeHTML(game.name)}</h2>
                    <button type="button" id="closeGame">Close</button>
                </div>
                <div id="casinoRuntime"
                    data-game="${escapeHTML(game.id)}">
                    <div class="casino-runtime-placeholder">
                        <p>${escapeHTML(game.name)}</p>
                        <span>Connecting to game service...</span>
                    </div>
                </div>
                <p class="casino-runtime-status"
                    id="casinoRuntimeStatus"
                    role="status"></p>
            </div>`;

        BUS.emit("game:open", game);
        return true;
    },

    close(emit = true) {
        const previous = STATE.activeGame;

        PixiEngine.destroyAll();
        CrashPixi.stop();

        STATE.activeGame = null;

        if (DOM.gameView) {
            DOM.gameView.classList.add("hidden");
        }

        if (DOM.gameContainer) {
            DOM.gameContainer.innerHTML = "";
        }

        if (emit && previous) {
            BUS.emit("game:close", previous);
        }
    }
};

/* =========================================================
   17. CLICK ROUTER
   ========================================================= */

export const ClickRouter = {
    init() {
        if (this.bound) return;

        this.bound = true;

        document.addEventListener("click", event => {
            const gameButton = event.target.closest(
                ".casino-game-card, .casino-featured-card"
            );

            if (gameButton) {
                GameView.open(gameButton.dataset.game);
                return;
            }

            if (event.target.closest("#closeGame")) {
                GameView.close();
            }
        });
    },

    bound: false
};

/* =========================================================
   18. CENTRAL REALTIME ADAPTER
   Uses window.WS only. No independent Socket.IO connection.
   ========================================================= */

export const SocketEngine = {
    connected: false,
    cleanups: [],

    connect() {
        const ws = window.WS;

        if (!ws) {
            console.warn("[CASINO WS] Central WS service unavailable.");
            return false;
        }

        if (typeof ws.on === "function") {
            const events = {
                "casino:online": count => {
                    STATE.casino.onlinePlayers = safeNumber(count);
                    StatsUI.update();
                },

                "casino:feed": payload => {
                    if (!payload) return;
                    STATE.feeds.live.unshift(payload);
                    STATE.feeds.live = STATE.feeds.live.slice(0, 50);
                    FeedUI.render();
                },

                "casino:winner": payload => {
                    if (!payload) return;
                    STATE.feeds.winners.unshift(payload);
                    STATE.feeds.winners = STATE.feeds.winners.slice(0, 50);
                    WinnersUI.render();
                },

                "casino:bigwin": payload => {
                    if (!payload) return;
                    STATE.feeds.bigWins.unshift(payload);
                    STATE.feeds.bigWins = STATE.feeds.bigWins.slice(0, 30);
                    BUS.emit("bigwin:update", payload);
                },

                "casino:leaderboard": rows => {
                    if (!Array.isArray(rows)) return;
                    STATE.casino.leaderboard = rows;
                    LeaderboardUI.render();
                },

                "casino:jackpot": payload => {
                    if (!payload || typeof payload !== "object") return;
                    Object.assign(STATE.casino.jackpots, payload);
                    JackpotUI.update();
                },

                "casino:tournaments": rows => {
                    if (!Array.isArray(rows)) return;
                    STATE.casino.tournaments = rows;
                    TournamentUI.render();
                },

                "casino:rain": payload => BUS.emit("rain:update", payload)
            };

            Object.entries(events).forEach(([name, callback]) => {
                const cleanup = ws.on(name, callback);

                if (typeof cleanup === "function") {
                    this.cleanups.push(cleanup);
                }
            });
        }

        if (typeof ws.subscribe === "function") {
            ws.subscribe("casino");
        }

        this.connected = Boolean(
            typeof ws.connected === "function"
                ? ws.connected()
                : ws.connected
        );

        STATE.runtime.socket = this.connected;
        return true;
    },

    disconnect() {
        this.cleanups.forEach(cleanup => cleanup());
        this.cleanups = [];

        if (window.WS?.unsubscribe) {
            window.WS.unsubscribe("casino");
        }

        this.connected = false;
        STATE.runtime.socket = false;
    },

    emit(event, data = {}) {
        if (!window.WS?.send) return false;

        return window.WS.send({
            type: event,
            ...data
        });
    }
};

/* =========================================================
   19. CONFIRMED GAME OPERATIONS
   No local outcome generation or local balance changes.
   ========================================================= */

export const BetEngine = {
    pending: false,

    async place(amount, gameId = STATE.activeGame, extra = {}) {
        amount = safeNumber(amount);

        if (this.pending) {
            throw new Error("A bet is already being processed.");
        }

        if (!gameId || amount < Currency.minBet()) {
            throw new Error("Invalid game or bet amount.");
        }

        this.pending = true;
        BUS.emit("bet:pending", { amount, gameId });

        try {
            const result = await CasinoAPI.play({
                gameId,
                amount,
                currency: STATE.currency,
                ...extra
            });

            if (result?.balance) {
                Wallet.sync(result.balance);
            }

            if (result?.wallet) {
                Wallet.sync(result.wallet);
            }

            if (result?.analytics) {
                Object.assign(STATE.analytics, result.analytics);
                Persistence.saveState();
            }

            BUS.emit("bet:confirmed", result);
            return result;
        } catch (error) {
            BUS.emit("bet:error", error);
            throw error;
        } finally {
            this.pending = false;
        }
    }
};

/* =========================================================
   20. CRASH GAME — SERVER AUTHORITATIVE
   ========================================================= */

export const CrashGame = {
    running: false,
    multiplier: 1,
    roundId: null,

    async start(amount) {
        if (this.running) {
            throw new Error("Crash round already active.");
        }

        const result = await CasinoAPI.crashJoin({
            amount: safeNumber(amount),
            currency: STATE.currency
        });

        this.running = true;
        this.multiplier = safeNumber(result?.multiplier) || 1;
        this.roundId = result?.roundId || result?.id || null;

        BUS.emit("crash:joined", result);
        return result;
    },

    async cashout() {
        if (!this.running || !this.roundId) {
            throw new Error("No active Crash round.");
        }

        const result = await CasinoAPI.crashCashout({
            roundId: this.roundId
        });

        this.running = false;
        BUS.emit("crash:cashout", result);
        return result;
    },

    update(payload) {
        if (!payload) return;

        this.multiplier = safeNumber(payload.multiplier) || 1;
        this.running = payload.running !== false;

        BUS.emit("crash:update", this.multiplier);
    },

    stop() {
        this.running = false;
        this.roundId = null;
    }
};

/* =========================================================
   21. LEGACY GAME ADAPTERS
   No local random financial outcomes.
   ========================================================= */

export const MinesGame = {
    async play(payload = {}) {
        return BetEngine.place(
            payload.amount,
            "mines",
            payload
        );
    }
};

export const PlinkoGame = {
    async drop(payload = {}) {
        return BetEngine.place(
            payload.amount,
            "plinko",
            payload
        );
    }
};

export const WheelGame = {
    async spin(payload = {}) {
        return BetEngine.place(
            payload.amount,
            "wheel",
            payload
        );
    }
};

export const DiceGame = {
    async roll(payload = {}) {
        return BetEngine.place(
            payload.amount,
            "dice",
            payload
        );
    }
};

export const CoinflipGame = {
    async flip(payload = {}) {
        return BetEngine.place(
            payload.amount,
            "coinflip",
            payload
        );
    }
};

export const LimboGame = {
    async roll(payload = {}) {
        return BetEngine.place(
            payload.amount,
            "limbo",
            payload
        );
    }
};

export const HiloGame = {
    async draw(payload = {}) {
        return BetEngine.place(
            payload.amount,
            "hilo",
            payload
        );
    }
};

export const GameFactory = {
    get(id) {
        const games = {
            crash: CrashGame,
            mines: MinesGame,
            plinko: PlinkoGame,
            wheel: WheelGame,
            dice: DiceGame,
            coinflip: CoinflipGame,
            limbo: LimboGame,
            hilo: HiloGame
        };

        return games[id] || null;
    }
};

/* =========================================================
   22. RAIN AND TIPS
   Backend requests only; no local reward simulation.
   ========================================================= */

export const RainRuntime = {
    current: null,

    update(payload) {
        this.current = payload || null;
        BUS.emit("rain:update", this.current);
    },

    async join() {
        return SocketEngine.emit("casino:rain:join");
    },

    async claim() {
        return SocketEngine.emit("casino:rain:claim");
    }
};

export const TipsEngine = {
    open() {
        BUS.emit("tips:open");
    },

    send(user, amount, currency = STATE.currency) {
        amount = safeNumber(amount);

        if (!user || amount <= 0) {
            throw new Error("Invalid tip details.");
        }

        return SocketEngine.emit("casino:tip", {
            user,
            amount,
            currency
        });
    }
};

/* =========================================================
   23. VISUAL ENGINES
   ========================================================= */

export const AnimationEngine = {
    enabled: false,

    init() {
        this.enabled =
            Settings.animations &&
            typeof window.gsap !== "undefined";

        return this.enabled;
    },

    cards() {
        if (!this.enabled) return;

        window.gsap.from(".casino-game-card", {
            opacity: 0,
            y: 20,
            duration: 0.35,
            stagger: 0.025
        });
    },

    featured() {
        if (!this.enabled) return;

        window.gsap.from(".casino-featured-card", {
            opacity: 0,
            scale: 0.96,
            duration: 0.35,
            stagger: 0.04
        });
    },

    kill() {
        if (this.enabled) {
            window.gsap.killTweensOf(
                ".casino-game-card, .casino-featured-card"
            );
        }
    }
};

export const PixiEngine = {
    enabled: false,
    apps: new Map(),

    init() {
        this.enabled = typeof window.PIXI !== "undefined";
        STATE.runtime.pixi = this.enabled;
        return this.enabled;
    },

    async create(id, container) {
        if (!this.enabled || !container) return null;

        if (this.apps.has(id)) {
            return this.apps.get(id);
        }

        const PIXI = window.PIXI;
        let app;

        try {
            app = new PIXI.Application();

            if (typeof app.init === "function") {
                await app.init({
                    resizeTo: container,
                    antialias: true,
                    backgroundAlpha: 0
                });
            } else {
                app = new PIXI.Application({
                    resizeTo: container,
                    antialias: true,
                    backgroundAlpha: 0
                });
            }

            const canvas = app.canvas || app.view;

            if (canvas && !canvas.parentNode) {
                container.appendChild(canvas);
            }

            this.apps.set(id, app);
            return app;
        } catch (error) {
            console.error("[CASINO PIXI]", error);
            return null;
        }
    },

    get(id) {
        return this.apps.get(id) || null;
    },

    destroy(id) {
        const app = this.apps.get(id);
        if (!app) return;

        try {
            app.destroy(true, {
                children: true,
                texture: false,
                textureSource: false
            });
        } catch (error) {
            console.warn("[PIXI DESTROY]", error);
        }

        this.apps.delete(id);
    },

    destroyAll() {
        [...this.apps.keys()].forEach(id => this.destroy(id));
    }
};

export const AudioEngine = {
    enabled: false,
    sounds: {},

    init() {
        if (typeof window.Howl === "undefined") return false;

        this.enabled = Settings.sound;
        STATE.runtime.audio = true;

        const files = {
            click: "click",
            win: "win",
            lose: "lose",
            jackpot: "jackpot",
            rain: "rain",
            tip: "tip",
            spin: "spin",
            crash: "crash"
        };

        Object.entries(files).forEach(([key, file]) => {
            this.sounds[key] = new window.Howl({
                src: [`/assets/sounds/${file}.mp3`],
                preload: false,
                volume: 0.65
            });
        });

        return true;
    },

    play(name) {
        if (!this.enabled) return;

        this.sounds[name]?.play();
    },

    stop(name) {
        this.sounds[name]?.stop();
    },

    toggle() {
        this.enabled = !this.enabled;
        Settings.sound = this.enabled;
        Settings.save();
        return this.enabled;
    },

    destroy() {
        Object.values(this.sounds).forEach(sound => sound.unload());
        this.sounds = {};
    }
};

export const ChartsEngine = {
    chart: null,
    series: null,
    observer: null,

    init() {
        const library = window.LightweightCharts;
        const root = DOM.bigWinStats;

        if (!library || !root) return false;

        try {
            this.chart = library.createChart(root, {
                width: root.clientWidth || 300,
                height: 220,
                layout: {
                    background: { color: "transparent" },
                    textColor: "#aebbd0"
                },
                grid: {
                    vertLines: { color: "rgba(255,255,255,.04)" },
                    horzLines: { color: "rgba(255,255,255,.04)" }
                }
            });

            if (typeof this.chart.addAreaSeries === "function") {
                this.series = this.chart.addAreaSeries();
            } else if (typeof this.chart.addSeries === "function" &&
                       library.AreaSeries) {
                this.series = this.chart.addSeries(library.AreaSeries);
            }

            if (typeof ResizeObserver !== "undefined") {
                this.observer = new ResizeObserver(entries => {
                    const width = entries[0]?.contentRect?.width;
                    if (width) this.chart?.applyOptions({ width });
                });

                this.observer.observe(root);
            }

            STATE.runtime.charts = Boolean(this.series);
            return Boolean(this.series);
        } catch (error) {
            console.warn("[CASINO CHART]", error);
            return false;
        }
    },

    update(point) {
        if (!this.series || !point) return;

        if (point.time == null || point.value == null) return;

        this.series.update({
            time: point.time,
            value: safeNumber(point.value)
        });
    },

    destroy() {
        this.observer?.disconnect();
        this.observer = null;

        this.chart?.remove();
        this.chart = null;
        this.series = null;
        STATE.runtime.charts = false;
    }
};

/* =========================================================
   24. GAME RENDER BRIDGES
   ========================================================= */

export const CrashPixi = {
    app: null,
    line: null,

    async mount(container) {
        this.app = await PixiEngine.create("crash", container);
        if (!this.app || !window.PIXI) return;

        this.line = new window.PIXI.Graphics();
        this.app.stage.addChild(this.line);
    },

    render(multiplier) {
        if (!this.line) return;

        this.line.clear();

        if (this.line.moveTo && this.line.lineTo) {
            this.line.moveTo(0, 200);
            this.line.lineTo(
                clamp(multiplier, 1, 30) * 12,
                200 - clamp(multiplier, 1, 30) * 5
            );

            this.line.stroke?.({
                width: 4,
                color: 0x22d68a
            });
        }
    },

    stop() {
        this.line = null;
        this.app = null;
    }
};

export const PlinkoPixi = {
    app: null,

    async mount(container) {
        this.app = await PixiEngine.create("plinko", container);
        return this.app;
    }
};

export const RoulettePixi = {
    app: null,

    async mount(container) {
        this.app = await PixiEngine.create("roulette", container);
        return this.app;
    }
};

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

BUS.on("crash:update", value => {
    const element = $("#crashMultiplier");

    if (element) {
        element.textContent = `${safeNumber(value).toFixed(2)}x`;
    }

    CrashPixi.render(value);
});

BUS.on("game:open", async game => {
    const runtime = $("#casinoRuntime");
    if (!runtime) return;

    if (game.id === "crash") {
        await CrashPixi.mount(runtime);
    } else if (game.id === "plinko") {
        await PlinkoPixi.mount(runtime);
    } else if (["roulette", "wheel"].includes(game.id)) {
        await RoulettePixi.mount(runtime);
    }
});

BUS.on("game:close", () => {
    CrashPixi.stop();
    PixiEngine.destroyAll();
});

/* =========================================================
   26. APP UTILITIES
   ========================================================= */

export const HealthEngine = {
    run() {
        return [
            { name: "Wallet", status: Boolean(Wallet) },
            { name: "Registry", status: Boolean(Registry) },
            { name: "Central WS", status: Boolean(window.WS) },
            { name: "PixiJS", status: typeof window.PIXI !== "undefined" },
            { name: "Howler", status: typeof window.Howl !== "undefined" },
            {
                name: "Lightweight Charts",
                status: typeof window.LightweightCharts !== "undefined"
            }
        ];
    }
};

export const CasinoAnalytics = {
    sessionStart: Date.now(),

    sessionDuration() {
        return Math.floor((Date.now() - this.sessionStart) / 1000);
    },

    snapshot() {
        return {
            version: STATE.version,
            currency: STATE.currency,
            analytics: { ...STATE.analytics },
            online: STATE.casino.onlinePlayers,
            games: Registry.all().length
        };
    }
};

export const Hotkeys = {
    init() {
        if (this.bound) return;
        this.bound = true;

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") GameView.close();

            if (event.key === "/" &&
                !["INPUT", "TEXTAREA"].includes(
                    document.activeElement?.tagName
                )) {
                event.preventDefault();
                DOM.searchInput?.focus();
            }
        });
    },

    bound: false
};

export const VisibilityEngine = {
    init() {
        if (this.bound) return;
        this.bound = true;

        document.addEventListener("visibilitychange", () => {
            BUS.emit(document.hidden ? "app:hidden" : "app:visible");
        });
    },

    bound: false
};

export const MobileEngine = {
    init() {
        if (this.bound) return;
        this.bound = true;

        $("#mobileCasinoSearch")?.addEventListener("click", () => {
            DOM.searchInput?.focus();
        });

        $("#mobileCasinoWallet")?.addEventListener("click", () => {
            BUS.emit("wallet:open");
        });

        $("#mobileCasinoLeaderboard")?.addEventListener("click", () => {
            DOM.leaderboard?.scrollIntoView({ behavior: "smooth" });
        });
    },

    bound: false
};

/* =========================================================
   27. APP LIFECYCLE
   ========================================================= */

export const CasinoApp = {
    started: false,

    start() {
        if (this.started) return true;

        CasinoCore.start();

        GameLoader.load();

        WalletSync.start();
        FeedSync.start();
        JackpotSync.start();
        TournamentSync.start();
        LeaderboardSync.start();

        SearchUI.init();
        FilterUI.init();
        ClickRouter.init();

        AnimationEngine.init();
        AnimationEngine.cards();
        AnimationEngine.featured();

        PixiEngine.init();
        AudioEngine.init();
        ChartsEngine.init();

        SocketEngine.connect();

        Hotkeys.init();
        VisibilityEngine.init();
        MobileEngine.init();

        $$(".casino-currency").forEach(button => {
            if (button.dataset.casinoBound) return;
            button.dataset.casinoBound = "1";

            button.addEventListener("click", () => {
                $$(".casino-currency").forEach(item =>
                    item.classList.remove("active")
                );

                button.classList.add("active");

                Currency.set(button.dataset.currency);
            });
        });

        $("#joinRainBtn")?.addEventListener("click", () => {
            RainRuntime.join();
        });

        $("#claimRainBtn")?.addEventListener("click", () => {
            RainRuntime.claim();
        });

        $("#sendTipBtn")?.addEventListener("click", () => {
            TipsEngine.open();
        });

        DevTools.mount();

        STATE.ready = true;
        this.started = true;

        BUS.emit("casino:started", STATE);

        console.log(`[${VERSION.name} ${VERSION.version}] READY`);

        return true;
    },

    stop() {
        if (!this.started) return;

        SocketEngine.disconnect();

        AnimationEngine.kill();
        ChartsEngine.destroy();
        PixiEngine.destroyAll();
        AudioEngine.destroy();

        CrashGame.stop();

        STATE.ready = false;
        this.started = false;

        BUS.emit("casino:stopped");
    },

    destroy() {
        this.stop();
        CasinoCore.destroy();
    }
};

/* =========================================================
   28. SYNC ADAPTERS
   ========================================================= */

export const GameLoader = {
    load() {
        const games = Registry.all();

        games.forEach(game => {
            if (!game.provider) game.provider = "BLOXIO";
        });

        return games.length;
    }
};

export const WalletSync = {
    start() {
        WalletUI.update();
        BUS.emit("wallet:sync");
    }
};

export const FeedSync = {
    start() {
        FeedUI.render();
        WinnersUI.render();
    }
};

export const JackpotSync = {
    start() {
        JackpotUI.update();
    }
};

export const TournamentSync = {
    start() {
        TournamentUI.render();
    }
};

export const LeaderboardSync = {
    start() {
        LeaderboardUI.render();
    }
};

export const RealtimeRuntime = {
    start() {
        return SocketEngine.connect();
    },

    stop() {
        SocketEngine.disconnect();
    }
};

/* =========================================================
   29. COMPATIBILITY GLOBALS
   ========================================================= */

export const VERSION = {
    name: "BLOXIO CASINO",
    version: "4.0.0",
    build: "ENTERPRISE",
    release: "2026"
};

export const DevTools = {
    mount() {
        window.BLOXIO = {
            VERSION,
            STATE,
            BUS,
            Wallet,
            Currency,
            Registry,
            Analytics,
            CasinoAPI,
            SocketEngine,
            CasinoAnalytics
        };

        window.CasinoCore = CasinoCore;
        window.CasinoState = STATE;
        window.CasinoWallet = Wallet;
        window.CasinoRegistry = Registry;
        window.CasinoBus = BUS;
    }
};

window.CasinoApp = CasinoApp;
window.CasinoVersion = VERSION;
window.CasinoAnalytics = CasinoAnalytics;

/* Compatibility for existing code expecting window.CASINO */
window.CASINO = CasinoApp;

/* Bootstrap is safe whether module loads before or after DOM ready. */
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        () => CasinoApp.start(),
        { once: true }
    );
} else {
    CasinoApp.start();
}
