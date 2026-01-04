-- ======================================================
-- BX PLATFORM - DATABASE SCHEMA (SINGLE SOURCE OF TRUTH)
-- ======================================================

PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- =====================
-- USERS
-- =====================
CREATE TABLE IF NOT EXISTS users (
  uid INTEGER PRIMARY KEY,
  bx REAL DEFAULT 0,
  usdt REAL DEFAULT 0,
  ton REAL DEFAULT 0,
  mine_rate REAL DEFAULT 0.001,
  last_tick REAL
);

-- =====================
-- BUYS (USDT -> BX)
-- =====================
CREATE TABLE IF NOT EXISTS buys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  usdt REAL,
  bx REAL,
  price REAL,
  ts REAL
);

-- =====================
-- SELLS (BX -> USDT)
-- =====================
CREATE TABLE IF NOT EXISTS sells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  bx REAL,
  usdt REAL,
  price REAL,
  fee REAL,
  method TEXT,
  ts REAL
);

-- =====================
-- WITHDRAWALS (USDT / TON)
-- =====================
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  amount REAL,
  method TEXT,      -- binance | redotpay | ton
  target TEXT,      -- ID or wallet
  status TEXT,      -- pending | approved | sent | rejected
  ts REAL
);

-- =====================
-- DEPOSITS (Webhook)
-- =====================
CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  txid TEXT UNIQUE,
  amount REAL,
  source TEXT,      -- bep20 | ton | binance | redotpay
  status TEXT,
  ts REAL
);

-- =====================
-- DAILY LIMITS
-- =====================
CREATE TABLE IF NOT EXISTS daily_limits (
  uid INTEGER PRIMARY KEY,
  sell_bx REAL,
  withdraw_usdt REAL,
  day INTEGER
);

-- =====================
-- USER FLAGS (ANTI-ABUSE)
-- =====================
CREATE TABLE IF NOT EXISTS user_flags (
  uid INTEGER PRIMARY KEY,
  level TEXT,       -- normal | watch | restricted
  reason TEXT,
  ts REAL
);

-- =====================
-- LOGS / AUDIT
-- =====================
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  action TEXT,
  data TEXT,
  ts REAL
);

-- =====================
-- TON WALLETS (TON CONNECT)
-- =====================
CREATE TABLE IF NOT EXISTS ton_wallets (
  uid INTEGER PRIMARY KEY,
  address TEXT,
  ts REAL
);

-- =====================
-- TON <-> BX SWAPS (FIXED PRICE / HISTORY)
-- =====================
CREATE TABLE IF NOT EXISTS ton_swaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  direction TEXT,   -- ton_to_bx | bx_to_ton
  ton REAL,
  bx REAL,
  price REAL,
  fee REAL,
  ts REAL
);

-- =====================
-- AMM POOL (TON / BX)
-- =====================
CREATE TABLE IF NOT EXISTS amm_pool (
  id INTEGER PRIMARY KEY,
  ton REAL,
  bx REAL
);

-- Initialize AMM pool (once)
INSERT OR IGNORE INTO amm_pool (id, ton, bx)
VALUES (1, 1000, 50000);

-- =====================
-- INDEXES (PERFORMANCE)
-- =====================
CREATE INDEX IF NOT EXISTS idx_buys_uid ON buys(uid);
CREATE INDEX IF NOT EXISTS idx_sells_uid ON sells(uid);
CREATE INDEX IF NOT EXISTS idx_withdrawals_uid ON withdrawals(uid);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_deposits_txid ON deposits(txid);
CREATE INDEX IF NOT EXISTS idx_logs_uid ON logs(uid);

COMMIT;
