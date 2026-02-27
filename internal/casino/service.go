package casino

import (
	"database/sql"
	"time"
)

type Wallet interface {
	Debit(tx *sql.Tx, uid int, amount float64) error
	Credit(tx *sql.Tx, uid int, amount float64) error
}

type Service struct {
	db         *sql.DB
	wallet     Wallet
	serverSeed string
	nonceMap   map[int]int
	risk       *RiskEngine
	hub        Broadcaster
}

func NewService(db *sql.DB, wallet Wallet, hub Broadcaster) *Service {
	return &Service{
		db:         db,
		wallet:     wallet,
		serverSeed: generateSeed(),
		nonceMap:   make(map[int]int),
		risk:       NewRisk(),
		hub:        hub,
	}
}

func (s *Service) Play(req PlayRequest) (*Result, error) {

	if err := s.risk.Validate(req.Bet); err != nil {
		return nil, err
	}

	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}

	if err := s.wallet.Debit(tx, req.UID, req.Bet); err != nil {
		tx.Rollback()
		return nil, err
	}

	nonce := s.nonceMap[req.UID]
	roll, hash := GenerateRoll(s.serverSeed, req.ClientSeed, nonce)
	s.nonceMap[req.UID]++

	win := roll < 49.0 // 49% win chance
	payout := 0.0

	if win {
		payout = req.Bet * (2 - s.risk.HouseEdge)
		if err := s.wallet.Credit(tx, req.UID, payout); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	tx.Commit()

	result := &Result{
		Game:     req.Game,
		Win:      win,
		Payout:   payout,
		Hash:     hash,
		Nonce:    nonce,
		ServerSeedHash: hashSeed(s.serverSeed),
	}

	if payout > 100 {
		s.hub.Broadcast(mustJSON(result))
	}

	return result, nil
}
