package exchange

import "sync"

type Order struct {
	UID    int
	Price  float64
	Amount float64
}

type Engine struct {
	mu    sync.Mutex
	Bids  []Order
	Asks  []Order
}

func New() *Engine {
	return &Engine{}
}

func (e *Engine) PlaceBid(o Order) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.Bids = append(e.Bids, o)
}

func (e *Engine) PlaceAsk(o Order) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.Asks = append(e.Asks, o)
}
