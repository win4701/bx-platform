package exchange

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(r fiber.Router, service *Service) {

	r.Post("/exchange/order", func(c *fiber.Ctx) error {

		type Req struct {
			Side   string  `json:"side"`
			Price  float64 `json:"price"`
			Amount float64 `json:"amount"`
		}

		var body Req
		if err := c.BodyParser(&body); err != nil {
			return c.SendStatus(400)
		}

		uid := c.Locals("uid").(int)

		order := NewOrder(uid, body.Side, body.Price, body.Amount)

		if err := service.PlaceOrder(order); err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(fiber.Map{"status": "ok"})
	})

	r.Get("/exchange/book", func(c *fiber.Ctx) error {
		return c.JSON(service.engine)
	})
}
