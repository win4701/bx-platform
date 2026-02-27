package deposit

type Deposit struct {
	ID      int
	UID     int
	Asset   string
	Amount  float64
	TxHash  string
	Status  string // pending / confirmed
	Created int64
}
