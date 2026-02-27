package main

import (
	"log"
	"bx-platform/internal/app"
)

func main() {
	server := app.NewServer()
	log.Fatal(server.Start())
}
