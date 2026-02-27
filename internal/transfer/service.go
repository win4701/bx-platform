package transfer

type Wallet interface {
	Debit(tx *sql.Tx, uid int, asset string, amount float64) error
	Credit(tx *sql.Tx, uid int, asset string, amount float64) error
}

type Service struct {
	db     *sql.DB
	wallet Wallet
}

func (s *Service) SendBX(from, to int, amount float64) error {

	if from == to {
		return errors.New("cannot send to self")
	}

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}

	if err := s.wallet.Debit(tx, from, "BX", amount); err != nil {
		tx.Rollback()
		return err
	}

	if err := s.wallet.Credit(tx, to, "BX", amount); err != nil {
		tx.Rollback()
		return err
	}

	_, err = tx.Exec(`
	INSERT INTO bx_transfers(from_uid,to_uid,amount,created_at)
	VALUES (?,?,?,?)
	`, from, to, amount, time.Now().Unix())

	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
