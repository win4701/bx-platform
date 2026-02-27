package withdraw

import (
	"database/sql"
	"time"
)

type Service struct {
	db *sql.DB
}

func New(db *sql.DB) *Service {
	return &Service{db: db}
}

func (s *Service) Request(uid int, amount float64, address string) error {
	_, err := s.db.Exec(`
	INSERT INTO withdraw_queue(uid,asset,amount,address,ts)
	VALUES (?,?,?,?,?)
	`, uid, "usdt", amount, address, time.Now().Unix())

	return err
}

func (s *Service) Approve(id int) error {
	_, err := s.db.Exec(`
	UPDATE withdraw_queue SET status='approved' WHERE id=?
	`, id)
	return err
}
