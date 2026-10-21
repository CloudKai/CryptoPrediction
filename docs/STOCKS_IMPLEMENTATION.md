# Crypto and stock browsing, with mixed Discover proposals

Implemented 22 October 2026 after the user selected US and Singapore stocks, separate Crypto/Stocks tabs, trading activity instead of capitalization, and free data sources.

## User flow

- `/markets` is the Crypto tab: ten coins ranked by provider-reported 24-hour USD volume. Small charts retain 24H, 7D and 1M ranges. Prices now use CoinGecko USD rather than Binance USDT; legacy individual Binance monitors still exist separately.
- `/stocks` has US and Singapore filters. US follows Yahoo Finance's **most-active universe**, sorted by share volume; Singapore sorts SGD ordinary stocks from SGX by traded value. Neither list measures search popularity or proves investment quality. Provider coverage and selection rules mean these are not guaranteed whole-market rankings.
- Stock charts offer 1W, 1M and 1Y of provider-adjusted daily observations. Today’s unfinished session is excluded. The quote and chart therefore have separate observation times and may differ after corporate-action adjustments.
- Search filters the current ten assets by company/coin name or ticker. It is not a whole-exchange symbol search. `Use in Discover` preserves existing form inputs and adds the selected eligible asset to preferences. Crypto cards also allow consideration in Discover; actual inclusion requires the expanded crypto screen and sufficient daily history. See [crypto coverage](CRYPTO_DISCOVER_COVERAGE.md).
- Discover has explicit Crypto, Stocks, and Crypto + stocks choices. Stock scope can be US, Singapore, or both. Existing-holdings answers are separate context. Results show exact USD budget allocations, reasons, risks and source links; US/Singapore stock labels distinguish listings.

## Free sources and operational limits

No new stock credential or subscription is consumed. The application uses these currently accessible public JSON feeds:

| Purpose | Endpoint | Scope |
| --- | --- | --- |
| Crypto activity and quotes | CoinGecko `/api/v3/coins/markets`, `order=volume_desc` | Ten provider-ranked coins, USD |
| Crypto chart observations | CoinGecko `/api/v3/coins/{id}/market_chart` | Actual timestamped prices |
| US active-stock list | Yahoo Finance `/v1/finance/screener/predefined/saved?scrIds=most_actives&count=10` | Provider-defined US equity screen, includes NYSE/Nasdaq listings |
| Singapore quotes and activity | SGX `/securities/v1.1` | `type=stocks`, SGD; excludes suspended securities and derivatives |
| US/SG daily history | Yahoo Finance `/v8/finance/chart/{symbol}?range=1y&interval=1d` | Canonical US ticker or SGX ticker with `.SI` suffix |

The [SGX application configuration](https://sgx.com/config/appconfig.json) identifies its securities endpoint. [Nasdaq's activity explanation](https://www.nasdaq.com/market-activity/most-active) also distinguishes share volume and dollar volume; our US implementation specifically follows [Yahoo's most-active list](https://finance.yahoo.com/markets/stocks/most-active/), not Nasdaq's narrower screen. [CoinGecko market documentation](https://docs.coingecko.com/reference/coins-markets) defines the crypto market response and sorting.

Yahoo and SGX public website endpoints are **experimental adapters**, not a guaranteed, licensed commercial API or SLA. Accessible without a key does not establish redistribution or AI-processing rights. Public deployment needs a separate terms/licensing review, and a documented licensed replacement may be needed. There is no bypass of provider authentication or rate limits. A provider rejection produces an unavailable state; no synthetic prices or static “top ten” fallback is supplied.

For comparison, [EODHD's pricing](https://eodhd.com/pricing) excludes its screener from the free package. [Twelve Data's SGX coverage](https://twelvedata.com/exchanges/xses) lists a trial symbol; its free US coverage should not be assumed to include all Singapore symbols. Those integrations were not added and no account was purchased.

Lists/crypto charts cache for five minutes, stock daily history for one hour, with bounded in-flight deduplication. Browsers check the list every five minutes. The cache is process-local and resets on deployment/restart; it is not a persistent quota manager. Feed requests have timeouts and response-size limits. Missing individual history keeps the quote visible and marks historical risk unknown. Entire feed failures clear prices and offer Retry.

## Analysis and arithmetic

The existing `SPECIALIST_ANALYSIS_ENABLED` and `DISCOVER_AI_RECOMMENDATIONS_ENABLED` flags enable experimental Discover. Existing `CRYPTO_ANALYSIS_MODEL` also selects the stock/mixed model; the environment variable name remains compatible. OpenAI inference remains paid even though the stock data feeds require no new key.

Stock candidates are the selected activity lists; crypto research uses the bounded activity-and-positive-trend candidate screen documented in [crypto coverage](CRYPTO_DISCOVER_COVERAGE.md). Canonical IDs are `stock:us:TICKER`, `stock:sg:TICKER` or a supported CoinGecko identifier. The exact eligible IDs constrain the structured-output schema and the server allocator. Stocks-only output cannot contain crypto; mixed output must contain at least one of each. Stock-country constraints survive API validation and browser restoration.

The model proposes 2–5 assets, percentages and cited explanations. The deterministic allocator enforces unique eligible identities, 100% of budget, integer basis points, maximum 50% per asset, positive cent amounts and deterministic remainder rounding. It rejects invalid output rather than inventing replacements. The essential-expense capacity answer must be explicitly No. Additional preferences are untrusted data interpreted by the model; semantic compliance is not proven by schema validation.

Risk evidence requires at least 200 valid completed adjusted observations. Stock log-return volatility uses sample variance and square-root-of-252 annualization; crypto retains square-root-of-365. Maximum drawdown and calendar-day 7/30-day changes are calculated from the observed history. Missing/short history is unknown risk. Stock values are measured in the listing currency: they do not include USD FX returns or prove diversification with crypto. The model must not invent cross-market correlations, company earnings, fair valuation, dividend safety or targets. Verified company filings and cash-flow analysis are not integrated.

USD allocations are proposed budgets, **not executable orders or share quantities**. FX, fees, fractional-share availability and SGX board lots are not reconciled. Source citations establish traceability, not semantic truth or suitability. Results retain their experimental/not-human-evaluated label; no specialist approval report is fabricated. Invested reviews, accounts, and scenario release gates are unchanged. No new numerical forecasts are introduced.

## Freshness and validation

Each selected asset carries its quote timestamp/class in `marketObservations`. `dataAsOf` must equal the oldest selected quote. Generations expire after 15 minutes. Crypto quotes must be within 15 minutes; stocks permit latest available observations up to five calendar days to cover closed sessions/weekends. This is a conservative age bound, not an implemented exchange holiday calendar. SGX `trading_time` is parsed as UTC, matching the exchange website client’s `moment.utc(..., "YYYYMMDD_HHmmss")` handling; the UI then formats the instant in the viewer’s timezone. Future observations are rejected. Stock allowances never relax crypto checks in a mixed proposal.

The per-analysis cap remains 15,000 tokens with at most 1,500 output tokens, one generation call, no automatic retry/repair. Common stock limitations are described once and primary crypto excerpts bounded to fit both countries plus crypto without changing measured facts. A real mixed request completed with 13,450 total tokens and 823 output tokens during implementation. This is an operational smoke test, not investment-quality evaluation.

Regression coverage includes class/country preservation, mixed-class enforcement, exact USD totals, source references, freshness across closed sessions, unknown history, source filtering, stock timestamp conversion, risk arithmetic, browser market/range/search controls, error recovery and mobile fit. Unit/browser fixtures are synthetic and never imported by application code.
