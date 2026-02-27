func (s *Scanner) scanAsset(asset string) {

	chain := assets.Get(asset)

	currentBlock, _ := chain.GetCurrentBlock()

	addresses := s.repo.GetAddresses(asset)

	for _, addr := range addresses {

		txs, _ := chain.GetTransfers(
			addr.Address,
			addr.LastScannedBlock,
			currentBlock,
		)

		for _, tx := range txs {
			s.repo.InsertDeposit(tx, asset)
		}

		s.repo.UpdateLastScanned(addr.Address, currentBlock)
	}
}
