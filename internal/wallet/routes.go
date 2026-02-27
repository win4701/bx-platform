package wallet

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(app fiber.Router, service *Service) {

	app.Post("/wallet/credit", func(c *fiber.Ctx) error {
		type Req struct {
			UID    int     `json:"uid"`
			Amount float64 `json:"amount"`
		}
		var r Req
		c.BodyParser(&r)
		err := service.Credit(r.UID, r.Amount)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "credited"})
	})

	app.Post("/wallet/debit", func(c *fiber.Ctx) error {
		type Req struct {
			UID    int     `json:"uid"`
			Amount float64 `json:"amount"`
		}
		var r Req
		c.BodyParser(&r)
		err := service.Debit(r.UID, r.Amount)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}
		return c.JSON(fiber.Map{"status": "debited"})
	})

	app.Get("/wallet/balance/:uid", func(c *fiber.Ctx) error {
		uid, _ := c.ParamsInt("uid")
		b, err := service.Balance(uid)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "not found"})
		}
		return c.JSON(fiber.Map{"balance": b})
	})
}
