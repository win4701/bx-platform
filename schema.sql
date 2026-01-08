PRAGMA foreign_keys = ON;

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id TEXT UNIQUE,
  created_at INTEGER
);

-- =====================================================
-- WALLETS (Ledger balances – عاديين)
-- =====================================================
CREATE TABLE IF NOT EXISTS wallets (
  user_id INTEGER PRIMARY KEY,
  bx REAL DEFAULT 0,
  usdt REAL DEFAULT 0,
  ton REAL DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- =====================================================
-- SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id INTEGER PRIMARY KEY,
  tier TEXT CHECK(tier IN ('silver','gold')) DEFAULT 'silver',
  activated_at INTEGER
);

-- =====================================================
-- MINING
-- =====================================================
CREATE TABLE IF NOT EXISTS mining_state (
  user_id INTEGER PRIMARY KEY,
  last_claim INTEGER
);

-- =====================================================
-- MARKET / TRADES
-- =====================================================
CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  side TEXT,
  amount_bx REAL,
  against TEXT,
  price REAL,
  fee REAL,
  burn REAL,
  ts INTEGER
);

-- =====================================================
-- CASINO
-- =====================================================
CREATE TABLE IF NOT EXISTS casino_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  game TEXT,
  bet REAL,
  win INTEGER,
  ts INTEGER
);

-- =====================================================
-- PAYMENTS (Unified deposit proof system)
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,

  provider TEXT,        -- ton | binance_pay | redotpay
  asset TEXT,           -- ton | usdt
  amount REAL,

  proof_type TEXT,      -- txid | order_id | manual
  proof_value TEXT,

  status TEXT,          -- pending | confirmed | rejected
  verified_by TEXT,     -- system | api | admin

  created_at INTEGER,
  confirmed_at INTEGER,

  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- =====================================================
-- WITHDRAWALS (Unified, hybrid-safe)
-- =====================================================
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,

  provider TEXT,        -- ton | binance | redotpay
  asset TEXT,           -- ton | usdt
  amount REAL,
  address TEXT,

  status TEXT,          -- pending | approved | completed | rejected
  proof_value TEXT,     -- txid | ref | manual note

  created_at INTEGER,
  processed_at INTEGER,

  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- =====================================================
-- AIRDROP
-- =====================================================
CREATE TABLE IF NOT EXISTS airdrop_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT,
  reward_bx REAL
);

CREATE TABLE IF NOT EXISTS airdrop_claims (
  user_id INTEGER,
  task_id INTEGER,
  ts INTEGER,
  PRIMARY KEY(user_id, task_id)
);

-- =====================================================
-- VIP / WHALE SYSTEM
-- =====================================================

-- Whale master account
CREATE TABLE IF NOT EXISTS whale_accounts (
  user_id INTEGER PRIMARY KEY,

  tier TEXT,                 -- vip | whale | institutional
  account_manager TEXT,

  total_deposited REAL,
  total_withdrawn REAL DEFAULT 0,

  locked_balance REAL,       -- Escrow
  play_balance REAL,         -- Credit for play
  withdrawable_balance REAL, -- Released only

  status TEXT,               -- active | review | frozen

  created_at INTEGER,
  updated_at INTEGER,

  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Whale profits (pending → released)
CREATE TABLE IF NOT EXISTS whale_profits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  amount REAL,

  status TEXT,               -- pending | released | rejected

  created_at INTEGER,
  released_at INTEGER,

  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- Whale withdrawals (always manual / scheduled)
CREATE TABLE IF NOT EXISTS whale_withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,

  asset TEXT,                -- usdt
  amount REAL,

  method TEXT,               -- binance | redotpay | otc
  status TEXT,               -- requested | approved | sent | completed

  proof_value TEXT,          -- txid | ref
  scheduled_at INTEGER,
  completed_at INTEGER,

  FOREIGN KEY(user_id) REFERENCES users(id)
);
-- =====================================================
-- BNB DEPOSITS (BEP20 – On-chain)
-- =====================================================
CREATE TABLE IF NOT EXISTS bnb_deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  tx_hash TEXT UNIQUE,
  amount REAL,
  status TEXT,        -- confirmed
  ts INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- =====================================================
-- BNB WITHDRAWALS (BEP20 – On-chain)
-- =====================================================
CREATE TABLE IF NOT EXISTS bnb_withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  amount REAL,
  address TEXT,
  tx_hash TEXT,
  status TEXT,        -- pending | sent | failed
  ts INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- =====================================================
-- BNB WITHDRAW LIMITS (Monthly)
-- =====================================================
CREATE TABLE IF NOT EXISTS bnb_withdraw_limits (
  user_id INTEGER,
  month TEXT,
  withdrawn REAL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

-- =====================================================
-- AUDIT LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT,
  meta TEXT,
  ts INTEGER
);
