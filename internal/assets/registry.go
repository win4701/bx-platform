package assets

var chains = make(map[string]Blockchain)

func Register(asset string, chain Blockchain) {
	chains[asset] = chain
}

func Get(asset string) Blockchain {
	return chains[asset]
}
