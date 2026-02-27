package app

import (
	"os"

	"github.com/gofiber/fiber/v2"

	"bx-platform/internal/config"
	"bx-platform/internal/db"
	"bx-platform/internal/ledger"
	"bx-platform/internal/security"
	"bx-platform/internal/wallet"
	"bx-platform/internal/withdraw"
)

type Server struct {
	app *fiber.App
}

func NewServer() *Server {
	cfg := config.Load()
	database := db.Init(cfg.DBPath)

	ledgerService := ledger.New(database)
	walletService := wallet.New(database, ledgerService)
	withdrawService := withdraw.New(database)

	app := fiber.New()

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	api := app.Group("/api", security.APIKeyGuard())
	wallet.RegisterRoutes(api, walletService)

	admin := app.Group("/admin", security.AdminGuard())
	withdraw.RegisterRoutes(admin, withdrawService)

	return &Server{app: app}
}

func (s *Server) Start() error {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	return s.app.Listen(":" + port)
}
