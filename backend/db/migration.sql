PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- =====================================================
-- MIGRATION META (VERSIONING)
-- =====================================================
CREATE TABLE IF NOT EXISTS migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER
);

INSERT OR IGNORE INTO migrations(version, applied_at)
VALUES (2, strftime('%s','now'));

-- =====================================================
-- USERS (EXTEND SAFELY)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  uid INTEGER PRIMARY KEY,
  telegram_id BIGINT UNIQUE,
  username TEXT,
  created_at INTEGER
);

-- =====================================================
-- WALLETS (FULL – SAFE)
-- =====================================================
CREATE TABLE IF NOT EXISTS wallets (
  uid INTEGER PRIMARY KEY,
  usdt REAL DEFAULT 0,
  ton  REAL DEFAULT 0,
  sol  REAL DEFAULT 0,
  btc  REAL DEFAULT 0,
  bnb  REAL DEFAULT 0,
  bx   REAL DEFAULT 0,
  created_at INTEGER
);

-- =====================================================
-- HOT / COLD VAULTS
-- =====================================================
CREATE TABLE IF NOT EXISTS wallet_vaults (
  asset TEXT PRIMARY KEY,
  hot_balance REAL DEFAULT 0,
  cold_balance REAL DEFAULT 0,
  last_reconcile INTEGER
);

-- Seed vaults (safe)
INSERT OR IGNORE INTO wallet_vaults(asset) VALUES
 ('usdt'), ('ton'), ('sol'), ('btc'), ('bnb'), ('bx');

-- =====================================================
-- LEDGER (DOUBLE ENTRY)
-- =====================================================
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT,
  account TEXT,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  ts INTEGER
);

-- =====================================================
-- HISTORY (UI)
-- =====================================================
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  action TEXT,
  asset TEXT,
  amount REAL,
  ref TEXT,
  meta TEXT,
  ts INTEGER
);

-- =====================================================
-- INTERNAL TRANSFERS (BX)
-- =====================================================
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_uid INTEGER,
  to_uid INTEGER,
  amount REAL,
  ts INTEGER
);

-- =====================================================
-- USED TXs (REPLAY PROTECTION)
-- =====================================================
CREATE TABLE IF NOT EXISTS used_txs (
  txid TEXT PRIMARY KEY,
  asset TEXT,
  ts INTEGER
);

-- =====================================================
-- PENDING DEPOSITS
-- =====================================================
CREATE TABLE IF NOT EXISTS pending_deposits (
  txid TEXT PRIMARY KEY,
  uid INTEGER,
  asset TEXT,
  amount REAL,
  reason TEXT,
  ts INTEGER
);

-- =====================================================
-- WITHDRAW QUEUE (NEW FLOW)
-- =====================================================
CREATE TABLE IF NOT EXISTS withdraw_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  asset TEXT,
  amount REAL,
  address TEXT,
  status TEXT,
  txid TEXT,
  ts INTEGER
);

-- =====================================================
-- KYC
-- =====================================================
CREATE TABLE IF NOT EXISTS kyc (
  uid INTEGER PRIMARY KEY,
  level INTEGER,
  status TEXT,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS kyc_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  full_name TEXT,
  country TEXT,
  document_type TEXT,
  document_number TEXT,
  document_path TEXT,
  status TEXT,
  ts INTEGER
);

-- =====================================================
-- PRICES (pricing.py)
-- =====================================================
CREATE TABLE IF NOT EXISTS prices (
  asset TEXT PRIMARY KEY,
  price_usdt REAL,
  updated_at INTEGER
);

-- =====================================================
-- MARKET PRICES (CHART)
-- =====================================================
CREATE TABLE IF NOT EXISTS market_prices (
  pair TEXT,
  price REAL,
  ts INTEGER
);

-- =====================================================
-- WEBHOOK RATE-LIMIT
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_hits (
  ip TEXT,
  ts INTEGER
);

-- =====================================================
-- INDEXES (SAFE)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_history_uid_ts
  ON history(uid, ts);

CREATE INDEX IF NOT EXISTS idx_ledger_ref
  ON ledger(ref);

CREATE INDEX IF NOT EXISTS idx_withdraw_uid
  ON withdraw_queue(uid);

CREATE INDEX IF NOT EXISTS idx_withdraw_status
  ON withdraw_queue(status);

CREATE INDEX IF NOT EXISTS idx_market_pair_ts
  ON market_prices(pair, ts);

CREATE INDEX IF NOT EXISTS idx_webhook_ip_ts
  ON webhook_hits(ip, ts);

COMMIT;
PRAGMA foreign_keys = ON;
