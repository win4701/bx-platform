package casino

type RTPController struct {
	TotalBet     float64
	TotalPayout  float64
	BaseEdge     float64
}

func NewRTP() *RTPController {
	return &RTPController{
		BaseEdge: 0.02,
	}
}

func (r *RTPController) Record(bet, payout float64) {
	r.TotalBet += bet
	r.TotalPayout += payout
}

func (r *RTPController) CurrentEdge() float64 {
	if r.TotalBet == 0 {
		return r.BaseEdge
	}

	profit := r.TotalBet - r.TotalPayout
	ratio := profit / r.TotalBet

	if ratio < 0 {
		return 0.05 // زِد الحافة إذا خسرت المنصة
	}

	if ratio > 0.1 {
		return 0.01 // قلل الحافة إذا ربحت كثير
	}

	return r.BaseEdge
}
