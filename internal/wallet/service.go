package wallet

import (
	"database/sql"
	"errors"
)

type Service struct {
	db *sql.DB
}

func New(db *sql.DB, _ interface{}) *Service {
	return &Service{db: db}
}

func (s *Service) Credit(uid int, amount float64) error {
	_, err := s.db.Exec(`
	INSERT INTO wallets(uid, usdt)
	VALUES (?,?)
	ON CONFLICT(uid) DO UPDATE SET usdt = usdt + ?
	`, uid, amount, amount)

	return err
}

func (s *Service) Debit(uid int, amount float64) error {
	res, err := s.db.Exec(`
	UPDATE wallets SET usdt = usdt - ?
	WHERE uid=? AND usdt >= ?
	`, amount, uid, amount)

	if err != nil {
		return err
	}

	rows, _ := res.RowsAffected()
	if rows == 0 {
		return errors.New("insufficient balance")
	}

	return nil
}

func (s *Service) Balance(uid int) (float64, error) {
	var balance float64
	err := s.db.QueryRow(`
	SELECT usdt FROM wallets WHERE uid=?
	`, uid).Scan(&balance)

	return balance, err
}
