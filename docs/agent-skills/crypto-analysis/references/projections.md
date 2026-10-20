# Multi-year scenario requirements

This branch interprets scenario-engine output; it does not generate prices from language-model intuition.

Require a versioned methodology, dated dataset, asset identities, current-value baseline, horizons, assumptions, and evaluation results. Display central values and signed changes for 1, 3, and 5 years only when the engine supports them. Expanded details disclose downside/base/upside definitions and relevant uncertainty.

Determine whether values are modeled quantiles, stress scenarios, or another defined construct. Preserve those labels. A statistical interval requires a stated model and validation; a scenario label alone does not imply a measured probability.

Audit market-regime assumptions, history length, survivorship, missing/delisted assets, correlations, extreme-event behavior, liquidity, and token-supply changes. Explain limits of the selected method rather than asserting that a short history validates a five-year forecast. The existing next-candle directional model is not evidence for multi-year returns.

For portfolio totals, use the joint scenario engine's aggregation. Individual downside quantiles cannot be summed and relabeled a portfolio downside quantile without justification. Future contributions are excluded unless explicitly modeled and separately displayed. Predictions of changes start at current value today; purchase-cost gain is a separate metric.

If the required model, evidence, or supported horizon is absent, return unavailable/incomplete with reasons. Research narratives, news sentiment, and high model confidence do not replace a missing numerical projection.
