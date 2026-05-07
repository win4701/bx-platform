/* =========================================================
   BXS ENTERPRISE MIGRATIONS
========================================================= */

/* =========================================================
   MIGRATIONS TABLE
========================================================= */

CREATE TABLE IF NOT EXISTS migrations (

    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(255) UNIQUE NOT NULL,

    executed_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   001 — USERS SECURITY
========================================================= */

ALTER TABLE users
ADD COLUMN IF NOT EXISTS vip_level INT DEFAULT 0;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS frozen BOOLEAN DEFAULT false;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS fraud_score NUMERIC(10,2) DEFAULT 0;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS country VARCHAR(10);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';

/* =========================================================
   002 — WALLET SECURITY
========================================================= */

ALTER TABLE wallet_balances
ADD COLUMN IF NOT EXISTS pending NUMERIC(36,18) DEFAULT 0;

ALTER TABLE wallet_balances
ADD COLUMN IF NOT EXISTS last_tx_at TIMESTAMP;

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS network VARCHAR(50);

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'hot';

/* =========================================================
   003 — WITHDRAW PROTECTION
========================================================= */

ALTER TABLE withdraw_requests
ADD COLUMN IF NOT EXISTS tx_hash TEXT;

ALTER TABLE withdraw_requests
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT false;

ALTER TABLE withdraw_requests
ADD COLUMN IF NOT EXISTS risk_score NUMERIC(10,2) DEFAULT 0;

ALTER TABLE withdraw_requests
ADD COLUMN IF NOT EXISTS processed_by BIGINT REFERENCES users(id);

ALTER TABLE withdraw_requests
ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

/* =========================================================
   004 — TRADING ENGINE
========================================================= */

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS leverage NUMERIC(10,2) DEFAULT 1;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS stop_price NUMERIC(36,18);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS take_profit NUMERIC(36,18);

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS reduce_only BOOLEAN DEFAULT false;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS post_only BOOLEAN DEFAULT false;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS time_in_force VARCHAR(20) DEFAULT 'GTC';

ALTER TABLE trades
ADD COLUMN IF NOT EXISTS maker_fee NUMERIC(36,18) DEFAULT 0;

ALTER TABLE trades
ADD COLUMN IF NOT EXISTS taker_fee NUMERIC(36,18) DEFAULT 0;

ALTER TABLE trades
ADD COLUMN IF NOT EXISTS liquidity VARCHAR(10);

/* =========================================================
   005 — MARKET ANALYTICS
========================================================= */

ALTER TABLE candles
ADD COLUMN IF NOT EXISTS trades_count BIGINT DEFAULT 0;

ALTER TABLE candles
ADD COLUMN IF NOT EXISTS quote_volume NUMERIC(36,18) DEFAULT 0;

/* =========================================================
   006 — CASINO SECURITY
========================================================= */

ALTER TABLE casino_sessions
ADD COLUMN IF NOT EXISTS ip_address TEXT;

ALTER TABLE casino_sessions
ADD COLUMN IF NOT EXISTS device_id TEXT;

ALTER TABLE casino_sessions
ADD COLUMN IF NOT EXISTS game_hash TEXT;

ALTER TABLE casino_sessions
ADD COLUMN IF NOT EXISTS fairness_verified BOOLEAN DEFAULT false;

/* =========================================================
   007 — PAYMENTS INFRASTRUCTURE
========================================================= */

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS confirmations INT DEFAULT 0;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS blockchain_tx TEXT;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS webhook_verified BOOLEAN DEFAULT false;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS network_fee NUMERIC(36,18) DEFAULT 0;

/* =========================================================
   008 — API SECURITY
========================================================= */

ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS label TEXT;

ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS ip_whitelist JSONB DEFAULT '[]'::jsonb;

ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;

ALTER TABLE api_keys
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

/* =========================================================
   009 — AUDIT SYSTEM
========================================================= */

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info';

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS request_id TEXT;

ALTER TABLE audit_logs
ADD COLUMN IF NOT EXISTS service VARCHAR(50);

/* =========================================================
   010 — REALTIME ENGINE
========================================================= */

CREATE TABLE IF NOT EXISTS websocket_sessions (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    socket_id TEXT,

    ip_address TEXT,

    connected_at TIMESTAMP DEFAULT NOW(),

    disconnected_at TIMESTAMP

);

/* =========================================================
   011 — MATCHING ENGINE
========================================================= */

CREATE TABLE IF NOT EXISTS matching_events (

    id BIGSERIAL PRIMARY KEY,

    pair VARCHAR(50),

    sequence BIGINT,

    event_type VARCHAR(50),

    payload JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   012 — LIQUIDATION ENGINE
========================================================= */

CREATE TABLE IF NOT EXISTS positions (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    pair VARCHAR(50),

    side VARCHAR(10),

    leverage NUMERIC(10,2),

    entry_price NUMERIC(36,18),

    mark_price NUMERIC(36,18),

    liquidation_price NUMERIC(36,18),

    margin NUMERIC(36,18),

    pnl NUMERIC(36,18) DEFAULT 0,

    status VARCHAR(20) DEFAULT 'open',

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   013 — TREASURY ENGINE
========================================================= */

CREATE TABLE IF NOT EXISTS treasury_wallets (

    id BIGSERIAL PRIMARY KEY,

    asset VARCHAR(20),

    address TEXT,

    balance NUMERIC(36,18) DEFAULT 0,

    wallet_type VARCHAR(20),

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   014 — SYSTEM QUEUES
========================================================= */

CREATE TABLE IF NOT EXISTS system_jobs (

    id BIGSERIAL PRIMARY KEY,

    queue VARCHAR(50),

    payload JSONB DEFAULT '{}'::jsonb,

    status VARCHAR(20) DEFAULT 'pending',

    retries INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),

    processed_at TIMESTAMP

);

/* =========================================================
   015 — NOTIFICATION SYSTEM
========================================================= */

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'system';

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS delivered BOOLEAN DEFAULT false;

/* =========================================================
   016 — RISK ENGINE
========================================================= */

CREATE TABLE IF NOT EXISTS fraud_events (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    risk_score NUMERIC(10,2),

    event_type VARCHAR(100),

    details JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   017 — CLUSTER ENGINE
========================================================= */

CREATE TABLE IF NOT EXISTS cluster_nodes (

    id BIGSERIAL PRIMARY KEY,

    node_name VARCHAR(100),

    node_type VARCHAR(50),

    status VARCHAR(20),

    heartbeat_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   018 — PERFORMANCE METRICS
========================================================= */

ALTER TABLE system_metrics
ADD COLUMN IF NOT EXISTS hostname TEXT;

ALTER TABLE system_metrics
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '{}'::jsonb;

/* =========================================================
   019 — BLOCKCHAIN INDEXER
========================================================= */

CREATE TABLE IF NOT EXISTS blockchain_events (

    id BIGSERIAL PRIMARY KEY,

    chain VARCHAR(50),

    block_number BIGINT,

    tx_hash TEXT,

    event_name VARCHAR(100),

    payload JSONB DEFAULT '{}'::jsonb,

    indexed_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   020 — FINAL VERSION
========================================================= */

INSERT INTO migrations(name)
VALUES('enterprise_upgrade_v1')
ON CONFLICT(name) DO NOTHING;
