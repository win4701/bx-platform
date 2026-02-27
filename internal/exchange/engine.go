func (e *Engine) Match() []Trade {
	e.mu.Lock()
	defer e.mu.Unlock()

	var trades []Trade

	for len(e.Bids) > 0 && len(e.Asks) > 0 {
		bid := e.Bids[0]
		ask := e.Asks[0]

		if bid.Price < ask.Price {
			break
		}

		amount := min(bid.Amount, ask.Amount)

		trades = append(trades, Trade{
			Buyer:  bid.UID,
			Seller: ask.UID,
			Price:  ask.Price,
			Amount: amount,
		})

		bid.Amount -= amount
		ask.Amount -= amount

		if bid.Amount == 0 {
			e.Bids = e.Bids[1:]
		}
		if ask.Amount == 0 {
			e.Asks = e.Asks[1:]
		}
	}

	return trades
}
