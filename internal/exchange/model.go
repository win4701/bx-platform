package exchange

import "time"

type Order struct {
	ID     string  `json:"id"`
	UID    int     `json:"uid"`
	Side   string  `json:"side"` // buy / sell
	Price  float64 `json:"price"`
	Amount float64 `json:"amount"`
	Time   int64   `json:"time"`
}

type Trade struct {
	Buyer  int     `json:"buyer"`
	Seller int     `json:"seller"`
	Price  float64 `json:"price"`
	Amount float64 `json:"amount"`
	Time   int64   `json:"time"`
}

func NewOrder(uid int, side string, price, amount float64) Order {
	return Order{
		ID:     generateID(),
		UID:    uid,
		Side:   side,
		Price:  price,
		Amount: amount,
		Time:   time.Now().UnixNano(),
	}
}
