package ton

import (
	"encoding/json"
	"net/http"
)

type Client struct {
	apiKey string
}

func New(apiKey string) *Client {
	return &Client{apiKey: apiKey}
}

func (c *Client) GetTransactions(address string) ([]byte, error) {

	url := "https://toncenter.com/api/v2/getTransactions?address=" + address

	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("X-API-Key", c.apiKey)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}

	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	return json.Marshal(result)
}
