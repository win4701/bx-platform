package db

import (
	"database/sql"
	_ "github.com/mattn/go-sqlite3"
)

func Init(path string) *sql.DB {
	db, _ := sql.Open("sqlite3", path+"?_journal_mode=WAL")
	Migrate(db)
	return db
}
