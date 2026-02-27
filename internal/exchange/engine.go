package exchange

import (
	"math"
	"sort"
	"sync"
	"time"
)

type Engine struct {
	Bids []Order
	Asks []Order
	mu   sync.Mutex
}

func NewEngine() *Engine {
	return &Engine{}
}

func (e *Engine) Place(o Order) []Trade {
	e.mu.Lock()
	defer e.mu.Unlock()

	if o.Side == "buy" {
		e.Bids = append(e.Bids, o)
	} else {
		e.Asks = append(e.Asks, o)
	}

	return e.match()
}

func (e *Engine) match() []Trade {

	sort.Slice(e.Bids, func(i, j int) bool {
		return e.Bids[i].Price > e.Bids[j].Price
	})
	sort.Slice(e.Asks, func(i, j int) bool {
		return e.Asks[i].Price < e.Asks[j].Price
	})

	var trades []Trade

	for len(e.Bids) > 0 && len(e.Asks) > 0 {

		bid := &e.Bids[0]
		ask := &e.Asks[0]

		if bid.Price < ask.Price {
			break
		}

		amount := math.Min(bid.Amount, ask.Amount)

		trades = append(trades, Trade{
			Buyer:  bid.UID,
			Seller: ask.UID,
			Price:  ask.Price,
			Amount: amount,
			Time:   time.Now().Unix(),
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
