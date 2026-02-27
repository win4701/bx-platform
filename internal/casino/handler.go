package casino

import "github.com/gofiber/fiber/v2"

func RegisterRoutes(r fiber.Router, service *Service) {

	r.Post("/casino/play", func(c *fiber.Ctx) error {

		type Req struct {
			Game       string  `json:"game"`
			Bet        float64 `json:"bet"`
			ClientSeed string  `json:"client_seed"`
		}

		var body Req
		if err := c.BodyParser(&body); err != nil {
			return c.SendStatus(400)
		}

		uid := c.Locals("uid").(int)

		result, err := service.Play(PlayRequest{
			UID:        uid,
			Game:       body.Game,
			Bet:        body.Bet,
			ClientSeed: body.ClientSeed,
		})

		if err != nil {
			return c.Status(400).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		return c.JSON(result)
	})
}
