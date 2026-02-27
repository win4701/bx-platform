app.Get("/ws/big-wins", websocket.New(hub.Handler))
