package bsc

import (
	"context"
	"math/big"

	"github.com/ethereum/go-ethereum/ethclient"
)

type Client struct {
	rpc *ethclient.Client
}

func New(rpcURL string) (*Client, error) {
	c, err := ethclient.Dial(rpcURL)
	if err != nil {
		return nil, err
	}
	return &Client{rpc: c}, nil
}

func (c *Client) GetBlockNumber() (uint64, error) {
	return c.rpc.BlockNumber(context.Background())
}
