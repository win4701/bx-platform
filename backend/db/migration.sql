-- =====================================================
-- BX PLATFORM MIGRATION FILE
-- Safe upgrade without data loss
-- =====================================================

BEGIN;

-- =====================================================
-- USERS UPDATES
-- =====================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_code TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS referred_by INTEGER;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code
ON users(referral_code);

-- =====================================================
-- WALLET UPDATES
-- =====================================================

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS mining_balance NUMERIC(30,10) DEFAULT 0;

ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS locked_balance NUMERIC(30,10) DEFAULT 0;

-- =====================================================
-- TON SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS ton_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    address TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE ton_deposits
ADD COLUMN IF NOT EXISTS confirmed BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ton_hash
ON ton_deposits(tx_hash);

-- =====================================================
-- MARKET SYSTEM
-- =====================================================

ALTER TABLE market_orders
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';

CREATE INDEX IF NOT EXISTS idx_market_pair
ON market_orders(pair);

CREATE INDEX IF NOT EXISTS idx_market_status
ON market_orders(status);

CREATE INDEX IF NOT EXISTS idx_trades_pair
ON market_trades(pair);

-- =====================================================
-- STON SWAPS
-- =====================================================

CREATE TABLE IF NOT EXISTS ston_swaps (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    bx_in NUMERIC(30,10),
    ton_out NUMERIC(30,10),
    fee NUMERIC(30,10),
    tx_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MINING SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS mining_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    hash_rate NUMERIC(20,5),
    reward NUMERIC(30,10),
    status TEXT DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- =====================================================
-- AIRDROP SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS airdrops (
    id SERIAL PRIMARY KEY,
    title TEXT,
    reward NUMERIC(30,10),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS airdrop_claims (
    id SERIAL PRIMARY KEY,
    airdrop_id INTEGER REFERENCES airdrops(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP
);

-- =====================================================
-- REFERRAL REWARDS
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_rewards (
    id SERIAL PRIMARY KEY,
    referrer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    referred_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reward NUMERIC(30,10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CASINO
-- =====================================================

CREATE TABLE IF NOT EXISTS casino_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    game TEXT,
    bet NUMERIC(30,10),
    result TEXT,
    profit NUMERIC(30,10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INTERNAL SECURITY
-- =====================================================

CREATE TABLE IF NOT EXISTS internal_api_keys (
    id SERIAL PRIMARY KEY,
    name TEXT,
    api_key TEXT UNIQUE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- RATE LIMIT
-- =====================================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    last_call TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
