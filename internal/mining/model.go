package mining

type Subscription struct {
	UID       int
	Coin      string
	PlanID    string
	Amount    float64
	Start     int64
	LastClaim int64
	Days      int
	ROI       float64
}
