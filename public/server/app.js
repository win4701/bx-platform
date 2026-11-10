
/* =========================================================
   BLOXIO ENTERPRISE SERVER 2026
   FILE: server/app.js

   Express + Socket.IO
   Secure Session Verification
   Wallet API Foundation
   Market / Casino / Mining / Airdrop
========================================================= */

"use strict";

require("dotenv").config();

const path = require("path");
const http = require("http");
const crypto = require("crypto");

const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");

const { Server } = require("socket.io");

/* =========================================================
   CONFIG
========================================================= */

const PORT = Number(process.env.PORT || 3000);

const CLIENT_ORIGIN =
    process.env.CLIENT_ORIGIN || "*";

const JWT_SECRET =
    process.env.JWT_SECRET || "";

const NODE_ENV =
    process.env.NODE_ENV || "development";

const IS_PRODUCTION =
    NODE_ENV === "production";

const FINANCIAL_API_ENABLED =
    process.env.FINANCIAL_API_ENABLED === "true";

const MAX_JSON_SIZE = "1mb";

/* =========================================================
   APP
========================================================= */

const app = express();

const server = http.createServer(app);

/* =========================================================
   SOCKET.IO
========================================================= */

const io = new Server(server, {
    cors: {
        origin: CLIENT_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true
    },

    transports: [
        "websocket",
        "polling"
    ],

    pingInterval: 25000,
    pingTimeout: 20000
});

/* =========================================================
   MIDDLEWARE
========================================================= */

app.disable("x-powered-by");

app.use(helmet({
    crossOriginEmbedderPolicy: false
}));

app.use(compression());

app.use(cors({
    origin: CLIENT_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"]
}));

app.use(express.json({
    limit: MAX_JSON_SIZE
}));

app.use(express.urlencoded({
    extended: true,
    limit: MAX_JSON_SIZE
}));

/* =========================================================
   REQUEST ID
========================================================= */

app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();

    res.setHeader(
        "X-Request-ID",
        req.requestId
    );

    next();
});

/* =========================================================
   STATIC FILES
========================================================= */

app.use(express.static(
    path.join(__dirname, "../public"),
    {
        index: false,
        maxAge: IS_PRODUCTION ? "1d" : 0
    }
));

/* =========================================================
   MEMORY STATE
========================================================= */

const STATE = {
    online: 0,

    users: new Map(),

    market: {
        pair: "BX/BTC",
        price: 0.00069241,
        change: 0,
        volume: 0,
        timestamp: Date.now()
    },

    casino: {
        online: 0,
        volume: 0,
        lastWin: 0
    },

    mining: {
        hashrate: 0,
        miners: 0
    },

    airdrop: {
        reward: 0,
        timestamp: Date.now()
    }
};

/*
 * IMPORTANT:
 * These maps are runtime-only.
 * They are NOT a production database.
 */

const WALLET_STORE = new Map();

/* =========================================================
   HELPERS
========================================================= */

function apiError(res, status, message) {
    return res.status(status).json({
        success: false,
        error: message
    });
}

function isValidAmount(value) {
    const amount = Number(value);

    return (
        Number.isFinite(amount) &&
        amount > 0 &&
        amount < Number.MAX_SAFE_INTEGER
    );
}

function getUserWallet(userId) {
    if (!WALLET_STORE.has(userId)) {
        WALLET_STORE.set(userId, {
            balances: {},
            prices: {},
            transactions: []
        });
    }

    return WALLET_STORE.get(userId);
}

function safeEqual(a, b) {
    const first = Buffer.from(String(a));
    const second = Buffer.from(String(b));

    if (first.length !== second.length) {
        return false;
    }

    return crypto.timingSafeEqual(first, second);
}

/* =========================================================
   JWT VERIFICATION
========================================================= */

function verifyJWT(token) {
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    const parts = String(token).split(".");

    if (parts.length !== 3) {
        throw new Error("Invalid token");
    }

    const [header, payload, signature] = parts;

    const data = `${header}.${payload}`;

    const expected = crypto
        .createHmac("sha256", JWT_SECRET)
        .update(data)
        .digest("base64url");

    if (!safeEqual(signature, expected)) {
        throw new Error("Invalid token signature");
    }

    const decodedHeader = JSON.parse(
        Buffer.from(header, "base64url").toString()
    );

    const decodedPayload = JSON.parse(
        Buffer.from(payload, "base64url").toString()
    );

    if (decodedHeader.alg !== "HS256") {
        throw new Error("Unsupported token algorithm");
    }

    if (
        !decodedPayload.sub ||
        typeof decodedPayload.sub !== "string"
    ) {
        throw new Error("Invalid token subject");
    }

    if (
        decodedPayload.exp &&
        Date.now() >= decodedPayload.exp * 1000
    ) {
        throw new Error("Token expired");
    }

    if (
        decodedPayload.nbf &&
        Date.now() < decodedPayload.nbf * 1000
    ) {
        throw new Error("Token not active");
    }

    return decodedPayload;
}

