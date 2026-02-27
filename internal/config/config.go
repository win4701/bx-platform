package config

import (
	"log"
	"os"
)

type Config struct {
	DBPath string
}

func Load() *Config {
	cfg := &Config{
		DBPath: getEnv("DB_PATH", "db.sqlite"),
	}

	if os.Getenv("API_KEY") == "" || os.Getenv("ADMIN_TOKEN") == "" {
		log.Fatal("Missing critical environment variables")
	}

	return cfg
}

func getEnv(key, fallback string) string {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	return v
}
