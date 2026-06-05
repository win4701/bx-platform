/* =========================================================
   BLOXIO CASINO V2 ENTERPRISE
   PART 1 — CORE ENGINE
   Version: 2.0
========================================================= */

"use strict";

/* =========================================================
   IMPORTS
========================================================= */

import { CASINO_GAMES } from "./data/games.js";
import { COINS } from "./data/coins.js";

/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

const clamp = (n, min, max) =>
    Math.min(Math.max(n, min), max);

const rand = (min, max) =>
    Math.random() * (max - min) + min;

const randInt = (min, max) =>
    Math.floor(rand(min, max + 1));

const uid = () =>
    Math.random().toString(36).slice(2, 12);

/* =========================================================
   STORAGE
========================================================= */

const STORAGE = {

    WALLET: "bx_wallet",

    CASINO: "bx_casino",

    HISTORY: "bx_casino_history",

    SETTINGS: "bx_casino_settings",

    LEADERBOARD: "bx_casino_leaderboard"

};

/* =========================================================
   EVENT BUS
========================================================= */

class EventBus {

    constructor() {

        this.events = {};

    }

    on(event, callback) {

        if (!this.events[event]) {

            this.events[event] = [];

        }

        this.events[event].push(callback);

    }

    emit(event, payload) {

        if (!this.events[event]) return;

        this.events[event]
            .forEach(fn => fn(payload));

    }

}

export const BUS = new EventBus();

/* =========================================================
   STATE
========================================================= */

export const STATE = {

    initialized: false,

    currency: "BX",

    wallet: {

        BX: 0,

        XBC: 0

    },

    user: {

        vip: 0,

        wagers: 0,

        wins: 0,

        losses: 0

    },

    portfolio: {

        volume: 0,

        pnl: 0,

        profit: 0

    },

    casino: {

        online: 0,

        activeGame: null,

        featured: [],

        jackpots: {},

        tournaments: [],

        leaderboard: [],

        rainPool: 0

    },

    filters: {

        search: "",

        category: "all"

    },

    feeds: {

        live: [],

        winners: [],

        bigWins: []

    },

    analytics: {

        totalWagered: 0,

        totalWon: 0,

        totalLost: 0,

        activityScore: 0

    }

};

/* =========================================================
   WALLET ENGINE
========================================================= */

export const WalletEngine = {

    load() {

        try {

            const data =
                localStorage.getItem(
                    STORAGE.WALLET
                );

            if (!data) return;

            STATE.wallet =
                JSON.parse(data);

        }

        catch {}

    },

    save() {

        localStorage.setItem(

            STORAGE.WALLET,

            JSON.stringify(
                STATE.wallet
            )

        );

    },

    get(currency = STATE.currency) {

        return Number(

            STATE.wallet[currency] || 0

        );

    },

    set(currency, value) {

        STATE.wallet[currency] =
            Number(value || 0);

        this.save();

        BUS.emit(

            "wallet:update",

            STATE.wallet

        );

    },

    credit(currency, amount) {

        STATE.wallet[currency] +=
            Number(amount || 0);

        this.save();

        BUS.emit(

            "wallet:update",

            STATE.wallet

        );

    },

    debit(currency, amount) {

        amount = Number(amount || 0);

        if (
            STATE.wallet[currency] <
            amount
        ) {
            return false;
        }

        STATE.wallet[currency] -=
            amount;

        this.save();

        BUS.emit(

            "wallet:update",

            STATE.wallet

        );

        return true;

    }

};

/* =========================================================
   CURRENCY ENGINE
========================================================= */

export const CurrencyEngine = {

    set(currency) {

        if (
            currency !== "BX" &&
            currency !== "XBC"
        ) {
            return;
        }

        STATE.currency = currency;

        BUS.emit(

            "currency:change",

            currency

        );

    },

    get() {

        return STATE.currency;

    },

    getMinBet() {

        return STATE.currency === "XBC"

            ? 10

            : 0.1;

    }

};

/* =========================================================
   GAMES ENGINE
========================================================= */

