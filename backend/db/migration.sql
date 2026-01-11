PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- ======================================================
-- 1) USERS (إن لم يكن موجودًا)
-- ======================================================
CREATE TABLE IF NOT EXISTS users (
  uid INTEGER PRIMARY KEY,
  created_at INTEGER NOT NULL
);

-- ======================================================
-- 2) WALLETS (إضافة أعمدة إن كانت ناقصة)
-- ======================================================
CREATE TABLE IF NOT EXISTS wallets (
  uid INTEGER PRIMARY KEY,
  usdt REAL DEFAULT 0,
  ton  REAL DEFAULT 0,
  sol  REAL DEFAULT 0,
  btc  REAL DEFAULT 0,
  bx   REAL DEFAULT 0
);

-- إضافة أعمدة مفقودة (SQLite-safe عبر جدول مؤقت)
-- ملاحظة: SQLite لا يدعم IF NOT EXISTS للأعمدة مباشرة
-- نتحقق عمليًا عبر PRAGMA ثم نضيف عند الحاجة

-- usdt
ALTER TABLE wallets ADD COLUMN usdt REAL DEFAULT 0;
-- ton
ALTER TABLE wallets ADD COLUMN ton REAL DEFAULT 0;
-- sol
ALTER TABLE wallets ADD COLUMN sol REAL DEFAULT 0;
-- btc
ALTER TABLE wallets ADD COLUMN btc REAL DEFAULT 0;
-- bx
ALTER TABLE wallets ADD COLUMN bx REAL DEFAULT 0;

-- ======================================================
-- 3) PRICES
-- ======================================================
CREATE TABLE IF NOT EXISTS prices (
  asset TEXT PRIMARY KEY,
  price_usdt REAL NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ======================================================
-- 4) PRICE HISTORY
-- ======================================================
CREATE TABLE IF NOT EXISTS price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  asset TEXT NOT NULL,
  price_usdt REAL NOT NULL,
  ts INTEGER NOT NULL
);

-- ======================================================
-- 5) LEDGER (DOUBLE ENTRY)
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
-- 6) HISTORY (USER ACTIONS)
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
-- 7) GAME HISTORY
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
-- 8) AIRDROPS
-- ======================================================
CREATE TABLE IF NOT EXISTS airdrops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL,
  type TEXT NOT NULL,
  bx_amount REAL NOT NULL,
  reason TEXT,
  ts INTEGER NOT NULL
);

-- ======================================================
-- 9) ACTIVITY SCORES
-- ======================================================
CREATE TABLE IF NOT EXISTS activity_scores (
  uid INTEGER PRIMARY KEY,
  score REAL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- ======================================================
-- 10) REFERRALS
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
-- 11) DEVICE FINGERPRINTS (ANTI-SYBIL)
-- ======================================================
CREATE TABLE IF NOT EXISTS device_fingerprints (
  uid INTEGER NOT NULL,
  fp_hash TEXT NOT NULL,
  first_seen INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  PRIMARY KEY(uid, fp_hash)
);

-- ======================================================
-- 12) USED TRANSACTIONS (DEPOSIT DEDUP)
-- ======================================================
CREATE TABLE IF NOT EXISTS used_txs (
  txid TEXT PRIMARY KEY
);

-- ======================================================
-- 13) INDEXES (SAFE IF NOT EXISTS)
-- ======================================================
CREATE INDEX IF NOT EXISTS idx_wallet_uid
  ON wallets(uid);

CREATE INDEX IF NOT EXISTS idx_price_hist_asset_ts
  ON price_history(asset, ts);

CREATE INDEX IF NOT EXISTS idx_ledger_ref
  ON ledger(ref);

CREATE INDEX IF NOT EXISTS idx_history_uid_ts
  ON history(uid, ts);

CREATE INDEX IF NOT EXISTS idx_game_uid_ts
  ON game_history(uid, created_at);

CREATE INDEX IF NOT EXISTS idx_game_game
  ON game_history(game);

CREATE INDEX IF NOT EXISTS idx_airdrops_uid_ts
  ON airdrops(uid, ts);

CREATE INDEX IF NOT EXISTS idx_activity_score
  ON activity_scores(score);

CREATE INDEX IF NOT EXISTS idx_referrer
  ON referrals(referrer_uid);

COMMIT;
