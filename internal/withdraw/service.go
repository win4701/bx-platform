func (s *Service) RequestWithdraw(uid int, asset string, amount float64, address string) error {

	tx, _ := s.db.Begin()

	err := s.wallet.Debit(tx, uid, asset, amount)
	if err != nil {
		tx.Rollback()
		return err
	}

	_, err = tx.Exec(`
	INSERT INTO withdraw_requests(uid,asset,amount,address,status,created_at)
	VALUES (?,?,?,?, 'pending', ?)
	`, uid, asset, amount, address, time.Now().Unix())

	if err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit()
}
