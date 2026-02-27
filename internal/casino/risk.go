package casino

type RiskEngine struct {
	HouseEdge float64
	MaxBet    float64
}

func NewRisk() *RiskEngine {
	return &RiskEngine{
		HouseEdge: 0.22, // 2%
		MaxBet:    1000,
	}
}

func (r *RiskEngine) Validate(bet float64) error {
	if bet <= 0 {
		return ErrInvalidBet
	}
	if bet > r.MaxBet {
		return ErrMaxBet
	}
	return nil
}
