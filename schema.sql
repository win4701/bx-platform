PRAGMA foreign_keys = ON;

/* =========================
   USERS
========================= */
CREATE TABLE IF NOT EXISTS users (
  uid INTEGER PRIMARY KEY,
  bx REAL DEFAULT 0,
  usdt REAL DEFAULT 0,
  ton REAL DEFAULT 0,

  mine_rate REAL DEFAULT 0.001,
  last_tick REAL DEFAULT 0
);

/* =========================
   BUY ORDERS (USDT -> BX)
========================= */
CREATE TABLE IF NOT EXISTS buys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  usdt REAL,
  bx REAL,
  price REAL,
  ts REAL,

  FOREIGN KEY(uid) REFERENCES users(uid)
);

/* =========================
   SELL ORDERS (BX -> USDT)
========================= */
CREATE TABLE IF NOT EXISTS sells (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  bx REAL,
  usdt REAL,
  price REAL,
  fee REAL,
  method TEXT,
  ts REAL,

  FOREIGN KEY(uid) REFERENCES users(uid)
);

/* =========================
   WITHDRAWALS
========================= */
CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  amount REAL,
  method TEXT,     -- binance | redotpay | bep20
  target TEXT,     -- address or account id
  status TEXT,     -- pending | done | rejected
  ts REAL,

  FOREIGN KEY(uid) REFERENCES users(uid)
);

/* =========================
   REFERRALS
========================= */
CREATE TABLE IF NOT EXISTS referrals (
  referrer INTEGER,
  referred INTEGER PRIMARY KEY,
  ts REAL,

  FOREIGN KEY(referrer) REFERENCES users(uid),
  FOREIGN KEY(referred) REFERENCES users(uid)
);

/* =========================
   CASINO LOGS (OPTIONAL / FUTURE)
========================= */
CREATE TABLE IF NOT EXISTS casino_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid INTEGER,
  game TEXT,
  bet REAL,
  payout REAL,
  result TEXT,
  ts REAL,

  FOREIGN KEY(uid) REFERENCES users(uid)
);

/* =========================
   INDEXES (PERFORMANCE)
========================= */
CREATE INDEX IF NOT EXISTS idx_users_bx ON users(bx);
CREATE INDEX IF NOT EXISTS idx_withdraw_uid ON withdrawals(uid);
CREATE INDEX IF NOT EXISTS idx_referrer ON referrals(referrer);
