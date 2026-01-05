PRAGMA foreign_keys = ON;

/* =====================================================
   USERS (CORE)
===================================================== */
CREATE TABLE IF NOT EXISTS users (
  uid INTEGER PRIMARY KEY,
  bx REAL DEFAULT 0,
  usdt REAL DEFAULT 0,
  ton REAL DEFAULT 0,

  mine_rate REAL DEFAULT 0.001,
  last_tick REAL DEFAULT 0
);

/* =====================================================
   BUY ORDERS (USDT → BX)
===================================================== */
CREATE TABLE IF NOT EXISTS buys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL,
  usdt REAL NOT NULL,
  bx REAL NOT NULL,
  price REAL NOT NULL,
  ts REAL NOT NULL,

  FOREIGN KEY(uid) REFERENCES users(uid)
);

/* =====================================================
   SELL ORDERS (BX → USDT)
===================================================== */
CREATE TABLE IF NOT EXISTS sells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL,
  bx REAL NOT NULL,
  usdt REAL NOT NULL,
  price REAL NOT NULL,
  fee REAL DEFAULT 0,
  method TEXT DEFAULT 'market',
  ts REAL NOT NULL,

  FOREIGN KEY(uid) REFERENCES users(uid)
);

/* =====================================================
   WITHDRAWALS (ADMIN APPROVAL)
===================================================== */
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL,
  amount REAL NOT NULL,
  method TEXT NOT NULL,      -- binance | redotpay | bep20
  target TEXT NOT NULL,      -- address or account id
  status TEXT NOT NULL,      -- pending | done | rejected
  ts REAL NOT NULL,

  FOREIGN KEY(uid) REFERENCES users(uid)
);

/* =====================================================
   REFERRALS
===================================================== */
CREATE TABLE IF NOT EXISTS referrals (
  referrer INTEGER NOT NULL,
  referred INTEGER PRIMARY KEY,
  ts REAL NOT NULL,

  FOREIGN KEY(referrer) REFERENCES users(uid),
  FOREIGN KEY(referred) REFERENCES users(uid)
);

/* =====================================================
   CASINO LOGS (PROVABLY FAIR READY)
===================================================== */
CREATE TABLE IF NOT EXISTS casino_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER NOT NULL,
  game TEXT NOT NULL,
  bet REAL NOT NULL,
  payout REAL NOT NULL,
  result TEXT NOT NULL,
  ts REAL NOT NULL,

  FOREIGN KEY(uid) REFERENCES users(uid)
);

/* =====================================================
   INDEXES (PERFORMANCE)
===================================================== */
CREATE INDEX IF NOT EXISTS idx_users_bx
  ON users(bx);

CREATE INDEX IF NOT EXISTS idx_withdraw_uid
  ON withdrawals(uid);

CREATE INDEX IF NOT EXISTS idx_withdraw_status
  ON withdrawals(status);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer
  ON referrals(referrer);

CREATE INDEX IF NOT EXISTS idx_buys_uid
  ON buys(uid);

CREATE INDEX IF NOT EXISTS idx_sells_uid
  ON sells(uid);
