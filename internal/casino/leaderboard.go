package casino

import (
	"sort"
	"sync"
)

type LeaderboardEntry struct {
	UID    int     `json:"uid"`
	Profit float64 `json:"profit"`
}

type Leaderboard struct {
	data map[int]float64
	mu   sync.Mutex
}

func NewLeaderboard() *Leaderboard {
	return &Leaderboard{
		data: make(map[int]float64),
	}
}

func (l *Leaderboard) Record(uid int, profit float64) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.data[uid] += profit
}

func (l *Leaderboard) Top(n int) []LeaderboardEntry {
	l.mu.Lock()
	defer l.mu.Unlock()

	var entries []LeaderboardEntry

	for uid, profit := range l.data {
		entries = append(entries, LeaderboardEntry{
			UID:    uid,
			Profit: profit,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Profit > entries[j].Profit
	})

	if len(entries) > n {
		return entries[:n]
	}

	return entries
}
