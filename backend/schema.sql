-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE IF NOT EXISTS users (

id SERIAL PRIMARY KEY,

telegram_id BIGINT UNIQUE,
username TEXT,

referral_code TEXT UNIQUE,
referred_by INTEGER REFERENCES users(id),

wallet_type TEXT,
wallet_address TEXT,

is_admin BOOLEAN DEFAULT FALSE,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE INDEX IF NOT EXISTS idx_users_telegram
ON users(telegram_id);


-- =====================================================
-- WALLETS
-- =====================================================

CREATE TABLE IF NOT EXISTS wallets (

id SERIAL PRIMARY KEY,

user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,

bx_balance NUMERIC(30,10) DEFAULT 0,
usdt_balance NUMERIC(30,10) DEFAULT 0,
ton_balance NUMERIC(30,10) DEFAULT 0,

btc_balance NUMERIC(30,10) DEFAULT 0,
eth_balance NUMERIC(30,10) DEFAULT 0,
bnb_balance NUMERIC(30,10) DEFAULT 0,
sol_balance NUMERIC(30,10) DEFAULT 0,
trx_balance NUMERIC(30,10) DEFAULT 0,
usdc_balance NUMERIC(30,10) DEFAULT 0,
ltc_balance NUMERIC(30,10) DEFAULT 0,

mining_balance NUMERIC(30,10) DEFAULT 0,
locked_balance NUMERIC(30,10) DEFAULT 0,

updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE INDEX IF NOT EXISTS idx_wallet_user
ON wallets(user_id);


-- =====================================================
-- WALLET TRANSACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS wallet_transactions (

id SERIAL PRIMARY KEY,

user_id INTEGER REFERENCES users(id),

asset TEXT,
amount NUMERIC(30,10),

type TEXT,
reference_id INTEGER,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user
ON wallet_transactions(user_id);


-- =====================================================
-- INTERNAL TRANSFERS
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
-- WITHDRAW REQUESTS
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

CREATE INDEX IF NOT EXISTS idx_withdraw_user
ON withdraw_requests(user_id);


-- =====================================================
-- CRYPTO DEPOSITS
-- =====================================================

CREATE TABLE IF NOT EXISTS crypto_deposits (

id SERIAL PRIMARY KEY,

user_id INTEGER REFERENCES users(id),

asset TEXT,
amount NUMERIC(30,10),

tx_hash TEXT UNIQUE,

confirmations INTEGER DEFAULT 0,
confirmed BOOLEAN DEFAULT FALSE,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);


-- =====================================================
-- BINANCE PAY
-- =====================================================

CREATE TABLE IF NOT EXISTS binance_deposits (

id SERIAL PRIMARY KEY,

user_id INTEGER REFERENCES users(id),

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

user_id INTEGER UNIQUE REFERENCES users(id),

address TEXT UNIQUE,

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


-- =====================================================
-- MARKET TRADES
-- =====================================================

CREATE TABLE IF NOT EXISTS market_trades (

id SERIAL PRIMARY KEY,

user_id INTEGER,

side TEXT,

price NUMERIC(30,10),
amount NUMERIC(30,10),

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE INDEX IF NOT EXISTS idx_market_trades_user
ON market_trades(user_id);


-- =====================================================
-- MARKET STATS
-- =====================================================

CREATE TABLE IF NOT EXISTS market_stats (

pair TEXT PRIMARY KEY,

price NUMERIC(30,10),

volume_24h NUMERIC(30,10),

trades_24h INTEGER,

updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);


-- =====================================================
-- MARKET BOT
-- =====================================================

CREATE TABLE IF NOT EXISTS market_bot_stats (

id SERIAL PRIMARY KEY,

trades INTEGER DEFAULT 0,
volume NUMERIC(30,10) DEFAULT 0,

updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);


-- =====================================================
-- CASINO SEEDS (PROVABLY FAIR)
-- =====================================================

CREATE TABLE IF NOT EXISTS casino_seeds (

id SERIAL PRIMARY KEY,

user_id INTEGER UNIQUE REFERENCES users(id),

server_seed TEXT,
server_seed_hash TEXT,

client_seed TEXT DEFAULT 'default',

nonce INTEGER DEFAULT 0,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);


-- =====================================================
-- CASINO SESSIONS
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

CREATE INDEX IF NOT EXISTS idx_casino_user
ON casino_sessions(user_id);


-- =====================================================
-- CASINO AUDIT (RNG)
-- =====================================================

CREATE TABLE IF NOT EXISTS casino_audit (

id SERIAL PRIMARY KEY,

user_id INTEGER REFERENCES users(id),

game TEXT,

server_seed TEXT,
client_seed TEXT,

nonce INTEGER,

result JSONB,

bet NUMERIC(30,10),
payout NUMERIC(30,10),

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE INDEX IF NOT EXISTS idx_casino_audit_user
ON casino_audit(user_id);


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

CREATE INDEX IF NOT EXISTS idx_mining_user
ON mining_sessions(user_id);


-- =====================================================
-- AIRDROP
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
-- REFERRAL
-- =====================================================

CREATE TABLE IF NOT EXISTS referral_rewards (

id SERIAL PRIMARY KEY,

referrer_id INTEGER REFERENCES users(id),

referred_id INTEGER REFERENCES users(id),

reward NUMERIC(30,10),

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
-- SYSTEM SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (

id SERIAL PRIMARY KEY,

key TEXT UNIQUE,

value TEXT,

updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);


-- =====================================================
-- API KEYS
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

user_id INTEGER REFERENCES users(id),

last_call TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);


-- =====================================================
-- SYSTEM METRICS
-- =====================================================

CREATE TABLE IF NOT EXISTS system_metrics (

id SERIAL PRIMARY KEY,

cpu_load NUMERIC,
memory_used NUMERIC,
requests INTEGER,

created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);
