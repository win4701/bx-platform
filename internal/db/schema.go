package db

import "database/sql"

func Migrate(db *sql.DB) {
	db.Exec(`
	CREATE TABLE IF NOT EXISTS wallets (
		uid INTEGER PRIMARY KEY,
		usdt REAL DEFAULT 0
	);`)

	db.Exec(`
	CREATE TABLE IF NOT EXISTS ledger (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		ref TEXT,
		account TEXT,
		debit REAL,
		credit REAL,
		ts INTEGER
	);`)

	db.Exec(`
	CREATE TABLE IF NOT EXISTS withdraw_queue (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		uid INTEGER,
		asset TEXT,
		amount REAL,
		address TEXT,
		status TEXT DEFAULT 'pending',
		ts INTEGER
	);`)
}
