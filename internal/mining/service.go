package mining

import (
	"database/sql"
	"time"
)

type Wallet interface {
	Credit(tx *sql.Tx, uid int, amount float64) error
	Debit(tx *sql.Tx, uid int, amount float64) error
}

type Service struct {
	db     *sql.DB
	wallet Wallet
}

func (s *Service) Subscribe(uid int, amount float64, roi float64, days int) error {

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}

	if err := s.wallet.Debit(tx, uid, amount); err != nil {
		tx.Rollback()
		return err
	}

	_, err = tx.Exec(`
	INSERT INTO mining_subs(uid,amount,roi,days,start,last_claim)
	VALUES (?,?,?,?,?,?)
	`, uid, amount, roi, days, time.Now().Unix(), time.Now().Unix())

	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
