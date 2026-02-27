package wallet

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(app fiber.Router, service *Service) {
	app.Get("/wallet/test", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"wallet": "ok"})
	})
}
