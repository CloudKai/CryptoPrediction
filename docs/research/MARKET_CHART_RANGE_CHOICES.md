# Market chart range choices

Researched: 21 October 2026. Scope: historical chart windows for the Markets tab, with crypto now and Singapore-listed stocks later. No application changes were made.

## Recommendation

For the small, calm market cards, offer **1D / 1W / 1M**, defaulting to **1D**. For crypto, display **24H / 7D / 1M** if clearer; these are the same proposed windows with explicit rolling-hour/day wording. Keep the current price above the chart and show one percentage change for the selected window. Use one shared selector above the cards rather than repeating three buttons on every card.

This is a product recommendation based on the first-party examples below, not a universal market standard. Add longer windows in an expanded detail view. Historical chart selection must remain separate from future forecast selection.

## What established platforms actually show

| Platform and chart inspected | Verified historical selector labels | Evidence |
| --- | --- | --- |
| Binance, Bitcoin price page | 1D, 7D, 1M, 3M, 1Y, YTD | Actual chart buttons in the first-party page extraction. [Bitcoin price page](https://www.binance.com/en/price/bitcoin). |
| CoinGecko, total crypto market-cap chart | 24H, 7D, 14D, 1M, 3M, Max | Labels directly under this named chart. This is an aggregate market chart, not an individual coin price chart. [Global charts](https://www.coingecko.com/en/charts). |
| CoinGecko, Bitcoin dominance chart | 24H, 7D, 1M, 1Y, Max | Labels under the separate dominance chart; even the same platform varies its controls by chart. [Global charts](https://www.coingecko.com/en/charts). |
| Robinhood, Live Ventures stock page | 1D, 1W, 1M, 3M, YTD, 1Y, 5Y, ALL | Actual selector labels in the stock page. [LIVE stock page](https://robinhood.com/us/en/stocks/LIVE/). |
| Google Finance, DBS Group Holdings on SGX | 1D, 5D, 1M, 6M, YTD, 1Y, 5Y, MAX | Actual buttons on D05:SGX, confirming a Singapore-stock example. [DBS stock page](https://www.google.com/finance/quote/D05:SGX). |

Robinhood's help documentation additionally says its stock/ETF time spans run from one day to MAX, while crypto runs from one hour to five years. It explains that the chart's span and each plotted interval are different controls. [Using charts](https://robinhood.com/us/en/support/articles/using-charts/).

These examples support day, week, month and longer historical views. They do **not** establish 1H / 5H / 10H as a usual three-button historical selector, nor validate forecasts at those horizons.

## Do not mix these meanings

| Term | Meaning | Example |
| --- | --- | --- |
| Historical chart window | How far back the entire graph looks | 24H shows the preceding 24 hours. |
| Candle or sample interval | How much time one plotted bar or point represents | A 24H chart can contain 5-minute candles. |
| Forecast horizon | How far into the future an estimate looks | A forecast for the next hour. |
| Current price | Latest observed price, with timestamp | A value above the graph; it is not a historical window. |

Robinhood documents line charts as a quick price-trend view and candlesticks as showing open, close, high and low per interval. For this project's compact cards, a line chart is the suggested default; detailed candles can be considered separately. [Using charts](https://robinhood.com/us/en/support/articles/using-charts/).

## Three choices for this app

These are proposed designs, not claims that a provider offers these exact three-control sets.

| Choice | Three visible windows | Best fit |
| --- | --- | --- |
| **A — balanced, recommended** | **1D / 1W / 1M**; crypto wording can be **24H / 7D / 1M** | Broad context while keeping small cards simple. |
| B — short-term crypto | 1H / 24H / 7D | Users monitoring immediate moves; requires suitable intraday history. Robinhood documents one-hour crypto spans, but this exact shortlist is our design choice. |
| C — longer-term investing | 1M / 3M / 1Y | Less focus on hourly movement; complements portfolio planning. |

For an expanded crypto chart, consider **1H / 24H / 7D / 1M / 3M / 1Y / All**. For expanded SGX stock details, Google Finance provides a concrete reference: **1D / 5D / 1M / 6M / YTD / 1Y / 5Y / All**. These expanded lists are optional proposals and depend on available, appropriately licensed history. “All” should mean all history available from the selected source, not an assertion of complete lifetime coverage.

YTD means year to date, starting at the beginning of the calendar year; it differs from a trailing one-year window. Use full labels in tooltips or accessible names so month (M) and minute (m) cannot be confused.

## Crypto and Singapore-stock behavior

Crypto and stock “day” views need explicit definitions. Robinhood explains that crypto can trade 24 hours a day and distinguishes its crypto daily baseline from a securities closing-price baseline. [Using charts](https://robinhood.com/us/en/support/articles/using-charts/).

For this app, define crypto **24H** as a rolling 24-hour window. Define SGX **1D** as the selected/latest trading session rather than silently treating it as uninterrupted 24-hour trading. SGX's ordinary continuous trading phases run **09:00–12:00 and 13:00–17:00**, with separate opening, closing and trade-at-close phases, plus half-day rules. [SGX Regulatory Notice 8.2.1](https://rulebook.sgx.com/rulebook/regulatory-notice-821-trading-hours-market-phases-application-market-phases-and-principles).

Accordingly, show the market state, timezone and latest-data timestamp for stocks. Avoid fabricating movement during closed periods. Define whether a weekly stock view is the trailing calendar week or the last five sessions; do not silently equate crypto 7D with stock 5D. These are implementation recommendations derived from the documented session differences.

## Evidence limits

First-party public pages and official help/rules were inspected. TinyFish search/fetch was used first; web extraction exposed some chart controls absent from the lighter fetch. Exact labels can change across layouts and regions.

Coinbase, CoinMarketCap and Yahoo Finance were also checked, but their fetched pages did not reliably expose chart selectors. Their statistics/performance tables were not substituted as proof of chart buttons. CoinGecko's Bitcoin performance table (1h, 24h, 7d, 14d, 30d, 1y) likewise was not treated as an individual-price chart selector. No logged-in account, API key, paid data call or forecast evaluation was used.
