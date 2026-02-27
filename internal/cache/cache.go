package cache

import (
	"context"
	"github.com/redis/go-redis/v9"
)

var Rdb *redis.Client

func Init() {
	Rdb = redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
}

func Set(key string, value string) {
	Rdb.Set(context.Background(), key, value, 0)
}

func Get(key string) (string, error) {
	return Rdb.Get(context.Background(), key).Result()
}
