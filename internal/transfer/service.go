func (s *Service) SendBX(
    fromTelegramID int64,
    toTelegramUsername string,
    amount float64,
) error {

    // 1️⃣ جلب المرسل
    fromUser, err := s.repo.GetUserByTelegramID(fromTelegramID)
    if err != nil {
        return errors.New("sender not registered")
    }

    if fromUser.IsBanned {
        return errors.New("account banned")
    }

    // 2️⃣ جلب المستقبل
    toUser, err := s.repo.GetUserByUsername(toTelegramUsername)
    if err != nil {
        return errors.New("recipient not found")
    }

    if !toUser.IsVerified {
        return errors.New("recipient not verified")
    }

    if fromUser.ID == toUser.ID {
        return errors.New("cannot send to self")
    }

    // 3️⃣ Atomic Transaction
    tx, err := s.db.Begin()
    if err != nil {
        return err
    }

    // تحقق الرصيد
    balance, err := s.wallet.GetBalance(tx, fromUser.ID, "BX")
    if err != nil || balance < amount {
        tx.Rollback()
        return errors.New("insufficient BX balance")
    }

    // خصم
    if err := s.wallet.Debit(tx, fromUser.ID, "BX", amount); err != nil {
        tx.Rollback()
        return err
    }

    // إضافة
    if err := s.wallet.Credit(tx, toUser.ID, "BX", amount); err != nil {
        tx.Rollback()
        return err
    }

    // تسجيل التحويل
    _, err = tx.Exec(`
        INSERT INTO bx_transfers(from_uid,to_uid,amount,status,created_at)
        VALUES (?,?,?,?,?)
    `, fromUser.ID, toUser.ID, amount, "completed", time.Now().Unix())

    if err != nil {
        tx.Rollback()
        return err
    }

    return tx.Commit()
}
