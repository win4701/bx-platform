package exchange

import (
	"database/sql"
)

type Wallet interface {
	Debit(tx *sql.Tx, uid int, amount float64) error
	Credit(tx *sql.Tx, uid int, amount float64) error
}

type Service struct {
	engine *Engine
	db     *sql.DB
	wallet Wallet
	hub    Broadcaster
}

type Broadcaster interface {
	Broadcast(data []byte)
}

func NewService(db *sql.DB, wallet Wallet, hub Broadcaster) *Service {
	return &Service{
		engine: NewEngine(),
		db:     db,
		wallet: wallet,
		hub:    hub,
	}
}

func (s *Service) PlaceOrder(o Order) error {

	trades := s.engine.Place(o)

	for _, t := range trades {

		tx, err := s.db.Begin()
		if err != nil {
			return err
		}

		usdt := t.Price * t.Amount

		if err := s.wallet.Debit(tx, t.Buyer, usdt); err != nil {
			tx.Rollback()
			return err
		}
		if err := s.wallet.Credit(tx, t.Seller, usdt); err != nil {
			tx.Rollback()
			return err
		}

		if err := s.wallet.Debit(tx, t.Seller, t.Amount); err != nil {
			tx.Rollback()
			return err
		}
		if err := s.wallet.Credit(tx, t.Buyer, t.Amount); err != nil {
			tx.Rollback()
			return err
		}

		tx.Commit()

	}

	return nil
}
