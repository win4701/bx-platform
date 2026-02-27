package assets

type DepositTx struct {
	TxHash      string
	ToAddress   string
	Amount      float64
	BlockNumber uint64
}

type Blockchain interface {
	Name() string
	GetCurrentBlock() (uint64, error)
	GetTransfers(address string, from, to uint64) ([]DepositTx, error)
	RequiredConfirmations() int
}
