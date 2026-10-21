# Expanded crypto research coverage

Experimental Discover no longer restricts crypto to Bitcoin, Ethereum and Solana. The reviewed fixed-strategy and portfolio-scenario paths retain their existing curated identities and release checks.

## Candidate screen

`lib/analysis/crypto-universe.ts` retrieves three free CoinGecko market lists: the top ten by reported 24-hour USD volume, the top hundred by market capitalization with provider 7/30-day percentage changes, and the stablecoin category (up to 250 rows).

The bounded research set contains, in order:

1. Eligible coins from the displayed top-ten activity universe.
2. BTC/ETH/SOL research benchmarks when present in the top hundred.
3. Up to five additional top-hundred coins with positive provider 7-day and 30-day changes, market capitalization at least $1 billion, and reported daily USD volume at least $10 million, ranked by 30-day change.

Canonical IDs are deduplicated and the combined set is capped at 15, preserving activity candidates first. Consequently fewer than five additional coins may fit. Thresholds are explicit application heuristics, not an evaluated investing strategy or a prediction of upside. This initial implementation favors established, observed candidates; it does not scan brand-new tokens or claim to establish project fundamentals.

Stablecoin-category IDs and names explicitly containing wrapped, bridged, staked or liquid staking are excluded from allocation research. This is an incomplete classification heuristic; it does not resolve every synthetic, tokenized, leveraged or derivative asset. The browsing ranking can still show these assets. Clicking `Use in Discover` requests consideration, not guaranteed inclusion. Free-text preferences do not force an ineligible coin into the model universe.

## Evidence eligibility

Each candidate must have a positive USD price, capitalization and reported volume, a valid canonical ID/name/symbol, a quote no older than 15 minutes, and at least 250 ordered, unique, contiguous completed UTC daily observations from the last year. Future observations, stale history, malformed prices and insufficient history exclude that candidate. One excluded candidate does not block remaining eligible candidates. Fewer than two total eligible assets cannot satisfy the 50% concentration cap; mixed output must still include crypto and stocks.

The server calculates completed-close 7/30-day changes, annualized sample volatility using daily log returns and sqrt(365), and peak-to-trough drawdown. Provider screening trends and completed-close trends can differ. Correlations are calculated against BTC only when histories align; absent or unaligned pairs are not estimated. This is not a complete correlation matrix or a portfolio risk model.

Known primary documentation and optional NewsData requests remain limited to the curated BTC/ETH/SOL projects. Other coins have no verified project documentation in this adapter. Missing documentation for selected coins and failed candidate-history coverage are disclosed by server-owned limitations. The AI cannot infer adoption, security, unlock schedules or fundamental quality from momentum, capitalization or volume. Reported volume is not executable liquidity.

## Resource and output limits

The research snapshot is cached for five minutes per server process and concurrent requests share retrieval. Failed snapshots are not cached. A browser cancellation does not cancel another caller's shared retrieval. Individual fetches retain bounded timeouts. Screening requires three list calls plus up to 15 daily-history calls per cache refresh, with optional curated enrichment; free-plan quotas can still be exhausted. No additional paid market-data API is required.

Full source records remain server-side. Model input omits repeated source labels/URLs and conventions, abbreviates inclusion reasons, rounds input measurements to seven significant digits and bounds supplementary excerpts. Exact monetary arithmetic never uses these rounded input metrics. The schema's citation IDs resolve to the retained full source records. One generation remains capped at 1,500 output tokens and 15,000 total tokens including the exact counted input; the cap is never silently raised. Output still contains only 2–5 proposed assets, not all screened candidates.

## Validation and sources

Provider-fixture tests cover wider identities, positive-trend screening, stale/pegged/wrapped/undersized exclusions, deduplication/caps and partial-history failure through the real allocation route. Browser tests verify a previously unsupported coin can be passed into Discover preferences. Live smoke tests exercise actual market feeds and OpenAI; these do not establish investment accuracy or replace specialist evaluation.

Primary API references: [market lists and screening parameters](https://docs.coingecko.com/reference/coins-markets), [historical chart granularity](https://docs.coingecko.com/reference/coins-id-market-chart). Availability and quotas remain subject to the provider's plan.
