# Product

<!-- impeccable:product-schema 1 -->

This record captures the redesign decisions confirmed with the user on 20 October 2026. It describes the intended product; planned capabilities must not be represented as already implemented. Detailed interview history is in [the redesign brief](docs/REDESIGN_BRIEF.md).

## Platform

web

## Users

The primary user is a crypto-curious beginner who understands basic prices and needs help selecting assets, interpreting forecasts, and understanding investment risk. Guests can explore and generate allocation suggestions; signed-in users additionally manage recorded investments and account preferences.

The creator also intends to demonstrate useful, dependable full-stack product engineering in a portfolio. Technical implementation explanations should support that evidence without dominating the beginner's task.

## Product Purpose

Help users turn an investment budget and stated preferences into an understandable, evidence-backed allocation proposal, then separately review investments they have actually recorded. Success means users can understand the suggested distribution, its reasons and risks, and the distinction between current value, historical gains, and future scenarios.

As of 22 October 2026, separate Crypto and Stocks tabs show activity-ranked top-ten lists with search and small charts; Stocks supports US and Singapore filters. Experimental Discover accepts crypto, stocks, or both. Free public stock adapters may be delayed or unavailable; coverage and validation limits are documented in docs/STOCKS_IMPLEMENTATION.md. Stock trading, forecasts and accounts are not implied by this addition.

## Positioning

A form-based allocation and investment-research experience with specialist crypto analysis behind the interface. It combines sourced research, explicit portfolio rules, and inspectable explanations without a chatbot or conversational follow-ups. This is the chosen mechanism, not a claim of unique technology, predictive superiority, or proven investment returns.

## Operating Context

- **Discover:** users enter a budget, preferences, and the agreed investment-profile answers, then generate an allocation. They edit the form to refine results.
- **Markets:** users browse assets and inspect details, relevant news, and explanations.
- **Watchlist:** users follow assets. Guests can retain proposals/watchlists on their device.
- **Invested:** signed-in users separately record multiple coins, current values, and multiple purchases per coin. They inspect purchase-level gains, forward scenarios, per-coin risk, and overall portfolio risk.
- **Account settings:** optional sign-in is part of the first redesign. Guests use USD; signed-in users can change currency through Settings in a profile-circle menu.
- Allocation suggestions never imply ownership or automatically populate recorded investments. Purchases are recorded in Invested, not confirmed as part of generating a suggestion.

## Capabilities and Constraints

### Allocation and investment profile

- Completed proposals allocate 100% of the budget across recommended assets, with dollar amounts, percentages, reasons, evidence, and risks. Normally show 3–5 assets, subject to budget and eligibility.
- Use the five confirmed radio-button question groups: investment horizon, effect of loss on essential expenses/emergency savings, response to a hypothetical decline, investment experience, and existing investment categories. Preserve the exact approved options in [the profile specification](docs/RISK_PROFILE_PROPOSAL.md). These are not a validated scoring algorithm.
- Additional preferences may be supplied through a concise textbox; exact interpretation and precedence remain open.
- Validate missing inputs in the form. Show an explicit data-unavailable result rather than inventing an allocation. Handling profiles with no supported strategy remains open.
- A defined allocation engine owns eligibility constraints, weights, monetary arithmetic, and rounding. Specialist AI supplies sourced research and explanations. See [the allocation decision](docs/adr/0001-form-based-allocation.md).

### Invested and performance

- Support multiple assets and multiple purchase records for each asset. Record purchase date, quantity, and total cost. Support a current-value baseline where purchase history is unavailable, without inventing historical profit.
- Show current value and 1-, 3-, and 5-year estimated values, with signed projected changes from today's baseline. Explain downside/base/upside scenarios, assumptions, and limitations in deeper detail.
- Preserve purchase-level and combined gains when users add to an older position. Added capital is not investment gain. Keep gain versus cost, cash-flow-adjusted historical performance, and forward projected change distinct.
- Review risk at both asset and portfolio levels. Suggested changes remain proposals; the product executes no purchases, sales, or transfers. Paper trading and exchange imports are not part of the agreed initial scope.
- Update market values separately from deeper research. Refresh projections/risk when investments change or users request Refresh analysis; show analysis timestamps. Automated alert delivery is not approved.

### Analysis quality and operating budget

- Require specialist knowledge of crypto fundamentals, tokenomics, liquidity, market structure, technical analysis, and news interpretation. Relevant observations and claims need traceable sources and timestamps.
- The [draft application-agent skill](docs/agent-skills/crypto-analysis/SKILL.md) defines research and evaluation requirements; it is not yet connected to the runtime and does not establish predictive accuracy.
- Cap cumulative AI usage at 15,000 tokens per analysis, including research, reasoning, outputs, and retries. Cap the final explanation at 1,500 tokens. Reuse appropriate cached evidence; mark exhausted analyses incomplete.
- The existing short-horizon UP/DOWN model does not establish credible multi-year projections. Numerical outputs require an implemented and evaluated methodology; absent estimates stay unavailable.

### Open product decisions

Data/model providers; profile interpretation and unsupported-profile policy; eligible coin coverage; allocation/risk rules; scenario methodology and calibration; supported currencies and FX semantics; auth/storage implementation; sales/fees/transfers accounting; retention and synchronization; research evaluation thresholds; detailed responsive behavior; stock-support scope and timing.

## Brand Commitments

The existing working name is Crypto Prediction Dashboard; a final rename has not been agreed. The user requires a calm, eye-pleasing interface with neutral colors and concise, clear explanations. Treat these volunteered constraints as binding; visual-system decisions are separate from this product record.

During Discover shaping, the user deliberately chose a familiar investing-app direction over expressive alternatives. Embrace conventional investing-product patterns at a high craft level; specific reference products are pending confirmation.

## Evidence on Hand

- Existing Next.js/React web app, FastAPI backend, Binance ingestion, news integration, and NumPy baseline training/inference code. Current source behavior is reviewed in [the project overview](docs/PROJECT_OVERVIEW_AND_PORTFOLIO_PLAN.md).
- [First-party platform research](docs/research/FORM_TO_ALLOCATION_RESEARCH.md) supports the questionnaire/profile/allocation pattern. It does not reproduce proprietary scores or validate this app's coin recommendations.
- [Return-accounting notes](docs/research/INVESTMENT_RETURN_SEMANTICS.md) distinguish contributions, gains, and performance measures.
- [Invested layout exploration](docs/mockups/invested-purchase-history.html) uses hypothetical records. The user chose Expandable rows as the first direction to try, not a final visual lock. It contains no live projections or measured risk analysis.
- No validated multi-year forecast accuracy, portfolio outperformance, customer testimonials, or launched account/portfolio features have been established. Future copy must not fabricate them.

## Product Principles

1. Complete a clear form-based task; expose depth when it helps the user's decision.
2. Separate suggested allocations, recorded investments, observed performance, and future scenarios.
3. Make evidence, data age, uncertainty, and unavailable results inspectable.
4. Keep calculations and constraints reproducible; evaluate specialist analysis rather than assuming expertise from a prompt.
5. Preserve low-friction guest access while giving signed-in users durable investment and preference workflows.
