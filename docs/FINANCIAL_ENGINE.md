# Calculations, specialist analysis, and scenarios

Implemented 20 October 2026 from the user's three-part request: current values, purchase gains/losses and totals with allocation constraints; specialist sourced explanations and risk reviews with token caps; tested 1/3/5-year scenario methodology before displaying estimates.

## Public calculation boundaries

`lib/finance/portfolio.ts` exposes `calculatePortfolio(positions)` for dated snapshots and `calculateCurrentPortfolio(positions, now)` for current endpoints. Positions are either dated purchase lots with decimal-string quantities and a USD price mark, or a current-value-only baseline. Never combine both. IDs must be unique, quantities positive, costs non-negative integer cents, dates real and preceding the mark. Total cost includes any fee the caller records; there is no fee inference, sales ledger, transfers, distributions, tax calculation or FX conversion.

Decimal multiplication uses BigInt rational arithmetic up to 18 fractional digits. Mark each lot in cents with half-up rounding, then sum those rounded lot values so displayed details reconcile. Known purchase cost gives unrealized gain and a cost-based percentage, rounded to four decimal places. A zero cost has no percentage denominator. Added purchases are contributions, not gains. The documented $100→$120 plus another $100 purchase remains a $20 gain over $200 cost (10%), with the older lot still showing 20%.

Baseline-only holdings have no invented cost or historical gain. A mixed portfolio has current totals and inspectable known-lot gains, while overall cost/gain remain unavailable. All arithmetic rejects unsafe integer totals. Current endpoints require price marks no older than 15 minutes and no more than one minute ahead; manually supplied baseline values remain caller assertions.

`allocateBudget(budgetCents, weights, policy)` checks full weights (10,000 basis points), unique eligible IDs, 3–5 assets by default, and a default 50% cap per asset. A caller can supply explicit count/cap/eligibility constraints. It distributes every cent by largest remainder; canonical asset ID breaks ties independently of order. It rejects budgets that would leave a selected asset with zero cents. It never invents an allocation, drops a constraint, or retains an unallocated remainder to force success.

## Endpoints and storage

- `POST /api/portfolio/calculate` accepts `{positions}` and returns valuations, lot gains, portfolio totals and current-value exposures. This is stateless arithmetic, with no sign-in, persistence or trade execution. It does not bypass the signed-in Invested workspace or add holdings to that UI.
- `POST /api/portfolio/review` accepts `{positions}`, calculates the same values, and attaches specialist explanations, evidence and usage. Requires `Authorization: Bearer <ANALYSIS_ACCESS_TOKEN>` and configured specialist settings.
- `POST /api/portfolio/scenarios` accepts `{assets:[{assetId,currentValueCents}]}`. Requires that same deployment credential. It fetches source history itself; clients cannot provide their own validation receipts or price histories to make estimates appear.
- `POST /api/allocation` keeps the existing external-service bridge when the internal service is disabled. Set `SPECIALIST_ANALYSIS_ENABLED=true`, `OPENAI_API_KEY` and `CRYPTO_ANALYSIS_MODEL` for the in-process service. The existing Discover UI consumes its verified response without redesign.

JSON endpoints return `Cache-Control: no-store`. Portfolio request bodies are bounded to 64 KB (scenario inputs 12 KB). None saves user holdings. Authentication, account persistence and Invested data-entry UI are separate unfinished capabilities.

## Allocation policy is an explicit deployment decision

There is no built-in default coin basket or investor suitability score. `ALLOCATION_STRATEGY_JSON` supplies a reviewed version, review reference, weights and explicit accepted answers for all five profile questions. Its universe must fit the canonical source catalog (bitcoin, ethereum, solana), 3–5 assets and the 50% cap. Every rounded monetary exposure also respects that cap, even when a largest remainder would otherwise cross it. External-service responses are checked against the same arithmetic constraints.

For example, a configuration has this shape; these illustrative choices are **not an approved investment policy**:

