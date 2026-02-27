func (s *Service) Play(req PlayRequest) (*Result, error) {

	s.seedManager.MaybeRotate()

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}

	if err := s.wallet.Debit(tx, req.UID, req.Bet); err != nil {
		tx.Rollback()
		return nil, err
	}

	nonce := s.nonceMap[req.UID]
	roll, hash := GenerateRoll(s.seedManager.ServerSeed, req.ClientSeed, nonce)
	s.nonceMap[req.UID]++

	game := GetGame(req.Game)

	win, payout := game.Play(req.Bet, roll, req.Multiplier)

	edge := s.rtp.CurrentEdge()
	payout = payout * (1 - edge)

	if win && payout > 0 {
		if err := s.wallet.Credit(tx, req.UID, payout); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	tx.Commit()

	s.rtp.Record(req.Bet, payout)

	result := &Result{
		Game: req.Game,
		Win:  win,
		Payout: payout,
		Hash: hash,
		Nonce: nonce,
		ServerSeedHash: s.seedManager.Hash,
	}

	return result, nil
}
