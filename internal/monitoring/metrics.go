package monitoring

import "github.com/prometheus/client_golang/prometheus"

var (
	HttpRequests = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "http_requests_total",
			Help: "Total HTTP requests",
		},
		[]string{"method", "endpoint"},
	)

	WalletBalanceChanges = prometheus.NewCounter(
		prometheus.CounterOpts{
			Name: "wallet_balance_updates_total",
			Help: "Total wallet balance updates",
		},
	)
)

func Init() {
	prometheus.MustRegister(HttpRequests)
	prometheus.MustRegister(WalletBalanceChanges)
}