```json
{"version":"reviewed-strategy-id","reviewReference":"approval-record","weights":[{"assetId":"bitcoin","weightBps":4000},{"assetId":"ethereum","weightBps":4000},{"assetId":"solana","weightBps":2000}],"profiles":{"horizon":["3_5","over_5"],"capacity":["no"],"reaction":["hold"],"experience":["basic","experienced"],"holdings":["none","stocks"]},"preferences":"unsupported"}
```

A missing/invalid strategy or unsupported profile fails closed. Free-text preference interpretation is not implemented by this policy; nonempty preferences return unsupported rather than silently ignoring user wishes. Broader asset eligibility, preference extraction and suitability decisions remain product work.

## Evidence and specialization

The runtime loads `docs/agent-skills/crypto-analysis/SKILL.md` and its metrics branch. Deployment tracing includes these files. Canonical identities and primary documentation URLs are server-owned; source excerpts and user text are untrusted data, never instructions. Model explanations cannot change calculated assets or allocations.

Adapters use CoinGecko USD markets and daily USD price histories plus Bitcoin, Ethereum and Solana primary documentation. Coinbase Exchange USD order books supply one-venue spread and depth within 50 basis points; aggregated size is not multiplied by order count. NewsData, when configured, supplies recent matching third-party reports (unverified, never treated as primary fact). Aligned daily histories supply pairwise daily-log-return correlations; zero variance produces unknown correlation. They reject missing/stale market snapshots, missing risk history and unreadable documentation. Source metadata distinguishes documentation retrieval from publication time. Daily log volatility uses sample variance and sqrt(365); drawdown is the worst historical decline from a running peak. These are historical observations, not future loss limits. Evidence collection still lacks verified unlock schedules, a comprehensive incident feed and independent verification of news. Every complete allocation discloses those gaps and the limits of one-venue depth. Source failure prevents invented substitutes. Source-history validation rejects duplicate, unordered, gapped and non-UTC daily rows before risk metrics.

Structured output requires an exact asset set, per-claim and per-risk evidence IDs, portfolio risk and limitations. Unknown/cross-asset evidence references are rejected. A valid citation ID does not prove a claim is semantically supported: human and model-vs-generic-baseline evaluations in the skill pack remain required before production enablement. The runtime requires `SPECIALIST_EVALUATION_REPORT_PATH`, matching the configured model and current skill-pack SHA-256, reviewed within 90 days. All fourteen cases must be structurally valid, have no critical failures, score at least 0.9 and no worse than generic, with a strict improvement in at least one case. The report is a trusted deployment review record, not mathematical proof of factual correctness. No live model quality or return accuracy has been established by fixture tests.

The OpenAI Responses adapter counts the exact model/instructions/input/schema first, reserving at most 1,500 output tokens under the 15,000 cumulative cap. It makes one generation call with no tools, hidden conversation, retries or repair calls. Reported input/output totals must reconcile and remain within the caps. The 1,500 cap includes reasoning, so usable explanation text may be shorter; truncation/refusal/counting failure yields incomplete. No paid model calls were needed for unit tests. Model credentials and selected model are deployment inputs, never browser-exposed.

Public Discover remains guest-accessible. Before enabling paid analysis on a public deployment, configure infrastructure-level rate limits and abuse controls; no distributed limiter or account quotas are implemented here. The protected portfolio endpoints require a trusted server-side client and are not wired into a signed-in browser workflow.

## Scenario methodology: joint-moving-block-v1

Selected research candidate: shared 30-day circular moving blocks of aligned daily log returns, with up to the last three years of history, 256 deterministic seeded paths, and 365-day years. Fixed asset quantities, no rebalancing or future contributions. Each path shares block indices across assets. Sum portfolio values within each path, then calculate modeled p10/p50/p90 values; never sum individual asset downside quantiles into a portfolio percentile. Compare changes with today's baseline, never original cost.

Data must have positive finite closes, contiguous UTC dates, matching asset calendars, at most five assets and fresh last observations. No filling gaps or silently shortening unequal histories. The provider API attempts up to 3,650 days; plan restrictions and insufficient history produce unavailable results.

