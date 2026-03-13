-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE,
    username TEXT,
    referral_code TEXT UNIQUE,
    referred_by INTEGER REFERENCES users(id),
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id);

-- =====================================================
-- WALLET
-- =====================================================

CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    bx_balance NUMERIC(30,10) DEFAULT 0,
    usdt_balance NUMERIC(30,10) DEFAULT 0,
    ton_balance NUMERIC(30,10) DEFAULT 0,

    mining_balance NUMERIC(30,10) DEFAULT 0,
    locked_balance NUMERIC(30,10) DEFAULT 0,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- WALLET TRANSACTIONS (NEW)
-- =====================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    asset TEXT,
    amount NUMERIC(30,10),

    type TEXT,
    reference_id INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user
ON wallet_transactions(user_id);

-- =====================================================
-- WITHDRAW REQUESTS (NEW)
-- =====================================================

CREATE TABLE IF NOT EXISTS withdraw_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),

    asset TEXT,
    amount NUMERIC(30,10),
    address TEXT,

    status TEXT DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INTERNAL TRANSFERS (NEW)
-- =====================================================

CREATE TABLE IF NOT EXISTS internal_transfers (
    id SERIAL PRIMARY KEY,
    from_user INTEGER REFERENCES users(id),
    to_user INTEGER REFERENCES users(id),

    asset TEXT,
    amount NUMERIC(30,10),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- BINANCE PAY
-- =====================================================

CREATE TABLE IF NOT EXISTS binance_deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,

    amount NUMERIC(30,10),
    status TEXT DEFAULT 'pending',

    transaction_id TEXT UNIQUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- TON SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS ton_addresses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    address TEXT UNIQUE NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ton_deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),

    amount NUMERIC(30,10),
    tx_hash TEXT UNIQUE,

    confirmed BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ton_hash
ON ton_deposits(tx_hash);

-- =====================================================
-- MARKET (Orderbook)
-- =====================================================

CREATE TABLE IF NOT EXISTS market_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),

    pair TEXT NOT NULL,
    side TEXT CHECK (side IN ('buy','sell')),

    price NUMERIC(30,10),
    amount NUMERIC(30,10),

    status TEXT DEFAULT 'open',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_market_pair
ON market_orders(pair);

CREATE INDEX IF NOT EXISTS idx_market_status
ON market_orders(status);

-- =====================================================
-- MARKET TRADES
-- =====================================================

CREATE TABLE IF NOT EXISTS market_trades (
    id SERIAL PRIMARY KEY,

    pair TEXT NOT NULL,

    buy_order_id INTEGER REFERENCES market_orders(id),
    sell_order_id INTEGER REFERENCES market_orders(id),

    price NUMERIC(30,10),
    amount NUMERIC(30,10),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trades_pair
ON market_trades(pair);

-- =====================================================
-- MARKET LIQUIDITY (NEW)
-- =====================================================

CREATE TABLE IF NOT EXISTS market_liquidity (
    id SERIAL PRIMARY KEY,

    pair TEXT,
    side TEXT,

    price NUMERIC(30,10),
    amount NUMERIC(30,10),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- STON.FI SWAPS
-- =====================================================

CREATE TABLE IF NOT EXISTS ston_swaps (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),

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
    user_id INTEGER REFERENCES users(id),

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

    airdrop_id INTEGER REFERENCES airdrops(id),
    user_id INTEGER REFERENCES users(id),

    claimed BOOLEAN DEFAULT FALSE,
    claimed_at TIMESTAMP
);

-- =====================================================
-- REFERRAL SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_rewards (
    id SERIAL PRIMARY KEY,

    referrer_id INTEGER REFERENCES users(id),
    referred_id INTEGER REFERENCES users(id),

    reward NUMERIC(30,10),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CASINO SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS casino_sessions (
    id SERIAL PRIMARY KEY,

    user_id INTEGER REFERENCES users(id),

    game TEXT,
    bet NUMERIC(30,10),

    result TEXT,
    profit NUMERIC(30,10),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ADMIN LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_logs (
    id SERIAL PRIMARY KEY,

    admin_id INTEGER REFERENCES users(id),
    action TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SYSTEM SETTINGS (NEW)
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,

    key TEXT UNIQUE,
    value TEXT,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INTERNAL API SECURITY
-- =====================================================

CREATE TABLE IF NOT EXISTS internal_api_keys (
    id SERIAL PRIMARY KEY,

    name TEXT,
    api_key TEXT UNIQUE,

    active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- RATE LIMIT SYSTEM
-- =====================================================

CREATE TABLE IF NOT EXISTS api_rate_limits (
    id SERIAL PRIMARY KEY,

    user_id INTEGER REFERENCES users(id),
    last_call TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
