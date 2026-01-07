PRAGMA foreign_keys = ON;

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id TEXT UNIQUE,
  created_at INTEGER
);

-- WALLETS
CREATE TABLE IF NOT EXISTS wallets (
  user_id INTEGER PRIMARY KEY,
  bx REAL DEFAULT 0,
  usdt REAL DEFAULT 0,
  ton REAL DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id INTEGER PRIMARY KEY,
  tier TEXT CHECK(tier IN ('silver','gold')) DEFAULT 'silver',
  activated_at INTEGER
);

-- MINING
CREATE TABLE IF NOT EXISTS mining_state (
  user_id INTEGER PRIMARY KEY,
  last_claim INTEGER
);

-- MARKET
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

-- CASINO
CREATE TABLE IF NOT EXISTS casino_rounds(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uid INTEGER,
    game TEXT,
    bet REAL,
    win INTEGER,
    ts INTEGER
);
  
-- DEPOSITS
CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  provider TEXT,      -- binance | redotpay | ton
  asset TEXT,         -- usdt | ton
  amount REAL,
  txid TEXT,
  status TEXT,        -- confirmed
  ts INTEGER
);

-- WITHDRAW REQUESTS
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  provider TEXT,      -- binance | redotpay | ton
  asset TEXT,         -- usdt | ton
  amount REAL,
  address TEXT,
  status TEXT,        -- pending | approved | rejected
  ts INTEGER
);

 -- Payment Proof
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  user_id INTEGER NOT NULL,

  provider TEXT NOT NULL,
  -- ton | binance_pay | redotpay

  asset TEXT NOT NULL,
  -- ton | usdt

  amount REAL NOT NULL,

  proof_type TEXT NOT NULL,
  -- txid | order_id | manual

  proof_value TEXT NOT NULL,
  -- tx hash OR Binance orderId OR admin note

  status TEXT NOT NULL,
  -- pending | confirmed | rejected

  verified_by TEXT,
  -- system | api | admin

  created_at INTEGER NOT NULL,
  confirmed_at INTEGER
);

-- AIRDROP (STATIC TASKS)
CREATE TABLE IF NOT EXISTS airdrop_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT,      -- telegram | twitter | discord | binance | coinmarketcap
  reward_bx REAL
);

-- AIRDROP CLAIMS
CREATE TABLE IF NOT EXISTS airdrop_claims (
  user_id INTEGER,
  task_id INTEGER,
  ts INTEGER,
  PRIMARY KEY(user_id, task_id)
);
