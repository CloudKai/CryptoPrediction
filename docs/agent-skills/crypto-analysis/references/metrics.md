# Calculation and portfolio review requirements

Use these requirements when interpreting numerical evidence. The application supplies tested calculations; the language model explains them.

| Evidence | Required context |
| --- | --- |
| Price/change | Canonical asset, quote currency, timestamp, comparison window, source. |
| Volume/liquidity | Base versus quote units, venues, observation window; distinguish reported volume from usable depth. |
| Supply/valuation | Source definitions and date for circulating/total/max supply, market cap, and fully diluted valuation; unknown max supply remains unknown. |
| Volatility | Return convention, sample frequency/window, annualization convention appropriate to the market. |
| Drawdown | Observed period and calculation basis. Historical drawdown is not a future maximum-loss bound. |
| Correlation | Aligned return series, overlapping period, missing-data handling, sample size. Several coin names alone do not establish diversification. |
| Portfolio exposure | Current-value weights, correlated/category exposures, concentration limits, and missing positions. |

## Multiple purchases and gain/loss

Use quantity, purchase date, and total cost for each recorded purchase. Keep older and newer lots separately inspectable while aggregating the coin position. New purchases change cost/exposure; the added capital itself is not gain. Include fees consistently when recorded. Sales, transfers, distributions, and tax accounting require explicit supported ledger rules; do not infer them from buy records.

Keep cost-based position gain, cash-flow-adjusted historical performance, and future projected change separately labeled. A current-value-only entry supports a forward baseline but not historical gain or time-weighted performance. See [return semantics](../../../research/INVESTMENT_RETURN_SEMANTICS.md) for the worked additional-purchase example and source.

## Currency and weights

Use the application's dated FX conversion outputs. Preserve investment movement separately from currency movement where the UI claims to do so. Completed allocation proposals total 100% and the entered amount to currency precision; deterministic allocation/rounding code owns this invariant. Portfolio review suggestions remain proposals and never execute trades.
