package bsc

import (
	"github.com/tyler-smith/go-bip39"
	"github.com/miguelmota/go-ethereum-hdwallet"
)

func GenerateAddress(masterSeed string, index uint32) (string, error) {

	wallet, err := hdwallet.NewFromMnemonic(masterSeed)
	if err != nil {
		return "", err
	}

	path := hdwallet.MustParseDerivationPath("m/44'/60'/0'/0/" + fmt.Sprint(index))

	account, err := wallet.Derive(path, false)
	if err != nil {
		return "", err
	}

	return account.Address.Hex(), nil
}
