
/* =========================================================
   BLOXIO WEBSOCKET ENGINE V8
   public/bx/services/ws.js

   Native WebSocket Client
   Compatible with backend wsHub.js

   Protocol:
   { type: "auth", token: "..." }
   { type: "subscribe", channel: "market" }
   { type: "unsubscribe", channel: "market" }
   { type: "ping" }

   Preserves window.WS public API
========================================================= */

"use strict";

(function () {

    /* =====================================================
       CONFIG
    ===================================================== */

    const CONFIG = {
        PATH: "/ws",

        RECONNECT: true,
        RECONNECT_INITIAL: 1500,
        RECONNECT_MAX: 30000,
        RECONNECT_FACTOR: 1.8,
        MAX_RECONNECT_ATTEMPTS: Infinity,

        HEARTBEAT_INTERVAL: 25000,
        HEARTBEAT_TIMEOUT: 10000,

        CONNECT_TIMEOUT: 15000,

        MAX_MESSAGE_SIZE: 1024 * 1024,

        DEBUG: false
    };

    /* =====================================================
       STATE
    ===================================================== */

    let socket = null;

    let connected = false;
    let connecting = false;
    let authenticated = false;

    let manuallyDisconnected = false;
    let destroyed = false;

    let reconnectTimer = null;
    let heartbeatTimer = null;
    let heartbeatTimeout = null;
    let connectTimer = null;

    let reconnectAttempts = 0;
    let lastPong = 0;

    let connectionGeneration = 0;

    const listeners = new Map();
    const channels = new Set();

    const metrics = {
        connectedAt: 0,
        disconnectedAt: 0,

        sent: 0,
        received: 0,

        reconnects: 0,
        failed: 0,

        invalidMessages: 0,
        heartbeatTimeouts: 0,

        lastError: null,
        lastMessageAt: 0,
        lastPongAt: 0
    };

    /* =====================================================
       DEBUG
    ===================================================== */

    function log(...args) {
        if (CONFIG.DEBUG) {
            console.log("[BLOXIO WS]", ...args);
        }
    }

    function warn(...args) {
        console.warn("[BLOXIO WS]", ...args);
    }

    /* =====================================================
       URL
    ===================================================== */

    function getURL() {

        const protocol =
            location.protocol === "https:"
                ? "wss:"
                : "ws:";

        return protocol +
            "//" +
            location.host +
            CONFIG.PATH;

    }

    /* =====================================================
       TOKEN
    ===================================================== */

    function getToken() {

        try {

            if (typeof window.API?.token === "function") {
                const value = window.API.token();

                if (value) return value;
            }

            if (typeof window.API?.token === "string") {
                return window.API.token;
            }

            return (
                localStorage.getItem("accessToken") ||
                localStorage.getItem("token") ||
                ""
            );

        } catch {
            return "";
        }

    }

    /* =====================================================
       EVENT BUS
    ===================================================== */

    function on(event, callback) {

        if (
            typeof event !== "string" ||
            typeof callback !== "function"
        ) {
            return () => {};
        }

        if (!listeners.has(event)) {
            listeners.set(event, new Set());
        }

        listeners.get(event).add(callback);

        return () => off(event, callback);
    }

    function off(event, callback) {

        const group = listeners.get(event);

        if (!group) return;

        group.delete(callback);

        if (group.size === 0) {
            listeners.delete(event);
        }

    }

    function emit(event, payload = {}) {

        const group = listeners.get(event);

        if (!group) return;

        [...group].forEach(callback => {

            try {
                callback(payload);

            } catch (error) {

                console.error(
                    "[BLOXIO WS EVENT]",
                    event,
                    error
                );

            }

        });

    }

    /* =====================================================
       SEND RAW
    ===================================================== */

    function sendRaw(message) {

        if (
            !socket ||
            socket.readyState !== WebSocket.OPEN
        ) {
            return false;
        }

        try {

            socket.send(JSON.stringify(message));

            metrics.sent++;

            log("SEND", message);

            return true;

        } catch (error) {

            metrics.failed++;
            metrics.lastError = error.message;

            warn("Send failed", error);

            return false;
        }

    }

    /* =====================================================
       AUTH MESSAGE
    ===================================================== */

    function authenticate() {

        const accessToken = getToken();

        if (!accessToken) {

            authenticated = false;

            emit("guest", {
                connected: true
            });

            return true;
        }

        authenticated = false;

        return sendRaw({
            type: "auth",
            token: accessToken
        });

    }

    /* =====================================================
       CHANNEL PROTOCOL
    ===================================================== */

    function subscribe(channel) {

        if (
            typeof channel !== "string" ||
            !channel.trim()
        ) {
            return false;
        }

        channel = channel.trim();

        channels.add(channel);

        if (!connected) {
            log("Subscription queued:", channel);
            return true;
        }

        return sendRaw({
            type: "subscribe",
            channel
        });

    }

    function unsubscribe(channel) {

        if (!channel) return false;

        channel = String(channel).trim();

        channels.delete(channel);

        if (!connected) return true;

        return sendRaw({
            type: "unsubscribe",
            channel
        });

    }

    function resubscribe() {

        if (!connected) return;

        channels.forEach(channel => {

            sendRaw({
                type: "subscribe",
                channel
            });

        });

    }

    /* =====================================================
       HEARTBEAT
    ===================================================== */

    function stopHeartbeat() {

        clearInterval(heartbeatTimer);
        clearTimeout(heartbeatTimeout);

        heartbeatTimer = null;
        heartbeatTimeout = null;

    }

    function startHeartbeat() {

        stopHeartbeat();

        heartbeatTimer = setInterval(() => {

            if (!connected) return;

            if (
                lastPong > 0 &&
                Date.now() - lastPong >
                    CONFIG.HEARTBEAT_INTERVAL +
                    CONFIG.HEARTBEAT_TIMEOUT
            ) {

                metrics.heartbeatTimeouts++;

                warn("Heartbeat timeout");

                try {
                    socket?.close(
                        4000,
                        "Heartbeat timeout"
                    );
                } catch {}

                return;
            }

            const sent = sendRaw({
                type: "ping"
            });

            if (!sent) return;

            clearTimeout(heartbeatTimeout);

            heartbeatTimeout = setTimeout(() => {

                if (!connected) return;

                metrics.heartbeatTimeouts++;

                warn("Pong not received");

                try {
                    socket?.close(
                        4000,
                        "Pong timeout"
                    );
                } catch {}

            }, CONFIG.HEARTBEAT_TIMEOUT);

        }, CONFIG.HEARTBEAT_INTERVAL);

    }

    /* =====================================================
       MESSAGE NORMALIZATION
    ===================================================== */

    function parseMessage(raw) {

        if (typeof raw !== "string") {
            return null;
        }

        if (
            raw.length >
            CONFIG.MAX_MESSAGE_SIZE
        ) {
            metrics.invalidMessages++;

            warn("Message too large");

            return null;
        }

        try {

            const message = JSON.parse(raw);

            if (
                !message ||
                typeof message !== "object" ||
                Array.isArray(message)
            ) {
                throw new Error("Invalid message object");
            }

            return message;

        } catch (error) {

            metrics.invalidMessages++;

            warn("Invalid JSON message", error);

            return null;
        }

    }

    /* =====================================================
       SERVER MESSAGE
    ===================================================== */

    function handleMessage(event) {

        const message = parseMessage(event.data);

        if (!message) return;

        metrics.received++;
        metrics.lastMessageAt = Date.now();

        log("RECEIVE", message);

        const type = String(
            message.type || message.event || ""
        );

        const payload =
            message.data ??
            message.payload ??
            message;

        switch (type) {

            /* -----------------------------
               AUTH
            ----------------------------- */

            case "auth_success":

                authenticated = true;

                emit("authenticated", payload);
                emit("auth_success", payload);

                log("Authentication successful");

                break;

            case "auth_error":
            case "auth_failed":

                authenticated = false;

                emit("auth_error", payload);

                warn("WebSocket authentication failed");

                break;

            /* -----------------------------
               CONNECTION
            ----------------------------- */

            case "subscribed":

                emit("subscribed", payload);

                if (payload.channel) {
                    emit(
                        "subscribed:" + payload.channel,
                        payload
                    );
                }

                break;

            case "unsubscribed":

                emit("unsubscribed", payload);

                break;

            /* -----------------------------
               HEARTBEAT
            ----------------------------- */

            case "pong":

                lastPong = Date.now();

                metrics.lastPongAt = lastPong;

                clearTimeout(heartbeatTimeout);

                emit("pong", payload);

                break;

            case "ping":

                sendRaw({
                    type: "pong"
                });

                break;

            /* -----------------------------
               ERRORS
            ----------------------------- */

            case "error":

                emit("server_error", payload);

                warn("Server error", payload);

                break;

            default:

                dispatchApplicationEvent(
                    type,
                    payload,
                    message
                );

                break;
        }

    }

    /* =====================================================
       APPLICATION EVENTS
    ===================================================== */

    function dispatchApplicationEvent(
        type,
        payload,
        original
    ) {

        if (!type) return;

        emit(type, payload);

        /*
          Support both market naming styles.
          This allows existing market.js listeners
          to receive server messages.
        */

        const aliases = {
            "market.price": "market:price",
            "market.depth": "market:depth",
            "market.orderbook": "market:depth",
            "market.trade": "market:trade",
            "market.candle": "market:candle",
            "market.kline": "market:kline",
            "market.update": "market:update"
        };

        const alias = aliases[type];

        if (alias && alias !== type) {
            emit(alias, payload);
        }

        /*
          Normalize event objects that carry the
          event name in a separate field.
        */

        if (
            original.event &&
            original.event !== type
        ) {
            emit(original.event, payload);
        }

        /*
          Forward market data to chart.js.
        */

        if (
            type === "market:candle" ||
            type === "market.candle" ||
            type === "market:kline" ||
            type === "market.kline"
        ) {

            const detail = {
                ...payload,
                pair: payload.pair || "BX_USDT"
            };

            window.dispatchEvent(
                new CustomEvent("bloxio:market-candle", {
                    detail
                })
            );

        }

    }

    /* =====================================================
       CONNECTION EVENTS
    ===================================================== */

    function handleOpen() {

        clearTimeout(connectTimer);

        connected = true;
        connecting = false;

        reconnectAttempts = 0;

        metrics.connectedAt = Date.now();

        metrics.reconnects++;

        lastPong = Date.now();

        log("Connected");

        emit("connected", {
            url: getURL()
        });

        authenticate();

        resubscribe();

        startHeartbeat();

    }

    function handleClose(event) {

        clearTimeout(connectTimer);

        stopHeartbeat();

        connected = false;
        connecting = false;
        authenticated = false;

        metrics.disconnectedAt = Date.now();

        log(
            "Disconnected",
            event.code,
            event.reason
        );

        emit("disconnected", {
            code: event.code,
            reason: event.reason,
            clean: event.wasClean
        });

        if (
            !manuallyDisconnected &&
            !destroyed &&
            CONFIG.RECONNECT
        ) {
            scheduleReconnect();
        }

    }

    function handleError(event) {

        metrics.failed++;

        metrics.lastError =
            "WebSocket connection error";

        emit("connect_error", event);

        warn("Connection error", event);

    }

    /* =====================================================
       RECONNECT
    ===================================================== */

    function scheduleReconnect() {

        if (
            manuallyDisconnected ||
            destroyed ||
            reconnectTimer
        ) {
            return;
        }

        if (
            reconnectAttempts >=
            CONFIG.MAX_RECONNECT_ATTEMPTS
        ) {

            emit("reconnect_failed", {
                attempts: reconnectAttempts
            });

            return;
        }

        reconnectAttempts++;

        const delay = Math.min(
            CONFIG.RECONNECT_INITIAL *
            Math.pow(
                CONFIG.RECONNECT_FACTOR,
                reconnectAttempts - 1
            ),

            CONFIG.RECONNECT_MAX
        );

        const jitter = Math.random() * 500;

        const wait = delay + jitter;

        emit("reconnecting", {
            attempt: reconnectAttempts,
            delay: wait
        });

        log(
            "Reconnecting in",
            Math.round(wait),
            "ms"
        );

        reconnectTimer = setTimeout(() => {

            reconnectTimer = null;

            connect();

        }, wait);

    }

    function clearReconnect() {

        clearTimeout(reconnectTimer);

        reconnectTimer = null;

    }

    /* =====================================================
       CONNECT
    ===================================================== */

    function connect() {

        if (destroyed) {
            destroyed = false;
        }

        manuallyDisconnected = false;

        if (
            socket &&
            (
                socket.readyState === WebSocket.OPEN ||
                socket.readyState === WebSocket.CONNECTING
            )
        ) {
            return true;
        }

        clearReconnect();

        if (!("WebSocket" in window)) {

            metrics.failed++;

            emit("error", {
                message: "WebSocket is not supported"
            });

            return false;
        }

        try {

            connectionGeneration++;

            const generation = connectionGeneration;

            connecting = true;

            socket = new WebSocket(getURL());

            socket.addEventListener("open", () => {

                if (generation !== connectionGeneration) {
                    return;
                }

                handleOpen();

            });

            socket.addEventListener("message", event => {

                if (generation !== connectionGeneration) {
                    return;
                }

                handleMessage(event);

            });

            socket.addEventListener("error", event => {

                if (generation !== connectionGeneration) {
                    return;
                }

                handleError(event);

            });

            socket.addEventListener("close", event => {

                if (generation !== connectionGeneration) {
                    return;
                }

                handleClose(event);

            });

            connectTimer = setTimeout(() => {

                if (
                    connecting &&
                    socket?.readyState === WebSocket.CONNECTING
                ) {

                    warn("Connection timeout");

                    try {
                        socket.close(
                            4001,
                            "Connection timeout"
                        );
                    } catch {}

                }

            }, CONFIG.CONNECT_TIMEOUT);

            return true;

        } catch (error) {

            connecting = false;

            metrics.failed++;

            metrics.lastError = error.message;

            emit("error", error);

            warn("Connection initialization failed", error);

            scheduleReconnect();

            return false;
        }

    }

    /* =====================================================
       SEND
       No queue for financial operations.
    ===================================================== */

    function send(type, payload = {}) {

        if (
            typeof type !== "string" ||
            !type.trim()
        ) {
            return false;
        }

        return sendRaw({
            type,
            ...(
                payload &&
                typeof payload === "object"
                    ? payload
                    : { data: payload }
            )
        });

    }

    /* =====================================================
       AUTH REFRESH
    ===================================================== */

    function refreshAuth() {

        if (!connected) {
            return false;
        }

        const accessToken = getToken();

        if (!accessToken) {

            authenticated = false;

            sendRaw({
                type: "auth",
                token: ""
            });

            return true;
        }

        authenticated = false;

        return sendRaw({
            type: "auth",
            token: accessToken
        });

    }

    /* =====================================================
       DISCONNECT
    ===================================================== */

    function disconnect() {

        manuallyDisconnected = true;

        clearReconnect();
        stopHeartbeat();

        if (!socket) {
            connected = false;
            connecting = false;
            authenticated = false;
            return;
        }

        const current = socket;

        socket = null;

        connected = false;
        connecting = false;
        authenticated = false;

        connectionGeneration++;

        try {
            current.close(
                1000,
                "Client disconnect"
            );
        } catch {}

        emit("disconnected", {
            reason: "client_disconnect"
        });

    }

    /* =====================================================
       DESTROY
    ===================================================== */

    function destroy() {

        destroyed = true;

        disconnect();

        listeners.clear();
        channels.clear();

        log("Destroyed");

    }

    /* =====================================================
       RESTART
    ===================================================== */

    function restart() {

        disconnect();

        destroyed = false;
        manuallyDisconnected = false;

        reconnectAttempts = 0;

        return connect();

    }

    /* =====================================================
       STATUS
    ===================================================== */

    function getState() {

        return {
            connected,
            connecting,
            authenticated,

            manuallyDisconnected,
            destroyed,

            reconnectAttempts,

            channels: [...channels],

            readyState: socket
                ? socket.readyState
                : WebSocket.CLOSED,

            url: getURL(),

            metrics: {
                ...metrics
            }
        };

    }

    /* =====================================================
       EXPORT
    ===================================================== */

    window.WS = {

        connect,
        disconnect,
        destroy,
        restart,

        send,

        on,
        off,
        emit,

        subscribe,
        unsubscribe,

        refreshAuth,

        getState,

        metrics,

        get connected() {
            return connected;
        },

        get connecting() {
            return connecting;
        },

        get authenticated() {
            return authenticated;
        },

        get channels() {
            return [...channels];
        }

    };

    /* =====================================================
       AUTH EVENTS
    ===================================================== */

    window.addEventListener(
        "auth:login",
        () => {
            refreshAuth();
        }
    );

    window.addEventListener(
        "auth:logout",
        () => {

            authenticated = false;

            /*
              Keep the public market connection alive.
              Private channel access must be enforced
              by the backend.
            */

            if (connected) {
                refreshAuth();
            }

        }
    );

    /* =====================================================
       AUTO CONNECT
    ===================================================== */

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            connect,
            { once: true }
        );

    } else {

        connect();

    }

    console.log("[BLOXIO WS] V8 initialized");

})();
