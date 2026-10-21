# Experimental Markets hourly outlook

Implementation record, 21 October 2026. Source: `backend/app/hourly_outlook.py`, method `direct-ridge-hourly-v1`.

**Deferred:** the user requested removal of Forecast details from Markets. The page currently displays only current prices and historical 24H/7D/1M charts and does not request hourly outlooks. The backend methodology below remains a technical record for future work; descriptions of forecast UI validation refer to the former implementation.

## Data and timing

The backend requests 2,000 hourly candles from the existing Binance integration, independently of the range-specific chart feed. It rejects future observations and requires completed hourly observations with nonnegative, hour-aligned timestamps, finite positive closes, and contiguous one-hour spacing. It does not sort away defects or fill missing bars. The forming hour is excluded. If the latest completed close is at least one hour old, all horizons are unavailable.

The reference price is the last completed hourly close. `referenceAt` is that candle’s end time; `targetAt` is exactly 1, 5, or 10 hours later. These are future horizons from the hourly reference, not from the instant a visitor opens the disclosure. The reference price can differ from the latest observed price shown above the chart. The UI suppresses estimates whose reference is in the future or at least one hour old, and checks finite positive prices, ordered bounds, direction, and exact target spacing. It checks age every 30 seconds while expanded and reloads when the observed-price hour changes. Quality-evaluated results are cached in server memory per symbol for the current UTC hour; transient input failures are not cached. This is not a persisted evaluation ledger.

## Model and rolling checks

Each horizon fits its own ridge regression to the direct future log return, `log(price[t+h] / price[t])`. Six features use only history at the origin: cumulative log returns over 1, 3, 6, 12, and 24 hours, plus standard deviation of the latest 24 hourly log returns. Features are standardized using the training rows. The ridge penalty is 10; the intercept is unpenalized.

At every origin the training origins start at `max(24, origin − 720)` and end at `origin − h`, inclusive. This is a rolling 720-hour training window with only fully resolved horizon outcomes; it is not 720 independent examples for every horizon. The first check origin must be at least `720 + 24`. There are 30 earlier calibration origins followed by 40 scored test origins per horizon, spaced `h` hours apart so targets do not overlap within that horizon. Different horizons can share data. The minimum number of completed candles is `745 + 70h`: 815, 1,095, or 1,445 for 1h, 5h, or 10h respectively.

For each test origin, the interval radius is the 80th percentile of the absolute errors at the preceding 30 resolved origins, using NumPy’s `higher` quantile method. The test error itself is not used to set its own radius. Earlier test errors become eligible once resolved. This is sequential rolling evaluation with withholding, not a permanently untouched release holdout.

A horizon must pass **all** these engineering screens across its 40 test origins:

- Unchanged-price baseline mean absolute log-return error exceeds `1e-10`.
- Model mean absolute log-return error is at most 95% of that unchanged-price baseline error.
- Direction accuracy is at least 55%.
- Direction accuracy exceeds the training-window majority-direction baseline by at least five percentage points. The baseline is Up when at least half of its known training outcomes are positive; otherwise Down. Evaluation treats zero returns as not Up.
- Empirical interval coverage is between 70% and 95%, inclusive.

If a screen fails, the response contains an unavailable reason and historical metrics, with no estimate. On a pass, a final model is fitted at the latest completed origin. Its radius uses the latest 30 resolved errors. The estimate and radius must have a finite sum, the radius must be positive, and `abs(estimate) + radius` must be at most 0.5 in log-return units. Numerical fitting failures also withhold estimates. Available estimated price and bounds are `referencePrice × exp(estimate)` and `referencePrice × exp(estimate ± radius)`. Positive estimates are labeled Up; zero or negative estimates Down.

## Interpretation and limits

The range targets 80% coverage; this is an empirical residual construction with no guaranteed future calibration. Forty tests are a small sample, markets change, and neither non-overlapping horizon targets nor historical gates establish independence, statistical significance, or generalization. Passing several screens is not proof of forecasting skill. Displayed historical direction accuracy is not a probability of profit. This model does not include news, tokenomics, specialist AI research, transaction costs, slippage, or portfolio suitability. It is separate from the legacy 15-minute direction classifier and supplies no long-term allocation or investment recommendation.

The primary methodology reference is Hyndman and Athanasopoulos, [Forecasting: Principles and Practice — The forecaster’s toolbox](https://otexts.com/fpp3/toolbox.html), particularly time-series cross-validation, benchmark evaluation, and prediction/distributional intervals. Those principles inspire the chronological checks and uncertainty reporting. The ridge implementation, sample counts, thresholds, and residual-radius rule are project engineering choices, not prescriptions from that textbook or a claim of reproducing a validated method.

## Validation status

Verification completed: 48 frontend unit/API tests, six Python tests, ten browser tests against the production build, lint, TypeScript, and production build passed. Tests cover historical anchors, source freshness, forming-hour exclusion, invalid/gapped/stale input, training target leakage, ordered positive ranges on a learnable synthetic series, individual-feed failure, and forecast retry/withholding. Desktop and mobile renders and an independent finish review were completed; two freshness findings were fixed and re-reviewed. The detector found no regex anti-patterns, with advisory notes for compact type sizes and inherited colors; it was not a full browser contrast audit.

A live BTC trial failed the historical screens for all three horizons and therefore returned no estimates. No live forecast skill, manually reviewed release evaluation, or guaranteed calibration is established. Synthetic tests and browser fixtures can verify calculations, withholding, timing, and rendering; they cannot demonstrate profitable or accurate live forecasts.