export const GamesEngine = {

    all() {

        return CASINO_GAMES || [];

    },

    featured() {

        return this.all()
            .filter(g => g.featured);

    },

    search(term = "") {

        term =
            term.toLowerCase();

        return this.all()

            .filter(game =>

                game.name
                    .toLowerCase()
                    .includes(term)

                ||

                game.category
                    .toLowerCase()
                    .includes(term)

            );

    },

    category(name) {

        if (
            name === "all"
        ) {
            return this.all();
        }

        return this.all()

            .filter(

                game =>
                    game.category === name

            );

    },

    get(id) {

        return this.all()

            .find(

                game =>
                    game.id === id

            );

    }

};

/* =========================================================
   JACKPOT ENGINE
========================================================= */

export const JackpotEngine = {

    init() {

        STATE.casino.jackpots = {

            crash: 2500,

            mines: 1800,

            plinko: 3200,

            wheel: 900,

            slots: 5000

        };

        setInterval(() => {

            Object.keys(

                STATE.casino.jackpots

            )

                .forEach(key => {

                    STATE.casino.jackpots[
                        key
                    ] += randInt(
                        1,
                        25
                    );

                });

            BUS.emit(

                "jackpot:update",

                STATE.casino.jackpots

            );

        }, 5000);

    }

};

/* =========================================================
   LIVE FEED ENGINE
========================================================= */

export const FeedEngine = {

    names: [

        "CryptoWolf",
        "LuckyAce",
        "MoonBoy",
        "HashKing",
        "BXPlayer",
        "DiamondX",
        "RocketMan",
        "CasinoPro"

    ],

    generate() {

        const game =

            CASINO_GAMES[
                randInt(
                    0,
                    CASINO_GAMES.length - 1
                )
            ];

        const row = {

            id: uid(),

            user:

                this.names[
                    randInt(
                        0,
                        this.names.length - 1
                    )
                ],

            game:

                game.name,

            amount:

                randInt(
                    10,
                    5000
                ),

            currency:

                randInt(0, 1)
                    ? "BX"
                    : "XBC"

        };

        STATE.feeds.live
            .unshift(row);

        STATE.feeds.live =
            STATE.feeds.live
                .slice(0, 50);

        BUS.emit(

            "feed:update",

            STATE.feeds.live

        );

    },

    start() {

        setInterval(

            () =>
                this.generate(),

            3000

        );

    }

};

/* =========================================================
   BIG WINS ENGINE
========================================================= */

export const BigWinsEngine = {

    generate() {

        const game =

            CASINO_GAMES[
                randInt(
                    0,
                    CASINO_GAMES.length - 1
                )
            ];

        const row = {

            id: uid(),

            user:

                "Player" +

                randInt(
                    1000,
                    9999
                ),

            game:

                game.name,

            amount:

                randInt(
                    500,
                    25000
                ),

            multiplier:

                rand(
                    2,
                    150
                ).toFixed(2)

        };

        STATE.feeds.bigWins
            .unshift(row);

        STATE.feeds.bigWins =
            STATE.feeds.bigWins
                .slice(0, 30);

        BUS.emit(

            "bigwins:update",

            STATE.feeds.bigWins

        );

    },

    start() {

        setInterval(

            () =>
                this.generate(),

            10000

        );

    }

};

/* =========================================================
   LEADERBOARD ENGINE
========================================================= */

export const LeaderboardEngine = {

    generate() {

        const rows = [];

        for (
            let i = 0;
            i < 100;
            i++
        ) {

            rows.push({

                rank: i + 1,

                username:

                    "Player" +

                    randInt(
                        1000,
                        9999
                    ),

                wagered:

                    randInt(
                        1000,
                        1000000
                    ),

                profit:

                    randInt(
                        0,
                        500000
                    )

            });

        }

        STATE.casino.leaderboard =
            rows;

        BUS.emit(

            "leaderboard:update",

            rows

        );

    }

};

/* =========================================================
   TOURNAMENT ENGINE
========================================================= */

export const TournamentEngine = {

    init() {

        STATE.casino.tournaments = [

            {

                id: uid(),

                name:
                    "Daily BX Cup",

                players: 0,

                prize: 5000

            },

            {

                id: uid(),

                name:
                    "XBC Masters",

                players: 0,

                prize: 15000

            },

            {

                id: uid(),

                name:
                    "VIP Championship",

                players: 0,

                prize: 50000

            }

        ];

    }

};

/* =========================================================
   CASINO CORE
========================================================= */

