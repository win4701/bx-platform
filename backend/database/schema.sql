/* =========================================================
   BXS ENTERPRISE DATABASE SCHEMA
========================================================= */

/* =========================================================
   EXTENSIONS
========================================================= */

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

/* =========================================================
   USERS
========================================================= */

CREATE TABLE IF NOT EXISTS users (

    id BIGSERIAL PRIMARY KEY,

    uuid UUID DEFAULT uuid_generate_v4(),

    username VARCHAR(50) UNIQUE NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    role VARCHAR(20) DEFAULT 'user',

    level INT DEFAULT 1,

    xp BIGINT DEFAULT 0,

    referral_code VARCHAR(50) UNIQUE,

    referred_by BIGINT REFERENCES users(id),

    twofa_enabled BOOLEAN DEFAULT false,

    email_verified BOOLEAN DEFAULT false,

    banned BOOLEAN DEFAULT false,

    kyc_status VARCHAR(20) DEFAULT 'none',

    last_login_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   USER SESSIONS
========================================================= */

CREATE TABLE IF NOT EXISTS user_sessions (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,

    token_hash TEXT NOT NULL,

    ip_address TEXT,

    user_agent TEXT,

    device_id TEXT,

    expires_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   WALLETS
========================================================= */

CREATE TABLE IF NOT EXISTS wallets (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,

    asset VARCHAR(20) NOT NULL,

    deposit_address TEXT,

    memo TEXT,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   WALLET BALANCES
========================================================= */

CREATE TABLE IF NOT EXISTS wallet_balances (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,

    asset VARCHAR(20) NOT NULL,

    balance NUMERIC(36,18) DEFAULT 0,

    locked NUMERIC(36,18) DEFAULT 0,

    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, asset)

);

/* =========================================================
   WALLET TRANSACTIONS
========================================================= */

CREATE TABLE IF NOT EXISTS wallet_transactions (

    id BIGSERIAL PRIMARY KEY,

    tx_id UUID DEFAULT uuid_generate_v4(),

    user_id BIGINT REFERENCES users(id),

    asset VARCHAR(20) NOT NULL,

    amount NUMERIC(36,18) NOT NULL,

    type VARCHAR(30) NOT NULL,

    reason TEXT,

    meta JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   PAYMENTS
========================================================= */

CREATE TABLE IF NOT EXISTS payments (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    provider VARCHAR(50),

    external_id TEXT,

    type VARCHAR(20),

    asset VARCHAR(20),

    amount NUMERIC(36,18),

    status VARCHAR(20) DEFAULT 'pending',

    meta JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   WITHDRAW REQUESTS
========================================================= */

CREATE TABLE IF NOT EXISTS withdraw_requests (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    asset VARCHAR(20),

    amount NUMERIC(36,18),

    address TEXT,

    status VARCHAR(20) DEFAULT 'pending',

    approved_by BIGINT REFERENCES users(id),

    created_at TIMESTAMP DEFAULT NOW(),

    processed_at TIMESTAMP

);

/* =========================================================
   MARKET ORDERS
========================================================= */

CREATE TABLE IF NOT EXISTS orders (

    id BIGSERIAL PRIMARY KEY,

    order_uuid UUID DEFAULT uuid_generate_v4(),

    user_id BIGINT REFERENCES users(id),

    pair VARCHAR(50) NOT NULL,

    side VARCHAR(10) NOT NULL,

    type VARCHAR(20) DEFAULT 'limit',

    price NUMERIC(36,18),

    amount NUMERIC(36,18),

    remaining NUMERIC(36,18),

    status VARCHAR(20) DEFAULT 'open',

    is_bot BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW(),

    updated_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   TRADES
========================================================= */

CREATE TABLE IF NOT EXISTS trades (

    id BIGSERIAL PRIMARY KEY,

    trade_uuid UUID DEFAULT uuid_generate_v4(),

    pair VARCHAR(50) NOT NULL,

    maker_id BIGINT REFERENCES users(id),

    taker_id BIGINT REFERENCES users(id),

    side VARCHAR(10),

    price NUMERIC(36,18),

    amount NUMERIC(36,18),

    fee NUMERIC(36,18) DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   CANDLES
========================================================= */

CREATE TABLE IF NOT EXISTS candles (

    id BIGSERIAL PRIMARY KEY,

    pair VARCHAR(50),

    timeframe VARCHAR(20),

    open NUMERIC(36,18),

    high NUMERIC(36,18),

    low NUMERIC(36,18),

    close NUMERIC(36,18),

    volume NUMERIC(36,18),

    ts BIGINT,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   CASINO SESSIONS
========================================================= */

CREATE TABLE IF NOT EXISTS casino_sessions (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    game VARCHAR(50),

    bet NUMERIC(36,18),

    payout NUMERIC(36,18),

    multiplier NUMERIC(36,18),

    result JSONB DEFAULT '{}'::jsonb,

    server_seed TEXT,

    client_seed TEXT,

    nonce BIGINT,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   MINING
========================================================= */

CREATE TABLE IF NOT EXISTS mining_sessions (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    power NUMERIC(36,18),

    reward NUMERIC(36,18),

    started_at TIMESTAMP,

    ended_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   AIRDROP
========================================================= */

CREATE TABLE IF NOT EXISTS airdrops (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    amount NUMERIC(36,18),

    campaign VARCHAR(100),

    claimed BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   REFERRALS
========================================================= */

CREATE TABLE IF NOT EXISTS referrals (

    id BIGSERIAL PRIMARY KEY,

    referrer_id BIGINT REFERENCES users(id),

    referred_id BIGINT REFERENCES users(id),

    reward NUMERIC(36,18) DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   AUDIT LOGS
========================================================= */

CREATE TABLE IF NOT EXISTS audit_logs (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    action VARCHAR(100),

    ip_address TEXT,

    user_agent TEXT,

    meta JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   SYSTEM SETTINGS
========================================================= */

CREATE TABLE IF NOT EXISTS system_settings (

    id BIGSERIAL PRIMARY KEY,

    key TEXT UNIQUE,

    value JSONB,

    updated_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   NOTIFICATIONS
========================================================= */

CREATE TABLE IF NOT EXISTS notifications (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    type VARCHAR(50),

    title TEXT,

    body TEXT,

    read BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   API KEYS
========================================================= */

CREATE TABLE IF NOT EXISTS api_keys (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    api_key TEXT UNIQUE,

    api_secret TEXT,

    permissions JSONB DEFAULT '[]'::jsonb,

    last_used_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   LIQUIDATIONS
========================================================= */

CREATE TABLE IF NOT EXISTS liquidations (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    position_id BIGINT,

    pair VARCHAR(50),

    amount NUMERIC(36,18),

    price NUMERIC(36,18),

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   PNL HISTORY
========================================================= */

CREATE TABLE IF NOT EXISTS pnl_history (

    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT REFERENCES users(id),

    pair VARCHAR(50),

    pnl NUMERIC(36,18),

    created_at TIMESTAMP DEFAULT NOW()

);

/* =========================================================
   SYSTEM METRICS
========================================================= */

CREATE TABLE IF NOT EXISTS system_metrics (

    id BIGSERIAL PRIMARY KEY,

    metric VARCHAR(100),

    value NUMERIC(36,18),

    meta JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT NOW()

);
