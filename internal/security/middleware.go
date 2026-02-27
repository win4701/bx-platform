package security

import (
	"os"
	"github.com/gofiber/fiber/v2"
)

func APIKeyGuard() fiber.Handler {
	apiKey := os.Getenv("API_KEY")

	return func(c *fiber.Ctx) error {
		if c.Get("X-API-Key") != apiKey {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}
		return c.Next()
	}
}

func AdminGuard() fiber.Handler {
	admin := os.Getenv("ADMIN_TOKEN")

	return func(c *fiber.Ctx) error {
		if c.Get("X-Admin-Token") != admin {
			return c.Status(403).JSON(fiber.Map{"error": "forbidden"})
		}
		return c.Next()
	}
}
