package withdraw

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(app fiber.Router, service *Service) {

	app.Post("/withdraw/request", func(c *fiber.Ctx) error {
		type Req struct {
			UID     int     `json:"uid"`
			Amount  float64 `json:"amount"`
			Address string  `json:"address"`
		}
		var r Req
		c.BodyParser(&r)
		service.Request(r.UID, r.Amount, r.Address)
		return c.JSON(fiber.Map{"status": "queued"})
	})

	app.Post("/withdraw/approve/:id", func(c *fiber.Ctx) error {
		id, _ := c.ParamsInt("id")
		service.Approve(id)
		return c.JSON(fiber.Map{"status": "approved"})
	})
}
