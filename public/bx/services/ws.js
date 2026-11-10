
/* =========================================================
   BLOXIO WS ENGINE V7
   Socket.IO Adapter
   Preserves window.WS public API
========================================================= */

"use strict";

(function () {

    const CONFIG = {
        URL: location.origin,
        OPTIONS: {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1500,
            reconnectionDelayMax: 30000,
            timeout: 20000
        },
        MAX_EVENTS: 1000
    };

    const listeners = new Map();
    const channels = new Set();

    let socket = null;
    let connected = false;
    let destroyed = false;

    const metrics = {
        connectedAt: 0,
        sent: 0,
        received: 0,
        reconnects: 0,
        failed: 0
    };

    /* =====================================================
       LOCAL EVENT BUS
    ===================================================== */

    function on(event, fn) {

        if (typeof fn !== "function") {
            return () => {};
        }

        if (!listeners.has(event)) {
            listeners.set(event, new Set());
        }

        listeners.get(event).add(fn);

        return () => {
            listeners.get(event)?.delete(fn);
        };
    }

    function emit(event, data) {

        listeners.get(event)?.forEach(fn => {
            try {
                fn(data);
            } catch (error) {
                console.error("[WS EVENT]", event, error);
            }
        });
    }

    /* =====================================================
       AUTH
    ===================================================== */

    function token() {
        try {
            return localStorage.getItem("token") || "";
        } catch {
            return "";
        }
    }

    /* =====================================================
       SOCKET EVENTS
    ===================================================== */

    function bind() {

        if (!socket) return;

        socket.on("connect", () => {

            connected = true;
            metrics.connectedAt = Date.now();
            metrics.reconnects++;

            emit("connected", {
                id: socket.id
            });

            resubscribe();

        });

        socket.on("disconnect", reason => {

            connected = false;

            emit("disconnected", {
                reason
            });

        });

        socket.on("connect_error", error => {

            metrics.failed++;

            emit("connect_error", error);

            console.warn("[SOCKET.IO] Connection error:", error.message);

        });

        socket.onAny((event, ...args) => {

            metrics.received++;

            const payload = args.length > 1
                ? args
                : args[0];

            emit(event, payload);

        });

    }

    /* =====================================================
       CONNECT
    ===================================================== */

    function connect() {

        if (destroyed) {
            destroyed = false;
        }

        if (typeof io !== "function") {

            metrics.failed++;

            console.error(
                "[SOCKET.IO] Client library is not loaded."
            );

            emit("error", {
                message: "Socket.IO client is missing"
            });

            return false;
        }

        if (socket) {

            if (!socket.connected) {
                socket.connect();
            }

            return true;
        }

        try {

            socket = io(CONFIG.URL, {
                ...CONFIG.OPTIONS,
                auth: {
                    token: token()
                }
            });

            bind();

            return true;

        } catch (error) {

            metrics.failed++;

            console.error("[SOCKET.IO] Initialization failed:", error);

            emit("error", error);

            return false;
        }
    }

    /* =====================================================
       SEND
       No automatic queue for financial operations.
    ===================================================== */

    function send(type, payload = {}) {

        if (!socket || !socket.connected) {
            return false;
        }

        if (typeof type !== "string" || !type) {
            return false;
        }

        try {

            socket.emit(type, payload);

            metrics.sent++;

            return true;

        } catch (error) {

            metrics.failed++;

            console.error("[SOCKET.IO] Send failed:", error);

            return false;
        }
    }

    /* =====================================================
       CHANNELS
    ===================================================== */

    function subscribe(channel) {

        if (!channel) return false;

        channels.add(channel);

        const events = {
            wallet: "wallet:subscribe",
            market: "market:subscribe",
            casino: "casino:subscribe",
            mining: "mining:init"
        };

        const event = events[channel];

        if (!event) {
            console.warn("[SOCKET.IO] Unknown channel:", channel);
            return false;
        }

        return send(event, {});
    }

    function unsubscribe(channel) {

        if (!channel) return;

        channels.delete(channel);

        const events = {
            wallet: "wallet:unsubscribe",
            market: "market:unsubscribe",
            casino: "casino:unsubscribe",
            mining: "mining:unsubscribe"
        };

        const event = events[channel];

        if (event) {
            send(event, {});
        }
    }

    function resubscribe() {

        channels.forEach(channel => {
            subscribe(channel);
        });

    }

    /* =====================================================
       DISCONNECT
    ===================================================== */

    function disconnect() {

        if (!socket) {
            connected = false;
            return;
        }

        socket.disconnect();

        connected = false;
    }

    /* =====================================================
       DESTROY
    ===================================================== */

    function destroy() {

        destroyed = true;

        if (socket) {

            socket.removeAllListeners();
            socket.disconnect();
            socket = null;

        }

        connected = false;

        listeners.clear();
        channels.clear();

    }

    /* =====================================================
       EXPORT
    ===================================================== */

    window.WS = {

        connect,
        disconnect,
        destroy,
        send,
        on,
        emit,
        subscribe,
        unsubscribe,
        metrics,

        get connected() {
            return Boolean(socket?.connected);
        },

        get channels() {
            return [...channels];
        }

    };

    /* =====================================================
       AUTO CONNECT
    ===================================================== */

    connect();

})();