/* =========================================================
   AUTH MIDDLEWARE
========================================================= */

function requireAuth(req, res, next) {
    const authorization =
        req.headers.authorization || "";

    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        return apiError(
            res,
            401,
            "Authentication required"
        );
    }

    try {
        const payload = verifyJWT(match[1]);

        req.user = {
            id: payload.sub,
            email: payload.email || null
        };

        next();

    } catch (error) {
        return apiError(
            res,
            401,
            "Invalid or expired session"
        );
    }
}

/* =========================================================
   SOCKET AUTHENTICATION
========================================================= */

io.use((socket, next) => {
    const token =
        socket.handshake.auth?.token;

    if (!token) {
        socket.userId = null;
        return next();
    }

    try {
        const payload = verifyJWT(token);

        socket.userId = payload.sub;

        next();

    } catch (error) {
        next(new Error("Unauthorized"));
    }
});

/* =========================================================
   SOCKET CONNECTION
========================================================= */

io.on("connection", socket => {
    STATE.online++;

    STATE.users.set(socket.id, {
        id: socket.id,
        userId: socket.userId,
        connectedAt: Date.now()
    });

    socket.emit("connected", {
        success: true,
        socketId: socket.id,
        authenticated: Boolean(socket.userId),
        serverTime: Date.now()
    });

    socket.emit(
        "market:init",
        STATE.market
    );

    socket.emit(
        "casino:init",
        STATE.casino
    );

    socket.emit(
        "mining:init",
        STATE.mining
    );

    io.emit("system:online", {
        count: STATE.online
    });

    /* MARKET SUBSCRIPTION */

    socket.on("market:subscribe", pair => {
        if (typeof pair !== "string") return;

        const normalized = pair
            .trim()
            .toUpperCase();

        if (!/^[A-Z0-9]{2,20}\/[A-Z0-9]{2,20}$/.test(normalized)) {
            return;
        }

        socket.join(`market:${normalized}`);

        socket.emit("market:subscribed", {
            pair: normalized
        });
    });

    /* CASINO SUBSCRIPTION */

    socket.on("casino:subscribe", () => {
        socket.join("casino");
    });

    /* WALLET SUBSCRIPTION */

    socket.on("wallet:subscribe", () => {
        if (!socket.userId) {
            socket.emit("wallet:error", {
                error: "Authentication required"
            });

            return;
        }

        const room = `wallet:${socket.userId}`;

        socket.join(room);

        socket.emit("wallet:subscribed", {
            success: true
        });

        const wallet = getUserWallet(socket.userId);

        socket.emit("wallet:update", {
            balances: wallet.balances,
            prices: wallet.prices,
            transactions: wallet.transactions
        });
    });

    /* MINING SUBSCRIPTION */

    socket.on("mining:init", () => {
        socket.emit("mining:update", STATE.mining);
    });

    /* DISCONNECT */

    socket.on("disconnect", () => {
        STATE.online = Math.max(0, STATE.online - 1);

        STATE.users.delete(socket.id);

        io.emit("system:online", {
            count: STATE.online
        });
    });
});

/* =========================================================
   WALLET SOCKET EMIT
========================================================= */

function emitWalletUpdate(userId, payload) {
    if (!userId || !payload) return;

    io.to(`wallet:${userId}`).emit(
        "wallet:update",
        payload
    );
}

/* =========================================================
   HEALTH API
========================================================= */

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        name: "BLOXIO",
        status: "online",
        environment: NODE_ENV,
        online: STATE.online,
        timestamp: Date.now()
    });
});

/* =========================================================
   MARKET API
========================================================= */

app.get("/api/market", (req, res) => {
    res.json({
        success: true,
        market: STATE.market
    });
});

/* =========================================================
   CASINO API
========================================================= */

app.get("/api/casino", (req, res) => {
    res.json({
        success: true,
        casino: STATE.casino
    });
});

/* =========================================================
   MINING API
========================================================= */

app.get("/api/mining", (req, res) => {
    res.json({
        success: true,
        mining: STATE.mining
    });
});

/* =========================================================
   WALLET API
========================================================= */

app.get("/api/wallet", requireAuth, (req, res) => {
    const wallet = getUserWallet(req.user.id);

    res.json({
        success: true,
        balances: wallet.balances,
        prices: wallet.prices,
        transactions: wallet.transactions
    });
});

/* =========================================================
   FINANCIAL OPERATIONS GUARD
========================================================= */

