PRAGMA foreign_keys = ON;

-- =====================================================
-- USERS
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  uid INTEGER PRIMARY KEY,
  telegram_id INTEGER UNIQUE,
  username TEXT,
  created_at INTEGER,
  telegram_code TEXT
);

-- =====================================================
-- WALLETS (SAFE BALANCE)
-- =====================================================
CREATE TABLE IF NOT EXISTS wallets (
  uid INTEGER PRIMARY KEY,
  usdt REAL DEFAULT 0 CHECK(usdt >= 0),
  usdc REAL DEFAULT 0 CHECK(usdc >= 0),
  ton  REAL DEFAULT 0 CHECK(ton >= 0),
  avax REAL DEFAULT 0 CHECK(avax >= 0),
  ltc  REAL DEFAULT 0 CHECK(ltc >= 0),
  sol  REAL DEFAULT 0 CHECK(sol >= 0),
  zec  REAL DEFAULT 0 CHECK(zec >= 0),
  btc  REAL DEFAULT 0 CHECK(btc >= 0),
  bnb  REAL DEFAULT 0 CHECK(bnb >= 0),
  eth  REAL DEFAULT 0 CHECK(eth >= 0),
  bx   REAL DEFAULT 0 CHECK(bx >= 0),
  created_at INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- =====================================================
-- HOT / COLD VAULTS
-- =====================================================
CREATE TABLE IF NOT EXISTS wallet_vaults (
  asset TEXT PRIMARY KEY,
  hot_balance REAL DEFAULT 0 CHECK(hot_balance >= 0),
  cold_balance REAL DEFAULT 0 CHECK(cold_balance >= 0),
  last_reconcile INTEGER
);

INSERT OR IGNORE INTO wallet_vaults(asset) VALUES
 ('usdt'), ('usdc'), ('ltc'), ('ton'), ('sol'),
 ('btc'), ('eth'), ('avax'), ('bnb'), ('zec'), ('bx');

-- =====================================================
-- LEDGER (DOUBLE ENTRY SAFE)
-- =====================================================
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT NOT NULL,
  account TEXT NOT NULL,
  debit REAL DEFAULT 0 CHECK(debit >= 0),
  credit REAL DEFAULT 0 CHECK(credit >= 0),
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger(account);
CREATE INDEX IF NOT EXISTS idx_ledger_ts ON ledger(ts);
CREATE INDEX IF NOT EXISTS idx_ledger_ref ON ledger(ref);

-- =====================================================
-- USER HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  action TEXT,
  asset TEXT,
  amount REAL CHECK(amount >= 0),
  ref TEXT,
  meta TEXT,
  ts INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_history_uid ON history(uid);
CREATE INDEX IF NOT EXISTS idx_history_ts ON history(ts);

-- =====================================================
-- INTERNAL TRANSFERS
-- =====================================================
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_uid INTEGER,
  to_uid INTEGER,
  amount REAL CHECK(amount >= 0),
  ts INTEGER,
  FOREIGN KEY(from_uid) REFERENCES users(uid) ON DELETE CASCADE,
  FOREIGN KEY(to_uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- =====================================================
-- USED TXs (REPLAY SAFE)
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
  amount REAL CHECK(amount >= 0),
  reason TEXT,
  ts INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- =====================================================
-- WITHDRAW QUEUE
-- =====================================================
CREATE TABLE IF NOT EXISTS withdraw_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  asset TEXT,
  amount REAL CHECK(amount >= 0),
  address TEXT,
  status TEXT CHECK(status IN ('pending','approved','sent','confirmed','rejected')),
  txid TEXT UNIQUE,
  ts INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_withdraw_uid ON withdraw_queue(uid);
CREATE INDEX IF NOT EXISTS idx_withdraw_status ON withdraw_queue(status);

-- =====================================================
-- CASINO HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS game_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  game TEXT,
  bet REAL CHECK(bet >= 0),
  payout REAL CHECK(payout >= 0),
  ts INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- =====================================================
-- KYC
-- =====================================================
CREATE TABLE IF NOT EXISTS kyc (
  uid INTEGER PRIMARY KEY,
  level INTEGER,
  status TEXT,
  updated_at INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
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
  FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- =====================================================
-- PRICE CACHE
-- =====================================================
CREATE TABLE IF NOT EXISTS prices (
  asset TEXT PRIMARY KEY,
  price_usdt REAL,
  updated_at INTEGER
);

-- =====================================================
-- MARKET PRICES
-- =====================================================
CREATE TABLE IF NOT EXISTS market_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pair TEXT,
  price REAL CHECK(price >= 0),
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_market_pair_ts ON market_prices(pair, ts);

-- =====================================================
-- WEBHOOK RATE-LIMIT
-- =====================================================
CREATE TABLE IF NOT EXISTS webhook_hits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_webhook_hits_ip_ts ON webhook_hits(ip, ts);

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

-- =====================================================
-- AIRDROP
-- =====================================================
CREATE TABLE IF NOT EXISTS airdrops (
  uid INTEGER PRIMARY KEY,
  claimed INTEGER DEFAULT 0,
  referrals INTEGER DEFAULT 0,
  reward REAL DEFAULT 0.33,
  ts INTEGER,
  FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
);

-- =====================================================
-- MINING
-- =====================================================
CREATE TABLE IF NOT EXISTS mining_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  asset TEXT,
  plan TEXT,
  investment REAL CHECK(investment >= 0),
  roi REAL,
  days INTEGER,
  started_at INTEGER,
  ends_at INTEGER,
  status TEXT,
  FOREIGN KEY(uid) REFERENCES users(uid) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mining_uid ON mining_orders(uid);

-- =====================================================
-- CASINO STATS
-- =====================================================
CREATE TABLE IF NOT EXISTS game_stats (
  game TEXT PRIMARY KEY,
  bets REAL DEFAULT 0,
  payouts REAL DEFAULT 0,
  rounds INTEGER DEFAULT 0
);

-- =====================================================
-- TOPUPS
-- =====================================================
CREATE TABLE IF NOT EXISTS topups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  country TEXT,
  phone_number TEXT,
  amount REAL CHECK(amount >= 0),
  status TEXT CHECK(status IN ('success','failure','pending')),
  ts INTEGER
);

-- =====================================================
-- DEPOSITS
-- =====================================================
CREATE TABLE IF NOT EXISTS deposits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL CHECK(amount >= 0),
  asset TEXT NOT NULL,
  confirmations INTEGER DEFAULT 0,
  created_at INTEGER,
  FOREIGN KEY(user_id) REFERENCES users(uid) ON DELETE CASCADE
);