export const CasinoCore = {

    init() {

        if (
            STATE.initialized
        ) {
            return;
        }

        WalletEngine.load();

        JackpotEngine.init();

        FeedEngine.start();

        BigWinsEngine.start();

        LeaderboardEngine.generate();

        TournamentEngine.init();

        STATE.casino.featured =
            GamesEngine.featured();

        STATE.initialized = true;

        BUS.emit(
            "casino:ready"
        );

        console.log(
            "[BLOXIO] Casino Core Ready"
        );

    }

};

window.CasinoCore =
    CasinoCore;

window.CasinoState =
    STATE;

/* =========================================================
   AUTO BOOT
========================================================= */

document.addEventListener(

    "DOMContentLoaded",

    () => {

        CasinoCore.init();

    }

);

/* =========================================================
   BLOXIO CASINO V2 ENTERPRISE
   PART 2 — UI + RENDER ENGINE
========================================================= */

"use strict";

/* =========================================================
   DOM CACHE
========================================================= */

export const DOM = {

    gamesGrid:
        $("#casinoGamesGrid"),

    featuredTrack:
        $("#casinoFeaturedTrack"),

    search:
        $("#casinoSearch"),

    gameView:
        $("#casinoGameView"),

    gameContainer:
        $("#casinoGameContainer"),

    liveFeed:
        $("#casinoTickerTrack"),

    leaderboard:
        $("#casinoLeaderboard"),

    leaderboardTop3:
        $("#casinoLeaderboardTop3"),

    winners:
        $("#casinoLiveWinners"),

    winnerTrack:
        $("#casinoLiveWinnerTrack"),

    tournaments:
        $("#casinoTournamentList"),

    jackpots: {

        crash:
            $("#jackpotCrash"),

        mines:
            $("#jackpotMines"),

        plinko:
            $("#jackpotPlinko"),

        wheel:
            $("#jackpotWheel")

    },

    bxBalance:
        $("#casinoBXBalance"),

    xbcBalance:
        $("#casinoXBCBalance"),

    online:
        $("#casinoOnlineText"),

    volume:
        $("#casinoVolumeText"),

    gamesCount:
        $("#casinoGamesCount"),

    catOriginals:
        $("#catOriginals"),

    catArcade:
        $("#catArcade"),

    catCards:
        $("#catCards"),

    catSlots:
        $("#catSlots"),

    catRoulette:
        $("#catRoulette")

};

/* =========================================================
   TEMPLATE ENGINE
========================================================= */

export const TemplateEngine = {

    game(game) {

        return `

        <button
            class="casino-game-card"
            data-game="${game.id}">

            <div class="casino-game-cover">

                <img
                    loading="lazy"
                    src="${game.image}"
                    alt="${game.name}">

            </div>

            <div class="casino-game-content">

                <h3>

                    ${game.name}

                </h3>

                <span>

                    ${game.category}

                </span>

                <div
                    class="casino-game-meta">

                    <small>

                        RTP ${game.rtp || 99}%

                    </small>

                </div>

            </div>

        </button>

        `;

    },

    featured(game) {

        return `

        <button
            class="casino-featured-card"
            data-game="${game.id}">

            <img
                loading="lazy"
                src="${game.image}"
                alt="${game.name}">

            <div>

                <h4>

                    ${game.name}

                </h4>

            </div>

        </button>

        `;

    },

    leaderboard(row) {

        return `

        <div
            class="leaderboard-row">

            <span>

                #${row.rank}

            </span>

            <span>

                ${row.username}

            </span>

            <strong>

                ${row.profit}

            </strong>

        </div>

        `;

    },

    winner(row) {

        return `

        <div
            class="winner-row">

            <span>

                ${row.user}

            </span>

            <span>

                ${row.game}

            </span>

            <strong>

                ${row.amount}

            </strong>

        </div>

        `;

    }

};

/* =========================================================
   RENDER ENGINE
========================================================= */

