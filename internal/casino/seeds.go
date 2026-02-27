package casino

import (
	"crypto/sha256"
	"encoding/hex"
	"time"
)

type SeedManager struct {
	ServerSeed string
	Hash       string
	RotatedAt  time.Time
}

func NewSeedManager() *SeedManager {
	return rotateSeed()
}

func rotateSeed() *SeedManager {
	seed := generateSeed()
	hash := sha256.Sum256([]byte(seed))

	return &SeedManager{
		ServerSeed: seed,
		Hash:       hex.EncodeToString(hash[:]),
		RotatedAt:  time.Now(),
	}
}

func (s *SeedManager) MaybeRotate() {
	if time.Since(s.RotatedAt).Hours() > 24 {
		newSeed := rotateSeed()
		s.ServerSeed = newSeed.ServerSeed
		s.Hash = newSeed.Hash
		s.RotatedAt = time.Now()
	}
}
