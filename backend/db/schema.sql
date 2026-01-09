PRAGMA foreign_keys = ON;

-- ==============================
-- USERS (Telegram-based)
-- ==============================
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tg_id INTEGER UNIQUE NOT NULL,
  username TEXT,
  created_at INTEGER
);

-- ==============================
-- WALLETS
-- ==============================
CREATE TABLE IF NOT EXISTS wallets (
  user_id INTEGER PRIMARY KEY,
  bx REAL DEFAULT 0,
  usdt REAL DEFAULT 0,
  ton REAL DEFAULT 0,
  bnb REAL DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ==============================
-- PAYMENTS (Deposits)
-- ==============================
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  provider TEXT,               -- binance | redotpay | ton
  asset TEXT,                  -- usdt | ton | bnb
  amount REAL,
  status TEXT,                 -- pending | confirmed | failed
  tx_hash TEXT UNIQUE,
  created_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ==============================
-- WITHDRAWALS
-- ==============================
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  asset TEXT,                  -- usdt | ton | bnb
  amount REAL,
  address TEXT,
  status TEXT,                 -- pending | completed | rejected
  proof_value TEXT,            -- txid / admin note
  created_at INTEGER,
  processed_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ==============================
-- TON AUTO DEPOSITS
-- ==============================
CREATE TABLE IF NOT EXISTS ton_deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_hash TEXT UNIQUE,
  user_id INTEGER,
  amount REAL,
  ts INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ==============================
-- CASINO ROUNDS
-- ==============================
CREATE TABLE IF NOT EXISTS casino_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  game TEXT,
  bet REAL,
  win INTEGER,                 -- 0 | 1
  payout REAL,
  ts INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ==============================
-- MINING
-- ==============================
CREATE TABLE IF NOT EXISTS mining_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  power REAL,
  started_at INTEGER,
  ended_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ==============================
-- AIRDROP
-- ==============================
CREATE TABLE IF NOT EXISTS airdrop_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  reward REAL
);

CREATE TABLE IF NOT EXISTS airdrop_claims (
  user_id INTEGER,
  task_id INTEGER,
  claimed_at INTEGER,
  PRIMARY KEY(user_id, task_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(task_id) REFERENCES airdrop_tasks(id)
);

-- ==============================
-- SUBSCRIPTIONS (VIP / WHALE)
-- ==============================
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id INTEGER PRIMARY KEY,
  tier TEXT CHECK(tier IN ('free','silver','gold','platinum')) DEFAULT 'free',
  activated_at INTEGER,
  expires_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ==============================
-- AUDIT LOGS (CRITICAL)
-- ==============================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT,
  user_id INTEGER,
  meta TEXT,
  ts INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

-- ==============================
-- INDEXES (Performance)
-- ==============================
CREATE INDEX IF NOT EXISTS idx_users_tg_id ON users(tg_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