export const RenderEngine = {

    renderGames(list) {

        if (!DOM.gamesGrid)
            return;

        DOM.gamesGrid.innerHTML =
            list
                .map(

                    game =>
                        TemplateEngine.game(game)

                )
                .join("");

    },

    renderFeatured() {

        if (!DOM.featuredTrack)
            return;

        DOM.featuredTrack.innerHTML =

            STATE.casino.featured

                .map(

                    game =>
                        TemplateEngine.featured(game)

                )

                .join("");

    },

    renderCategories() {

        const games =
            GamesEngine.all();

        DOM.catOriginals.textContent =

            games.filter(

                g =>
                    g.category ===
                    "originals"

            ).length;

        DOM.catArcade.textContent =

            games.filter(

                g =>
                    g.category ===
                    "arcade"

            ).length;

        DOM.catCards.textContent =

            games.filter(

                g =>
                    g.category ===
                    "cards"

            ).length;

        DOM.catSlots.textContent =

            games.filter(

                g =>
                    g.category ===
                    "slots"

            ).length;

        DOM.catRoulette.textContent =

            games.filter(

                g =>
                    g.category ===
                    "roulette"

            ).length;

    },

    renderWallet() {

        DOM.bxBalance.textContent =

            WalletEngine
                .get("BX")
                .toFixed(4);

        DOM.xbcBalance.textContent =

            WalletEngine
                .get("XBC")
                .toFixed(2);

    },

    renderGamesCount() {

        DOM.gamesCount.textContent =

            GamesEngine.all()
                .length;

    }

};

/* =========================================================
   SEARCH ENGINE
========================================================= */

export const SearchEngine = {

    init() {

        if (!DOM.search)
            return;

        DOM.search.addEventListener(

            "input",

            e => {

                const value =
                    e.target.value
                        .trim();

                STATE.filters.search =
                    value;

                const games =

                    GamesEngine
                        .search(value);

                RenderEngine
                    .renderGames(games);

            }

        );

    }

};

/* =========================================================
   FILTER ENGINE
========================================================= */

export const FilterEngine = {

    init() {

        $$(
            ".casino-filter-btn"
        )

            .forEach(btn => {

                btn.addEventListener(

                    "click",

                    () => {

                        $$(
                            ".casino-filter-btn"
                        )

                            .forEach(

                                b =>
                                    b.classList.remove(
                                        "active"
                                    )

                            );

                        btn.classList.add(
                            "active"
                        );

                        const cat =

                            btn.dataset.tab;

                        STATE.filters.category =
                            cat;

                        RenderEngine.renderGames(

                            GamesEngine.category(
                                cat
                            )

                        );

                    }

                );

            });

    }

};

/* =========================================================
   GAME VIEW
========================================================= */

export const GameView = {

    open(gameId) {

        const game =

            GamesEngine.get(
                gameId
            );

        if (!game)
            return;

        DOM.gameView
            .classList
            .remove(
                "hidden"
            );

        DOM.gameContainer
            .innerHTML =

            `

            <div
                class="casino-active-game">

                <div
                    class="casino-active-header">

                    <h2>

                        ${game.name}

                    </h2>

                </div>

                <div
                    id="casinoGameCanvas">

                </div>

            </div>

            `;

        BUS.emit(

            "game:open",

            game

        );

    },

    close() {

        DOM.gameView
            .classList
            .add(
                "hidden"
            );

        DOM.gameContainer
            .innerHTML = "";

    }

};

/* =========================================================
   CLICK ROUTER
========================================================= */

export const ClickRouter = {

    init() {

        document.addEventListener(

            "click",

            e => {

                const card =
                    e.target.closest(
                        ".casino-game-card"
                    );

                if (card) {

                    GameView.open(

                        card.dataset.game

                    );

                }

            }

        );

    }

};

/* =========================================================
   JACKPOT UI
========================================================= */

export const JackpotUI = {

    update() {

        const jp =
            STATE.casino.jackpots;

        if (
            DOM.jackpots.crash
        ) {

            DOM.jackpots.crash
                .textContent =

                jp.crash
                .toFixed(0);

        }

        if (
            DOM.jackpots.mines
        ) {

            DOM.jackpots.mines
                .textContent =

                jp.mines
                .toFixed(0);

        }

        if (
            DOM.jackpots.plinko
        ) {

            DOM.jackpots.plinko
                .textContent =

                jp.plinko
                .toFixed(0);

        }

        if (
            DOM.jackpots.wheel
        ) {

            DOM.jackpots.wheel
                .textContent =

                jp.wheel
                .toFixed(0);

        }

    }

};

/* =========================================================
   LEADERBOARD UI
========================================================= */

export const LeaderboardUI = {

    render(rows) {

        if (
            !DOM.leaderboard
        ) return;

        DOM.leaderboard.innerHTML =

            rows

                .slice(0, 100)

                .map(

                    row =>
                        TemplateEngine
                            .leaderboard(
                                row
                            )

                )

                .join("");

    }

};

