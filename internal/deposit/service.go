package deposit

import "database/sql"

type Wallet interface {
	Credit(tx *sql.Tx, uid int, amount float64) error
}

type Service struct {
	db     *sql.DB
	wallet Wallet
}

func New(db *sql.DB, wallet Wallet) *Service {
	return &Service{db: db, wallet: wallet}
}

func (s *Service) ConfirmDeposit(id int) error {

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}

	var uid int
	var amount float64

	err = tx.QueryRow(`
		SELECT uid, amount FROM deposits
		WHERE id=? AND status='pending'
	`, id).Scan(&uid, &amount)

	if err != nil {
		tx.Rollback()
		return err
	}

	if err := s.wallet.Credit(tx, uid, amount); err != nil {
		tx.Rollback()
		return err
	}

	_, err = tx.Exec(`
		UPDATE deposits SET status='confirmed'
		WHERE id=?
	`, id)

	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
