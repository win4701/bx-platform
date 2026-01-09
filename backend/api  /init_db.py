import sqlite3

DB_PATH = "db.sqlite"

schema = """
CREATE TABLE IF NOT EXISTS wallets(
  uid INTEGER PRIMARY KEY,
  bx REAL DEFAULT 0,
  ton REAL DEFAULT 0,
  usdt REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS payments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  provider TEXT,
  asset TEXT,
  amount REAL,
  status TEXT,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS withdrawals(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  asset TEXT,
  amount REAL,
  address TEXT,
  status TEXT,
  proof_value TEXT,
  created_at INTEGER,
  processed_at INTEGER
);

CREATE TABLE IF NOT EXISTS ton_deposits(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_hash TEXT UNIQUE,
  uid INTEGER,
  amount REAL,
  ts INTEGER
);

CREATE TABLE IF NOT EXISTS audit_logs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT,
  uid INTEGER,
  meta TEXT,
  ts INTEGER
);
"""

def main():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(schema)
    conn.commit()
    conn.close()
    print("db.sqlite created successfully")

if __name__ == "__main__":
    main()