/* =========================================================
   LIVE FEED UI
========================================================= */

export const FeedUI = {

    render(rows) {

        if (
            !DOM.liveFeed
        ) return;

        DOM.liveFeed.innerHTML =

            rows

                .map(

                    row =>

                        `

                        <div
                            class="feed-row">

                            <span>

                                ${row.user}

                            </span>

                            <span>

                                ${row.game}

                            </span>

                            <strong>

                                ${row.amount}

                                ${row.currency}

                            </strong>

                        </div>

                        `

                )

                .join("");

    }

};

/* =========================================================
   GSAP ENGINE
========================================================= */

export const AnimationEngine = {

    init() {

        if (
            typeof gsap ===
            "undefined"
        ) {
            return;
        }

        gsap.from(

            ".casino-game-card",

            {

                y: 40,

                opacity: 0,

                stagger: 0.03,

                duration: 0.4

            }

        );

    }

};

/* =========================================================
   PIXI ENGINE
========================================================= */

export const PixiEngine = {

    create(container) {

        if (
            typeof PIXI ===
            "undefined"
        ) {
            return null;
        }

        const app =
            new PIXI.Application({

                resizeTo:
                    container,

                antialias:
                    true,

                backgroundAlpha:
                    0

            });

        container.appendChild(

            app.view

        );

        return app;

    }

};

/* =========================================================
   UI BOOT
========================================================= */

export const UIBoot = {

    init() {

        RenderEngine.renderGames(

            GamesEngine.all()

        );

        RenderEngine.renderFeatured();

        RenderEngine.renderCategories();

        RenderEngine.renderWallet();

        RenderEngine.renderGamesCount();

        SearchEngine.init();

        FilterEngine.init();

        ClickRouter.init();

        AnimationEngine.init();

    }

};

BUS.on(

    "jackpot:update",

    () =>
        JackpotUI.update()

);

BUS.on(

    "leaderboard:update",

    rows =>
        LeaderboardUI.render(
            rows
        )

);

BUS.on(

    "feed:update",

    rows =>
        FeedUI.render(
            rows
        )

);

document.addEventListener(

    "DOMContentLoaded",

    () => {

        UIBoot.init();

    }

);

/* =========================================================
   BLOXIO CASINO V2 ENTERPRISE
   PART 3 — REALTIME + AUDIO + ANALYTICS + PERFORMANCE
========================================================= */

"use strict";

/* =========================================================
   SOCKET ENGINE
========================================================= */

export const SocketEngine = {

    socket: null,

    connect() {

        if (
            typeof io === "undefined"
        ) {
            return;
        }

        this.socket = io();

        this.bind();

        console.log(
            "[CASINO] SOCKET CONNECTED"
        );

    },

    bind() {

        const s = this.socket;

        if (!s) return;

        s.on(

            "casino:online",

            count => {

                STATE.casino.online =
                    count;

                const el =
                    document.getElementById(
                        "casinoOnlineText"
                    );

                if (el) {

                    el.textContent =
                        count;

                }

            }

        );

        s.on(

            "casino:feed",

            payload => {

                STATE.feeds.live
                    .unshift(payload);

                BUS.emit(

                    "feed:update",

                    STATE.feeds.live

                );

            }

        );

        s.on(

            "casino:winner",

            payload => {

                STATE.feeds.winners
                    .unshift(payload);

                BUS.emit(

                    "winner:update",

                    payload

                );

            }

        );

        s.on(

            "casino:leaderboard",

            payload => {

                STATE.casino
                    .leaderboard =
                    payload;

                BUS.emit(

                    "leaderboard:update",

                    payload

                );

            }

        );

        s.on(

            "casino:jackpot",

            payload => {

                Object.assign(

                    STATE.casino.jackpots,

                    payload

                );

                BUS.emit(

                    "jackpot:update",

                    payload

                );

            }

        );

        s.on(

            "casino:rain",

            payload => {

                BUS.emit(

                    "rain:update",

                    payload

                );

            }

        );

        s.on(

            "casino:tournament",

            payload => {

                STATE.casino
                    .tournaments =
                    payload;

                BUS.emit(

                    "tournament:update",

                    payload

                );

            }

        );

    }

};

