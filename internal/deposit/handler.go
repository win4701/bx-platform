func RegisterRoutes(r fiber.Router, s *Service) {

	r.Post("/deposit/confirm/:id", func(c *fiber.Ctx) error {
		id, _ := c.ParamsInt("id")

		if err := s.ConfirmDeposit(id); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": err.Error()})
		}

		return c.JSON(fiber.Map{"status": "confirmed"})
	})
}
