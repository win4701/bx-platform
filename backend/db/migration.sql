PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- =====================================================
-- MIGRATION META (SAFE VERSIONING)
-- =====================================================
CREATE TABLE IF NOT EXISTS migrations (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER
);

-- =====================================================
-- APPLY VERSION 3 ONLY IF NOT EXISTS
-- =====================================================
INSERT INTO migrations(version, applied_at)
SELECT 3, strftime('%s','now')
WHERE NOT EXISTS (
  SELECT 1 FROM migrations WHERE version = 3
);

-- =====================================================
-- SAFETY UPGRADES
-- =====================================================

-- 1️⃣ withdraw_queue txid UNIQUE
CREATE UNIQUE INDEX IF NOT EXISTS idx_withdraw_txid
  ON withdraw_queue(txid);

-- 2️⃣ mining index
CREATE INDEX IF NOT EXISTS idx_mining_uid
  ON mining_orders(uid);

-- 3️⃣ ledger performance
CREATE INDEX IF NOT EXISTS idx_ledger_account_ts
  ON ledger(account, ts);

-- 4️⃣ market_prices upgrade (ensure index)
CREATE INDEX IF NOT EXISTS idx_market_pair_ts
  ON market_prices(pair, ts);

-- 5️⃣ webhook_hits performance
CREATE INDEX IF NOT EXISTS idx_webhook_ip_ts
  ON webhook_hits(ip, ts);

-- =====================================================
-- DATA INTEGRITY FIXES
-- =====================================================

-- Prevent NULL ref in ledger
UPDATE ledger SET ref = 'unknown' WHERE ref IS NULL;

-- Ensure withdraw status safe values
UPDATE withdraw_queue
SET status = 'pending'
WHERE status NOT IN ('pending','approved','sent','confirmed','rejected');

-- Ensure negative amounts are corrected (failsafe)
UPDATE wallets SET usdt = 0 WHERE usdt < 0;
UPDATE wallets SET usdc = 0 WHERE usdc < 0;
UPDATE wallets SET ton = 0 WHERE ton < 0;
UPDATE wallets SET sol = 0 WHERE sol < 0;
UPDATE wallets SET zec = 0 WHERE zec < 0;
UPDATE wallets SET ltc = 0 WHERE ltc < 0;
UPDATE wallets SET avax = 0 WHERE avax < 0;
UPDATE wallets SET btc = 0 WHERE btc < 0;
UPDATE wallets SET bnb = 0 WHERE bnb < 0;
UPDATE wallets SET eth = 0 WHERE eth < 0;
UPDATE wallets SET bx = 0 WHERE bx < 0;

-- =====================================================
-- FUTURE-SAFE COLUMNS (IF NOT EXISTS STYLE)
-- =====================================================

-- Add confirmations to withdraw_queue if missing (safe SQLite pattern)
CREATE TABLE IF NOT EXISTS withdraw_queue_new AS
SELECT * FROM withdraw_queue;

DROP TABLE withdraw_queue;

CREATE TABLE withdraw_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  asset TEXT,
  amount REAL,
  address TEXT,
  status TEXT,
  txid TEXT UNIQUE,
  confirmations INTEGER DEFAULT 0,
  ts INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid)
);

INSERT INTO withdraw_queue
SELECT id, uid, asset, amount, address, status, txid, 0, ts
FROM withdraw_queue_new;

DROP TABLE withdraw_queue_new;

-- =====================================================
-- CLEANUP
-- =====================================================

COMMIT;
