package withdraw

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(app fiber.Router, service *Service) {
	app.Get("/withdraw/test", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"withdraw": "ok"})
	})
}