Every horizon separately needs 730 training returns plus its full holdout and 19 further origins at 30-day spacing. Twenty rolling-origin holdouts train strictly before each target. Holdouts overlap: coverage is descriptive and not independent statistical calibration. The provisional engineering gate requires at least 70% coverage of the p10–p90 interval and median log-value MAE no more than 105% of a no-change baseline, **separately for every asset and the joint portfolio**. Each series has independent diagnostics; any failing series withholds the whole horizon. These thresholds are chosen for testing, not externally validated financial acceptance criteria. Overflow and invalid history fail closed.

`SCENARIO_RELEASE_ENABLED=false` keeps **all** API estimates null even when historical engineering gates pass. Evaluations return diagnostics. Real, licensed, dated datasets, stress/benchmark review, calibration assessment, survivorship/delisting treatment and accepted release criteria are still needed before changing that flag. Enabling the flag alone cannot release estimates: `SCENARIO_REVIEW_REPORT_PATH` must also record reviewer identity/reference, live calibration/stress/source review and approved horizons for the exact methodology and dataset SHA-256. Updating any price/date or asset ordering invalidates that approval. The existing next-candle classifier is never used for multi-year values. Tests include joint-path aggregation, insufficient/gapped data, an unseen-regime failure, independent asset gates, and constant-price controls through all three horizons; synthetic controls do not establish crypto forecast accuracy.

## Validation and primary references

Run `npx vitest run test/unit/finance.test.ts test/unit/allocation-calculation.test.ts test/unit/specialist.test.ts test/unit/portfolio-api.test.ts test/unit/scenarios.test.ts`, `npx tsc --noEmit --incremental false`, and the full suite/build before committing. Existing browser tests cover Discover form/result/edit/save behavior and Markets search/monitor navigation.

- [OpenAI token counting](https://developers.openai.com/api/docs/guides/token-counting) and [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs): preflight and schema contracts.
- [CoinGecko USD markets](https://docs.coingecko.com/reference/coins-markets): source adapter fields. Access history is plan-dependent.
- [Forecasting: Principles and Practice](https://otexts.com/fpp3/toolbox.html#sec-tscv): time-ordered validation and benchmark methods. The book does not endorse this crypto model or these thresholds.
- [Politis and Romano, The Stationary Bootstrap](https://www.tandfonline.com/doi/abs/10.1080/01621459.1994.10476870): background on dependent-series resampling. The implemented fixed circular blocks differ from its random-length stationary bootstrap; block length and path count are application choices.


## Live evaluation workflow and outstanding empirical work

`npm run eval:specialist` is an explicitly opted-in live experiment, excluded from ordinary tests. Supply `RUN_LIVE_EVALUATION=1`, provider credentials/model, `SPECIALIST_EVAL_CASES_PATH` and `SPECIALIST_EVAL_OUTPUT_PATH`. The case bundle is `{cases:[{id,assetIds,calculated,evidence,rubric}]}` with all IDs from `EVALUATION_CASES` in `lib/analysis/evaluation.ts`. Use dated real evidence and adversarial cases from the skill pack. Each case runs one skill-enabled and one generic response under the same per-analysis token caps; fourteen cases therefore make 28 separately capped generation calls and may incur charges. There are no automatic repair calls.

The runner records actual responses, usage, source-reference checks, model and skill fingerprint to an artifact marked `requires_human_review`. It never grants release approval. A reviewer checks source support, identity, numerical agreement, missing-data behavior, injection resistance, contradictory news and economic reasoning against each rubric. A deployment report has `{model,skillSha256,provenance:"live-model-human-reviewed",approvedBy,reviewedAt,cases:[{id,structurallyValid,responseId,baselineResponseId,criticalFailures,specialistScore,baselineScore}]}`. Preserve the raw runs alongside the reviewed report. Fixture receipts exist only in tests and do not establish live specialization.

A real CoinGecko 3,650-day Bitcoin request was attempted on 20 October 2026 and returned HTTP 401 without an authorized historical-data plan. Consequently no real-history projection calibration or live-model comparison has completed in this session. Both release gates remain closed by default. The implementation and synthetic-control tests are complete engineering artifacts; empirical forecasting and model-quality acceptance remain outstanding deployment work, not proven results.
