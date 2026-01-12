PRAGMA foreign_keys = OFF;
BEGIN TRANSACTION;

-- ======================================================
-- USERS
-- ======================================================
CREATE TABLE IF NOT EXISTS users (
  uid INTEGER PRIMARY KEY,
  created_at INTEGER NOT NULL
);

-- ======================================================
-- WALLETS (ADD MISSING COLUMNS SAFELY)
-- ======================================================
CREATE TABLE IF NOT EXISTS wallets (
  uid INTEGER PRIMARY KEY,
  usdt REAL DEFAULT 0,
  ton  REAL DEFAULT 0,
  sol  REAL DEFAULT 0,
  btc  REAL DEFAULT 0,
  bx   REAL DEFAULT 0
);

-- ضمان وجود الأعمدة (SQLite-safe pattern)
ALTER TABLE wallets ADD COLUMN usdt REAL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN ton  REAL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN sol  REAL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN btc  REAL DEFAULT 0;
ALTER TABLE wallets ADD COLUMN bx   REAL DEFAULT 0;

-- ======================================================
-- PRICES
-- ======================================================
CREATE TABLE IF NOT EXISTS prices (
  asset TEXT PRIMARY KEY,
  price_usdt REAL NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset TEXT NOT NULL,
  price_usdt REAL NOT NULL,
  ts INTEGER NOT NULL
);

-- ======================================================
-- LEDGER (DOUBLE ENTRY)
-- ======================================================
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL,
  account TEXT NOT NULL,
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  ts INTEGER NOT NULL
);

-- ======================================================
-- HISTORY
-- ======================================================
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL,
  action TEXT NOT NULL,
  asset TEXT,
  amount REAL,
  ref TEXT,
  ts INTEGER NOT NULL
);

-- ======================================================
-- GAME HISTORY
-- ======================================================
CREATE TABLE IF NOT EXISTS game_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL,
  game TEXT NOT NULL,
  bet REAL NOT NULL,
  payout REAL NOT NULL,
  win INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- ======================================================
-- AIRDROP ENGINE
-- ======================================================
CREATE TABLE IF NOT EXISTS airdrops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL,
  type TEXT NOT NULL,
  bx_amount REAL NOT NULL,
  reason TEXT,
  ts INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_scores (
  uid INTEGER PRIMARY KEY,
  score REAL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- ======================================================
-- REFERRALS
-- ======================================================
CREATE TABLE IF NOT EXISTS referrals (
  uid INTEGER PRIMARY KEY,
  referrer_uid INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS referral_stats (
  uid INTEGER PRIMARY KEY,
  total_referrals INTEGER DEFAULT 0,
  active_referrals INTEGER DEFAULT 0,
  total_value REAL DEFAULT 0
);

-- ======================================================
-- BINANCE ID (AUTO)
-- ======================================================
CREATE TABLE IF NOT EXISTS binance_deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL,
  amount REAL NOT NULL,
  binance_txid TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed',
  created_at INTEGER NOT NULL,
  confirmed_at INTEGER
);

-- ======================================================
-- PAYEER (AUDIT)
-- ======================================================
CREATE TABLE IF NOT EXISTS payeer_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL,
  order_id TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- ======================================================
-- DEDUP TRANSACTIONS
-- ======================================================
CREATE TABLE IF NOT EXISTS used_txs (
  txid TEXT PRIMARY KEY
);

-- ======================================================
-- DEVICE FINGERPRINTS (ANTI-SYBIL)
-- ======================================================
CREATE TABLE IF NOT EXISTS device_fingerprints (
  uid INTEGER NOT NULL,
  fp_hash TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  PRIMARY KEY (uid, fp_hash)
);

-- ======================================================
-- INDEXES (SAFE)
-- ======================================================
CREATE INDEX IF NOT EXISTS idx_wallet_uid
  ON wallets(uid);

CREATE INDEX IF NOT EXISTS idx_history_uid_ts
  ON history(uid, ts);

CREATE INDEX IF NOT EXISTS idx_game_uid_ts
  ON game_history(uid, created_at);

CREATE INDEX IF NOT EXISTS idx_ledger_ref
  ON ledger(ref);

CREATE INDEX IF NOT EXISTS idx_price_hist_asset_ts
  ON price_history(asset, ts);

CREATE INDEX IF NOT EXISTS idx_airdrops_uid_ts
  ON airdrops(uid, ts);

CREATE INDEX IF NOT EXISTS idx_binance_uid
  ON binance_deposits(uid);

CREATE INDEX IF NOT EXISTS idx_payeer_uid
  ON payeer_transactions(uid);

COMMIT;
PRAGMA foreign_keys = ON;
