package wallet

import (
	"database/sql"
)

type Service struct {
	db *sql.DB
}

func New(db *sql.DB, _ interface{}) *Service {
	return &Service{db: db}
}
