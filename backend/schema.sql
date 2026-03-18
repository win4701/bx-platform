-- =====================================================
-- USERS
-- =====================================================

CREATE TABLE users (
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

CREATE INDEX idx_users_telegram ON users(telegram_id);

-- =====================================================
-- WALLET BALANCES
-- =====================================================

CREATE TABLE wallet_balances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  asset TEXT,

  balance NUMERIC(30,10) DEFAULT 0,
  locked NUMERIC(30,10) DEFAULT 0,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, asset)
);

CREATE INDEX idx_wallet_user_asset
ON wallet_balances(user_id, asset);

-- =====================================================
-- WALLET TRANSACTIONS
-- =====================================================

CREATE TABLE wallet_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),

  asset TEXT,
  amount NUMERIC(30,10),

  type TEXT,
  reason TEXT,

  txid TEXT,
  reference_id INTEGER,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallet_tx_user_time
ON wallet_transactions(user_id, created_at DESC);

-- =====================================================
-- DEPOSITS
-- =====================================================

CREATE TABLE deposits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),

  asset TEXT,
  amount NUMERIC(30,10),

  tx_hash TEXT UNIQUE,

  confirmations INTEGER DEFAULT 0,
  confirmed BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deposit_user
ON deposits(user_id);

-- =====================================================
-- WITHDRAWALS
-- =====================================================

CREATE TABLE withdrawals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),

  asset TEXT,
  amount NUMERIC(30,10),

  address TEXT,

  status TEXT DEFAULT 'pending',

  tx_hash TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdraw_user
ON withdrawals(user_id);

-- =====================================================
-- ORDERS
-- =====================================================

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),

  pair TEXT,
  side TEXT CHECK (side IN ('buy','sell')),

  price NUMERIC(30,10),
  amount NUMERIC(30,10),

  status TEXT DEFAULT 'open',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_book
ON orders(pair, side, price DESC);

CREATE INDEX idx_orders_user
ON orders(user_id);

-- =====================================================
-- TRADES
-- =====================================================

CREATE TABLE trades (
  id SERIAL PRIMARY KEY,

  pair TEXT,

  price NUMERIC(30,10),
  amount NUMERIC(30,10),

  buy_user INTEGER,
  sell_user INTEGER,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trades_pair_time
ON trades(pair, created_at DESC);

-- =====================================================
-- CANDLES
-- =====================================================

CREATE TABLE candles (
  id SERIAL PRIMARY KEY,

  pair TEXT,
  minute INTEGER,

  open NUMERIC(30,10),
  high NUMERIC(30,10),
  low NUMERIC(30,10),
  close NUMERIC(30,10),

  volume NUMERIC(30,10),

  UNIQUE(pair, minute)
);

CREATE INDEX idx_candle_pair_time
ON candles(pair, minute DESC);

-- =====================================================
-- CASINO SEEDS
-- =====================================================

CREATE TABLE casino_seeds (
  id SERIAL PRIMARY KEY,

  user_id INTEGER UNIQUE REFERENCES users(id),

  server_seed TEXT,
  server_seed_hash TEXT,

  client_seed TEXT,

  nonce INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- CASINO SESSIONS
-- =====================================================

CREATE TABLE casino_sessions (
  id SERIAL PRIMARY KEY,

  user_id INTEGER REFERENCES users(id),

  game TEXT,

  bet NUMERIC(30,10),

  result TEXT,

  profit NUMERIC(30,10),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_casino_user_time
ON casino_sessions(user_id, created_at DESC);

-- =====================================================
-- CASINO AUDIT
-- =====================================================

CREATE TABLE casino_audit (
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

CREATE INDEX idx_casino_audit_user
ON casino_audit(user_id);

-- =====================================================
-- MINING
-- =====================================================

CREATE TABLE mining_sessions (
  id SERIAL PRIMARY KEY,

  user_id INTEGER REFERENCES users(id),

  hash_rate NUMERIC(20,5),

  total_earned NUMERIC(30,10) DEFAULT 0,

  status TEXT DEFAULT 'active',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_reward TIMESTAMP
);

CREATE INDEX idx_mining_user
ON mining_sessions(user_id);

-- =====================================================
-- AIRDROP
-- =====================================================

CREATE TABLE airdrops (
  id SERIAL PRIMARY KEY,

  title TEXT,

  reward NUMERIC(30,10),

  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE airdrop_claims (
  id SERIAL PRIMARY KEY,

  airdrop_id INTEGER REFERENCES airdrops(id),
  user_id INTEGER REFERENCES users(id),

  claimed BOOLEAN DEFAULT FALSE,

  claimed_at TIMESTAMP,

  UNIQUE(airdrop_id, user_id)
);

-- =====================================================
-- REFERRALS
-- =====================================================

CREATE TABLE referral_rewards (
  id SERIAL PRIMARY KEY,

  referrer_id INTEGER REFERENCES users(id),
  referred_id INTEGER REFERENCES users(id),

  reward NUMERIC(30,10),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- SYSTEM SETTINGS
-- =====================================================

CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,

  key TEXT UNIQUE,
  value TEXT,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
