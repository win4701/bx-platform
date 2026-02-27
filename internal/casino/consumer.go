func RegisterConsumers(bus *event.Bus, wallet Wallet, audit Audit, ws Broadcaster) {

	bus.Subscribe(event.EventCasinoPlayed, func(payload interface{}) {

		res := payload.(*Result)

		tx, _ := wallet.BeginTx()

		if res.Win {
			wallet.Credit(tx, res.UID, res.Payout)
		}

		tx.Commit()

		audit.Log(res.UID, "casino_play", "win/loss")

		ws.BroadcastJSON(res)
	})
}
