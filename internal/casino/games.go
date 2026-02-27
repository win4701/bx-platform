package casino

type GameEngine interface {
	Play(bet float64, roll float64, multiplier float64) (win bool, payout float64)
}

type Dice struct{}
type Limbo struct{}
type Crash struct{}

func (g Dice) Play(bet float64, roll float64, multiplier float64) (bool, float64) {
	winChance := 100.0 / multiplier
	if roll < winChance {
		return true, bet * multiplier
	}
	return false, 0
}

func (g Limbo) Play(bet float64, roll float64, multiplier float64) (bool, float64) {
	target := multiplier
	if roll < (100.0 / target) {
		return true, bet * multiplier
	}
	return false, 0
}

func (g Crash) Play(bet float64, roll float64, multiplier float64) (bool, float64) {
	if roll < 50 {
		return true, bet * 1.8
	}
	return false, 0
}

func GetGame(name string) GameEngine {
	switch name {
	case "dice":
		return Dice{}
	case "limbo":
		return Limbo{}
	case "crash":
		return Crash{}
	default:
		return Dice{}
	}
}
