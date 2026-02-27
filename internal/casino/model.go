package casino

type PlayRequest struct {
	UID        int
	Game       string
	Bet        float64
	Multiplier float64
	ClientSeed string
}

type Result struct {
	Game     string  `json:"game"`
	Win      bool    `json:"win"`
	Payout   float64 `json:"payout"`
	Hash     string  `json:"hash"`
	Nonce    int     `json:"nonce"`
	ServerSeedHash string `json:"server_seed_hash"`
}
