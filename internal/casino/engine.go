package casino

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

func Roll(serverSeed, clientSeed string) string {
	h := hmac.New(sha256.New, []byte(serverSeed))
	h.Write([]byte(clientSeed))
	return hex.EncodeToString(h.Sum(nil))
}