/* =========================================================
   HOWLER AUDIO
========================================================= */

export const AudioEngine = {

    enabled: true,

    sounds: {},

    init() {

        if (
            typeof Howl ===
            "undefined"
        ) {
            return;
        }

        this.sounds = {

            click:
                new Howl({

                    src: [
                        "/audio/click.mp3"
                    ]

                }),

            win:
                new Howl({

                    src: [
                        "/audio/win.mp3"
                    ]

                }),

            lose:
                new Howl({

                    src: [
                        "/audio/lose.mp3"
                    ]

                }),

            jackpot:
                new Howl({

                    src: [
                        "/audio/jackpot.mp3"
                    ]

                }),

            rain:
                new Howl({

                    src: [
                        "/audio/rain.mp3"
                    ]

                })

        };

    },

    play(name) {

        if (
            !this.enabled
        ) {
            return;
        }

        this.sounds[name]
            ?.play();

    }

};

/* =========================================================
   LIVE WINNERS
========================================================= */

export const WinnersEngine = {

    render() {

        const root =
            document.getElementById(
                "casinoLiveWinners"
            );

        if (!root)
            return;

        root.innerHTML =

            STATE.feeds.winners

                .slice(0, 25)

                .map(

                    row =>

                        `

                        <div class="winner-row">

                            <span>

                                ${row.user}

                            </span>

                            <span>

                                ${row.game}

                            </span>

                            <strong>

                                ${row.amount}

                            </strong>

                        </div>

                        `

                )

                .join("");

    }

};

BUS.on(

    "winner:update",

    () =>
        WinnersEngine.render()

);

/* =========================================================
   RAIN ENGINE
========================================================= */

export const RainEngine = {

    current: null,

    join() {

        if (
            !this.current
        ) {
            return;
        }

        AudioEngine.play(
            "rain"
        );

        alert(
            "Joined Rain"
        );

    },

    claim() {

        if (
            !this.current
        ) {
            return;
        }

        alert(
            "Rain Claimed"
        );

    }

};

BUS.on(

    "rain:update",

    payload => {

        RainEngine.current =
            payload;

    }

);

/* =========================================================
   TIPS ENGINE
========================================================= */

export const TipsEngine = {

    send(user, amount) {

        if (
            !WalletEngine.debit(
                STATE.currency,
                amount
            )
        ) {
            return false;
        }

        AudioEngine.play(
            "click"
        );

        console.log(

            "[TIP]",

            user,

            amount

        );

        return true;

    }

};

/* =========================================================
   TOURNAMENT UI
========================================================= */

export const TournamentUI = {

    render() {

        const root =
            document.getElementById(
                "casinoTournamentList"
            );

        if (!root)
            return;

        root.innerHTML =

            STATE.casino
                .tournaments

                .map(

                    row =>

                        `

                        <div class="tournament-card">

                            <h4>

                                ${row.name}

                            </h4>

                            <p>

                                Prize:
                                ${row.prize}

                            </p>

                        </div>

                        `

                )

                .join("");

    }

};

BUS.on(

    "tournament:update",

    () =>
        TournamentUI.render()

);

/* =========================================================
   PROVABLY FAIR
========================================================= */

export const FairEngine = {

    state: {

        serverSeed:
            "",

        clientSeed:
            "",

        nonce:
            0

    },

    generate() {

        this.state.serverSeed =
            crypto
                .randomUUID();

        this.state.clientSeed =
            crypto
                .randomUUID();

        this.state.nonce = 0;

        this.render();

    },

    nextNonce() {

        this.state.nonce++;

        this.render();

    },

    render() {

        const s =
            this.state;

        const server =
            document.getElementById(
                "serverSeed"
            );

        const client =
            document.getElementById(
                "clientSeed"
            );

        const nonce =
            document.getElementById(
                "nonceSeed"
            );

        if (server)
            server.textContent =
                s.serverSeed;

        if (client)
            client.textContent =
                s.clientSeed;

        if (nonce)
            nonce.textContent =
                s.nonce;

    }

};

/* =========================================================
   ANALYTICS ENGINE
========================================================= */

export const AnalyticsEngine = {

    trackBet(
        amount
    ) {

        STATE.analytics
            .totalWagered +=
            amount;

    },

    trackWin(
        amount
    ) {

        STATE.analytics
            .totalWon +=
            amount;

    },

    trackLoss(
        amount
    ) {

        STATE.analytics
            .totalLost +=
            amount;

    },

    activity() {

        const a =
            STATE.analytics;

        return (

            a.totalWon +
            a.totalWagered

        );

    }

};

