package casino

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
)

func GenerateRoll(serverSeed, clientSeed string, nonce int) (float64, string) {

	h := hmac.New(sha256.New, []byte(serverSeed))
	h.Write([]byte(clientSeed + ":" + strconv.Itoa(nonce)))

	hash := hex.EncodeToString(h.Sum(nil))

	num, _ := strconv.ParseInt(hash[:8], 16, 64)

	roll := float64(num%10000) / 100

	return roll, hash
}
