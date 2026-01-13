PRAGMA foreign_keys = ON;

-- ===============================
-- USERS / WALLETS
-- ===============================
CREATE TABLE IF NOT EXISTS wallets (
  uid INTEGER PRIMARY KEY,
  usdt REAL DEFAULT 0,
  ton  REAL DEFAULT 0,
  sol  REAL DEFAULT 0,
  btc  REAL DEFAULT 0,
  bx   REAL DEFAULT 0,
  created_at INTEGER
);

-- ===============================
-- LEDGER (DOUBLE ENTRY)
-- ===============================
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ref TEXT,                  -- deposit:sol / withdraw:usdt / casino:slot ...
  account TEXT,              -- treasury_usdt / user_usdt / revenue_casino ...
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger(account);
CREATE INDEX IF NOT EXISTS idx_ledger_ts ON ledger(ts);

-- ===============================
-- HISTORY (USER VIEW)
-- ===============================
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  action TEXT,               -- deposit / withdraw / trade / casino
  asset TEXT,
  amount REAL,
  ref TEXT,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_history_uid ON history(uid);
CREATE INDEX IF NOT EXISTS idx_history_ts ON history(ts);

-- ===============================
-- USED TXs (DEDUP)
-- ===============================
CREATE TABLE IF NOT EXISTS used_txs (
  txid TEXT PRIMARY KEY,
  ts INTEGER
);

-- ===============================
-- PENDING DEPOSITS
-- ===============================
CREATE TABLE IF NOT EXISTS pending_deposits (
  txid TEXT PRIMARY KEY,
  uid INTEGER,
  asset TEXT,
  amount REAL,
  reason TEXT,
  ts INTEGER
);

-- ===============================
-- WITHDRAW WORKFLOW
-- ===============================
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  asset TEXT,
  amount REAL,
  address TEXT,
  status TEXT,               -- requested / approved / sent / rejected
  txid TEXT,
  reason TEXT,
  ts INTEGER
);

CREATE INDEX IF NOT EXISTS idx_withdraw_uid ON withdrawals(uid);
CREATE INDEX IF NOT EXISTS idx_withdraw_status ON withdrawals(status);

-- ===============================
-- GAME HISTORY (CASINO)
-- ===============================
CREATE TABLE IF NOT EXISTS game_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  game TEXT,
  bet REAL,
  payout REAL,
  ts INTEGER
);

-- ===============================
-- WATCHER METRICS
-- ===============================
CREATE TABLE IF NOT EXISTS watcher_metrics (
  key TEXT PRIMARY KEY,
  value INTEGER,
  ts INTEGER
);

-- ===============================
-- TON JETTON CACHE
-- ===============================
CREATE TABLE IF NOT EXISTS jettons (
  master TEXT PRIMARY KEY,
  symbol TEXT,
  decimals INTEGER,
  ts INTEGER
);
