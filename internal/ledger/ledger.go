package ledger

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	db *sql.DB
}

func New(db *sql.DB) *Service {
	return &Service{db: db}
}

func (s *Service) Record(tx *sql.Tx, account string, amount float64) error {
	ref := uuid.New().String()
	ts := time.Now().Unix()

	_, err := tx.Exec(`
	INSERT INTO ledger(ref,account,debit,credit,ts)
	VALUES (?,?,?,?,?)
	`, ref, account, amount, 0, ts)

	return err
}