function requireFinancialProvider(req, res, next) {
    if (!FINANCIAL_API_ENABLED) {
        return apiError(
            res,
            503,
            "Financial services are not configured"
        );
    }

    /*
     * Do not enable this flag until a real provider,
     * persistent database, transaction ledger,
     * and idempotency protection are implemented.
     */

    return apiError(
        res,
        503,
        "Financial provider integration is required"
    );
}

/* =========================================================
   DEPOSIT
========================================================= */

app.post(
    "/api/payments/create",
    requireAuth,
    requireFinancialProvider
);

/* =========================================================
   WITHDRAW
========================================================= */

app.post(
    "/api/payments/withdraw",
    requireAuth,
    requireFinancialProvider
);

/* =========================================================
   INTERNAL TRANSFER
========================================================= */

app.post(
    "/api/finance/transfer",
    requireAuth,
    requireFinancialProvider
);

/* =========================================================
   MARKET FEED
========================================================= */

function emitMarketFeed() {
    const delta = Number(
        (Math.random() * 2 - 1).toFixed(4)
    );

    STATE.market.price = Math.max(
        0.00000001,
        STATE.market.price + delta / 10000
    );

    STATE.market.change = delta;

    STATE.market.volume += Math.floor(
        Math.random() * 1000
    );

    STATE.market.timestamp = Date.now();

    io.emit("market:update", STATE.market);
}

const marketTimer = setInterval(
    emitMarketFeed,
    1000
);

/* =========================================================
   CASINO FEED
========================================================= */

function emitCasinoFeed() {
    const games = [
        "Crash",
        "Dice",
        "Limbo",
        "Mines",
        "Plinko"
    ];

    const payload = {
        user: `player${Math.floor(Math.random() * 9999)}`,
        game: games[
            Math.floor(Math.random() * games.length)
        ],
        bet: Number(
            (Math.random() * 500).toFixed(2)
        ),
        profit: Number(
            (Math.random() * 1500).toFixed(2)
        ),
        time: Date.now()
    };

    io.to("casino").emit(
        "casino:bet",
        payload
    );
}

const casinoTimer = setInterval(
    emitCasinoFeed,
    2500
);

/* =========================================================
   MINING FEED
========================================================= */

function emitMiningFeed() {
    STATE.mining.hashrate = Math.floor(
        Math.random() * 1000000
    );

    STATE.mining.miners = Math.floor(
        Math.random() * 5000
    );

    io.emit(
        "mining:update",
        STATE.mining
    );
}

const miningTimer = setInterval(
    emitMiningFeed,
    5000
);

/* =========================================================
   AIRDROP FEED
========================================================= */

function emitAirdropUpdate() {
    STATE.airdrop = {
        reward: Number(
            (Math.random() * 50).toFixed(2)
        ),
        timestamp: Date.now()
    };

    io.emit(
        "airdrop:update",
        STATE.airdrop
    );
}

const airdropTimer = setInterval(
    emitAirdropUpdate,
    15000
);

/* =========================================================
   API NOT FOUND
========================================================= */

app.use("/api", (req, res) => {
    apiError(
        res,
        404,
        "API endpoint not found"
    );
});

/* =========================================================
   FRONTEND ROUTING
========================================================= */

app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
        return next();
    }

    res.sendFile(
        path.join(
            __dirname,
            "../public/index.html"
        )
    );
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use((error, req, res, next) => {
    console.error(
        "[SERVER ERROR]",
        req.requestId,
        error
    );

    if (res.headersSent) {
        return next(error);
    }

    apiError(
        res,
        error.status || 500,
        IS_PRODUCTION
            ? "Internal server error"
            : error.message
    );
});

/* =========================================================
   SERVER START
========================================================= */

server.listen(PORT, () => {
    console.log("=================================");
    console.log("BLOXIO ENTERPRISE SERVER");
    console.log(`PORT: ${PORT}`);
    console.log(`ENV: ${NODE_ENV}`);
    console.log(`ONLINE: http://localhost:${PORT}`);
    console.log("EXPRESS READY");
    console.log("SOCKET.IO READY");
    console.log("MARKET FEED READY");
    console.log("CASINO FEED READY");
    console.log("MINING FEED READY");
    console.log("AIRDROP FEED READY");
    console.log("WALLET API READY");
    console.log("FINANCIAL OPERATIONS: GUARDED");
    console.log("=================================");
});

/* =========================================================
   GRACEFUL SHUTDOWN
========================================================= */

function shutdown(signal) {
    console.log(`[SERVER] ${signal} received`);

    clearInterval(marketTimer);
    clearInterval(casinoTimer);
    clearInterval(miningTimer);
    clearInterval(airdropTimer);

    io.close(() => {
        server.close(() => {
            process.exit(0);
        });
    });

    setTimeout(() => {
        process.exit(1);
    }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
    app,
    server,
    io,
    STATE,
    WALLET_STORE,
    emitWalletUpdate
};
