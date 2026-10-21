# Markets implementation

The current Crypto tab remains at `/markets`; the Stocks tab is at `/stocks`. Both use the shared Discover shell, ten activity-ranked assets, search and small observed-price charts.

See [stock and mixed-market implementation](STOCKS_IMPLEMENTATION.md) for the current providers, ranking definitions, chart ranges, cache/freshness rules, Discover integration and limitations. Crypto browsing now uses CoinGecko USD quotes. The legacy Binance/USDT monitor routes and backend remain separate; stock charts do not use that crypto feed.

Forecast details remain removed from these browsing tabs. Numerical projections are not enabled by the stock addition.