/* =========================================================
   LIGHTWEIGHT CHARTS
========================================================= */

export const ChartsEngine = {

    chart: null,

    init() {

        if (

            typeof LightweightCharts
            === "undefined"

        ) {
            return;
        }

        const root =

            document.getElementById(
                "casinoBigWinStats"
            );

        if (!root)
            return;

        this.chart =

            LightweightCharts
                .createChart(
                    root,
                    {
                        width:
                            root.clientWidth,

                        height:
                            220
                    }
                );

        const series =

            this.chart
                .addAreaSeries();

        series.setData([
            {
                time: 1,
                value: 10
            },
            {
                time: 2,
                value: 30
            },
            {
                time: 3,
                value: 25
            }
        ]);

    }

};

/* =========================================================
   MOBILE ACTIONS
========================================================= */

export const MobileEngine = {

    init() {

        document
            .getElementById(
                "mobileCasinoSearch"
            )
            ?.addEventListener(

                "click",

                () => {

                    document
                        .getElementById(
                            "casinoSearch"
                        )
                        ?.focus();

                }

            );

        document
            .getElementById(
                "mobileCasinoWallet"
            )
            ?.addEventListener(

                "click",

                () => {

                    alert(
                        "Wallet"
                    );

                }

            );

    }

};

/* =========================================================
   LAZY IMAGES
========================================================= */

export const LazyEngine = {

    observer: null,

    init() {

        this.observer =

            new IntersectionObserver(

                entries => {

                    entries.forEach(

                        entry => {

                            if (
                                !entry
                                    .isIntersecting
                            ) {
                                return;
                            }

                            const img =
                                entry.target;

                            const src =
                                img.dataset
                                    .src;

                            if (src) {

                                img.src =
                                    src;

                            }

                            this.observer
                                .unobserve(
                                    img
                                );

                        }

                    );

                }

            );

        document

            .querySelectorAll(
                "img[data-src]"
            )

            .forEach(

                img =>
                    this.observer
                        .observe(
                            img
                        )

            );

    }

};

/* =========================================================
   PERFORMANCE ENGINE
========================================================= */

export const PerformanceEngine = {

    raf: null,

    start() {

        const loop =
            () => {

                this.raf =
                    requestAnimationFrame(
                        loop
                    );

            };

        loop();

    },

    stop() {

        cancelAnimationFrame(
            this.raf
        );

    }

};

/* =========================================================
   CRASH RUNTIME
========================================================= */

export const CrashRuntime = {

    multiplier: 1,

    running: false,

    start() {

        this.running =
            true;

        const tick = () => {

            if (
                !this.running
            ) {
                return;
            }

            this.multiplier +=
                0.01;

            requestAnimationFrame(
                tick
            );

        };

        tick();

    },

    stop() {

        this.running =
            false;

    }

};

/* =========================================================
   MINES RUNTIME
========================================================= */

export const MinesRuntime = {

    createBoard(
        size = 25
    ) {

        return Array(size)

            .fill(0)

            .map(

                () =>

                    Math.random()
                        > 0.8

            );

    }

};

/* =========================================================
   PLINKO RUNTIME
========================================================= */

export const PlinkoRuntime = {

    drop() {

        return randInt(
            0,
            16
        );

    }

};

/* =========================================================
   WHEEL RUNTIME
========================================================= */

export const WheelRuntime = {

    spin() {

        return randInt(
            0,
            360
        );

    }

};

/* =========================================================
   FINAL BOOTSTRAP
========================================================= */

export const CasinoBootstrap = {

    start() {

        SocketEngine.connect();

        AudioEngine.init();

        FairEngine.generate();

        ChartsEngine.init();

        MobileEngine.init();

        LazyEngine.init();

        PerformanceEngine.start();

        TournamentUI.render();

        WinnersEngine.render();

        console.log(

            "[BLOXIO CASINO V2] READY"

        );

    }

};

document.addEventListener(

    "DOMContentLoaded",

    () => {

        CasinoBootstrap
            .start();

    }

);

/* =========================================================
   END OF CASINO V2 ENTERPRISE
========================================================= */
