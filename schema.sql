PRAGMA foreign_keys = ON;

-- USERS
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tg_id TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- WALLETS
CREATE TABLE IF NOT EXISTS wallets (
    user_id INTEGER PRIMARY KEY,
    bx REAL DEFAULT 0,
    usdt REAL DEFAULT 0,
    ton REAL DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id INTEGER PRIMARY KEY,
    tier TEXT CHECK(tier IN ('silver','gold')) DEFAULT 'silver',
    activated_at DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- MINING
CREATE TABLE IF NOT EXISTS mining_state (
    user_id INTEGER PRIMARY KEY,
    bx_rate REAL,
    ton_rate REAL,
    last_claim DATETIME,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- MARKET (BUY / SELL)
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT CHECK(type IN ('buy','sell')),
    asset TEXT CHECK(asset IN ('bx')),
    against TEXT CHECK(against IN ('usdt','ton')),
    amount REAL,
    price REAL,
    fee REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CASINO ROUNDS
CREATE TABLE IF NOT EXISTS casino_rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    game TEXT,
    bet REAL,
    win REAL,
    burned REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AIRDROP
CREATE TABLE IF NOT EXISTS airdrop_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT,
    reward REAL
);

CREATE TABLE IF NOT EXISTS airdrop_claims (
    user_id INTEGER,
    task_id INTEGER,
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, task_id)
);
