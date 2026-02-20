PRAGMA foreign_keys = ON;

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  uid INTEGER PRIMARY KEY,
  telegram_id BIGINT UNIQUE,  -- تم إضافة هذه العمود سابقًا
  username TEXT,
  created_at INTEGER,
  telegram_code VARCHAR(10)  -- تم إضافة هذا العمود سابقًا
);

-- =====================================================
-- WALLETS
-- =====================================================
CREATE TABLE IF NOT EXISTS wallets (
  uid INTEGER PRIMARY KEY,
  usdt REAL DEFAULT 0,
  usdc REAL DEFAULT 0,
  ton  REAL DEFAULT 0,
  avax  REAL DEFAULT 0,
  ltc  REAL DEFAULT 0,
  sol  REAL DEFAULT 0,
  zec  REAL DEFAULT 0,
  btc  REAL DEFAULT 0,
  bnb  REAL DEFAULT 0,
  eth  REAL DEFAULT 0,
  bx   REAL DEFAULT 0,
  created_at INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid)
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
 ('usdt'), ('usdc'), ('ltc'), ('ton'), ('sol'), ('btc'), ('eth'), ('avax'), ('bnb'), ('zec'), ('bx');

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

CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger(account);
CREATE INDEX IF NOT EXISTS idx_ledger_ts ON ledger(ts);

-- =====================================================
-- USER HISTORY (UI)
-- =====================================================
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  action TEXT,
  asset TEXT,
  amount REAL,
  ref TEXT,
  meta TEXT,
  ts INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid)
);

CREATE INDEX IF NOT EXISTS idx_history_uid ON history(uid);
CREATE INDEX IF NOT EXISTS idx_history_ts ON history(ts);

-- =====================================================
-- INTERNAL TRANSFERS (BX)
-- =====================================================
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_uid INTEGER,
  to_uid INTEGER,
  amount REAL,
  ts INTEGER,
  FOREIGN KEY(from_uid) REFERENCES users(uid),
  FOREIGN KEY(to_uid) REFERENCES users(uid)
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
-- WITHDRAW QUEUE
-- =====================================================
CREATE TABLE IF NOT EXISTS withdraw_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  asset TEXT,
  amount REAL,
  address TEXT,
  status TEXT,      -- pending / approved / sent / confirmed / rejected
  txid TEXT,
  ts INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid)
);

CREATE INDEX IF NOT EXISTS idx_withdraw_uid ON withdraw_queue(uid);
CREATE INDEX IF NOT EXISTS idx_withdraw_status ON withdraw_queue(status);

-- =====================================================
-- GAME HISTORY (CASINO)
-- =====================================================
CREATE TABLE IF NOT EXISTS game_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  game TEXT,
  bet REAL,
  payout REAL,
  ts INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid)
);

-- =====================================================
-- KYC
-- =====================================================
CREATE TABLE IF NOT EXISTS kyc (
  uid INTEGER PRIMARY KEY,
  level INTEGER,
  status TEXT,
  updated_at INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid)
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
  ts INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid)
);

-- =====================================================
-- PRICE CACHE (pricing.py)
-- =====================================================
CREATE TABLE IF NOT EXISTS prices (
  asset TEXT PRIMARY KEY,
  price_usdt REAL,
  updated_at INTEGER
);

-- =====================================================
-- MARKET PRICES (CHARTS)
-- =====================================================
CREATE TABLE IF NOT EXISTS market_prices (
  pair TEXT,
  price REAL,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_market_pair_ts
ON market_prices(pair, ts);

-- =====================================================
-- WEBHOOK RATE-LIMIT
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_hits (
  ip TEXT,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_webhook_hits_ip_ts
ON webhook_hits(ip, ts);

-- =====================================================
-- WATCHER METRICS
-- =====================================================
CREATE TABLE IF NOT EXISTS watcher_metrics (
  key TEXT PRIMARY KEY,
  value INTEGER,
  ts INTEGER
);

-- =====================================================
-- TON JETTON CACHE
-- =====================================================
CREATE TABLE IF NOT EXISTS jettons (
  master TEXT PRIMARY KEY,
  symbol TEXT,
  decimals INTEGER,
  ts INTEGER
);

-- ===============================
-- AIRDROP
-- ===============================
CREATE TABLE IF NOT EXISTS airdrops (
  uid INTEGER PRIMARY KEY,
  claimed INTEGER DEFAULT 0,
  referrals INTEGER DEFAULT 0,
  reward REAL DEFAULT 0.33,
  ts INTEGER
);

-- ===============================
-- MINING
-- ===============================
CREATE TABLE IF NOT EXISTS mining_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  asset TEXT,
  plan TEXT,
  investment REAL,
  roi REAL,
  days INTEGER,
  started_at INTEGER,
  ends_at INTEGER,
  status TEXT,
  FOREIGN KEY(uid) REFERENCES users(uid)
);

-- ===============================
-- Télégramme 
-- ===============================
ALTER TABLE users ADD COLUMN telegram_id BIGINT UNIQUE;
ALTER TABLE users ADD COLUMN telegram_code VARCHAR(10);
--- =========================
-- Casino 
-- ===============================
CREATE TABLE IF NOT EXISTS game_stats (
  game TEXT,
  bets REAL DEFAULT 0,
  payouts REAL DEFAULT 0,
  rounds INTEGER DEFAULT 0
);

-- =====================================================
-- TOP-UP TRANSACTIONS (NEW TABLE)
-- =====================================================
CREATE TABLE IF NOT EXISTS topups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country TEXT,
  phone_number TEXT,
  amount REAL,
  status TEXT,      -- success, failure, pending
  ts INTEGER        -- Timestamp of the transaction
);

-- =====================================================
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    tx_hash VARCHAR(255) NOT NULL,
    amount NUMERIC NOT NULL,
    asset VARCHAR(20) NOT NULL,
    confirmations INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tx_hash)
);
