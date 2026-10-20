# Form-to-allocation product research

Researched 20 October 2026. Sources are first-party public product pages, help articles, and a public questionnaire. This is documented-flow research, not a signed-in UI audit: no accounts were created, private onboarding screens inspected, or transactions performed. Exact scoring, live holdings, and suitability policies cannot be inferred where providers do not publish them.

## User requirements

- Beginner-oriented crypto experience, with stocks in a future release.
- A specialist AI performs research behind the interface.
- Users enter their budget, expectations, and investment-profile answers in a form.
- No chatbot or conversational follow-ups.
- Results list recommended assets, dollar allocations, percentages, evidence, and risks.
- Completed proposals allocate 100% of the budget.
- No trading execution in this release.

## Main finding

The closest documented pattern is **structured questionnaire → investor profile → portfolio construction → allocation preview**. A second pattern is **choose a predefined strategy/bundle → distribute the amount according to its weights**. These are different levels of personalization.

For this project, adapt the first pattern for inputs and profile matching, the bundle pattern for a clear allocation presentation, and use the specialized AI for evidence gathering and explanations. This hybrid is our proposed design; the sources do not establish that those platforms use LLMs or our intended allocation rules.

## Platform comparisons

### Wealthfront: assessed profile mapped to portfolio weights

Wealthfront's March 2026 explanation describes inputs including age, financial capacity, and risk tolerance, producing a risk score from 0.5 to 10. Portfolio sets map those scores to allocations across 5–8 asset classes, with account/tax considerations also affecting selection. Its questionnaire methodology documents checks for inconsistent subjective answers and a more cautious score when those answers conflict. Exact scoring and current authenticated input validation were not verified.

Adapt: a reproducible profile-to-allocation mapping, separate capacity/tolerance inputs, and consistent treatment of conflicting answers. Its diversified asset-class approach does not establish a coin-level allocation strategy for our app.

Sources: [Wealthfront risk-score explanation](https://www.wealthfront.com/blog/ask-wealthfront-risk-score-explainer/), [questionnaire methodology](https://support.wealthfront.com/hc/en-us/articles/209353586-How-did-you-create-the-questionnaire-to-determine-my-risk-score).

### StashAway: financial assessment and managed risk levels

StashAway's current General Investing page documents pre-made ETF portfolios, a selectable risk level, and portfolio monitoring/updates. Its account-opening agreement describes financial objectives, capacity, commitments, existing exposure, and experience as assessment information and permits restrictions or further steps where information/experience is insufficient. This is evidence for structured assessment, not a verified current sequence of onboarding screens.

Adapt: explicit profile/strategy selection and readable portfolio composition. The older published StashAway Risk Index methodology is useful context, but should not be treated as proof of today's exact questionnaire or copied into crypto risk scoring.

Sources: [StashAway General Investing](https://www.stashaway.sg/general-investing), [account-opening agreement, section 4](https://www.stashaway.sg/document/AWP_Account_Opening_Document_2025.pdf). See [detailed notes](allocation-platforms-notes.md) for source limitations.

### Schwab: public questionnaire to a target investment plan

The public Investor Profile Questionnaire asks seven questions covering withdrawal timing/duration, investment knowledge, willingness to take financial risk, investment history, response to a hypothetical market decline, and acceptable hypothetical annual outcome ranges. It explicitly describes producing a target investment plan based on the profile. This is direct evidence for a structured, non-conversational input flow.

Adapt: short single-choice questions, concrete downside scenarios, and an explicit relationship between answers and a target allocation. Do not transplant the stock-market hypothetical return ranges into crypto forecasts or claim that our five-question form reproduces Schwab's scoring.

Sources: [Schwab questionnaire](https://hgtoolsweb.schwab.com/pcu/mp/riskProfileQuestionnaire.action), [Schwab risk tolerance versus capacity](https://www.schwab.com/learn/story/how-to-determine-your-risk-tolerance-level).

### Syfe: portfolio type, questions, then explore a plan

Syfe's Core Growth page documents a flow of selecting a portfolio type, answering questions to personalize it, exploring the portfolio and finalizing an investment plan, then creating an account. Its Core portfolios use stock, bond, and gold ETFs; the page describes an asset-class risk-budgeting approach and portfolio types suited to different goals, horizons, and risk appetites.

Adapt: an explorable result with portfolio composition and methodology before making the user commit to account creation. It is a diversified portfolio example, not evidence that individual stocks or coins can be selected using the same risk classifications.

The extracted page contains inconsistent/repeated composition blocks and apparent template content. Do not reuse its extracted numeric weights, performance figures, or projections as reliable product evidence. Its documented process and stated portfolio-construction approach are the relevant findings here.

Source: [Syfe Core Growth](https://www.syfe.com/core/core-growth).

### SwissBorg: profile assessment before crypto portfolio selection

The current Managed Portfolio product page documents a quick Investor Profile Assessment before portfolio selection. It identifies Conservative, Moderate, and Growth investor profiles, currently offers a Growth-oriented managed portfolio, and advises Conservative/Moderate profiles to avoid Managed Portfolios. Its FAQ describes dynamic allocation with investment-team review and includes crypto assets and stablecoins.

Adapt: assess the profile before selecting a strategy, make methodology and composition visible, and distinguish a supported recommendation from a profile that the strategy cannot serve. A short form can lead to an unsupported result without a chat conversation.

Do not label a crypto allocation low-risk simply because a questionnaire classified its user as conservative. Do not copy capital-protection language from marketing into this project's claims. The source describes professional management, not an autonomous LLM allocation system.

An older blog describes a different set of portfolio options. Prefer the current product page for current offering claims; the discrepancy prevents treating the older article as a definitive current product list. Neither source reveals a scoring algorithm we can reproduce exactly.

Sources: [current Managed Portfolio page](https://swissborg.com/managed-portfolio-crypto), [earlier portfolio article](https://swissborg.com/blog/managed-portfolios).

### Kraken: predefined bundles and transparent weights

Kraken describes bundles as predefined collections of 2–10 assets grouped by theme, each with a fixed allocation strategy. Users choose a bundle and an investment amount; funds are distributed according to the bundle's weights. Its public page shows compositions and explains periodic rebalancing. It also describes crypto/equity combination bundles, with market/geographic differences.

Adapt: a readable asset list, visible percentages, a clear total, and a concise description of the allocation strategy. This directly fits the requested allocation-results presentation.

A fixed bundle is not an individualized recommendation generated from an investor questionnaire. Copying its interface alone would not satisfy the specialized, preference-aware research requirement. Rebalancing and real purchases remain outside this project's current scope. Future stock support must distinguish conventional equities from tokenized stock exposure rather than treating all products as equivalent.

Source: [Kraken Bundles](https://www.kraken.com/features/bundles).

### Vanguard: useful questionnaire factors and a narrower output scope

Vanguard documents objectives, experience, time horizon, risk tolerance, and financial situation as questionnaire inputs. Its questionnaire suggests one of nine allocations across broad investment classes; it does not claim comprehensive individual-security recommendations.

Adapt the input factors and clear scope explanation. Our coin-level allocation requires additional screening and validation beyond borrowing those factors.

Source: [Vanguard investor questionnaire](https://investor.vanguard.com/tools-calculators/investor-questionnaire).

Additional Wealthfront/StashAway findings are recorded separately in [allocation-platforms-notes.md](allocation-platforms-notes.md).

## Recommended product flow

The user approved the overall form/profile/allocation/results pattern, separate research/allocation responsibilities, inline validation, and data-error behavior on 20 October 2026. Detailed choices below remain proposals unless recorded as confirmed in the redesign brief. Nothing is implemented yet.

### 1. Discover: a concise form

Start with **Build an allocation**, using an amount field and explicit currency. Show Crypto as the currently supported market. Add Stocks and a combined-market option when those capabilities actually exist, rather than presenting them as working today.

Use the five agreed radio groups: horizon, effect on essential expenses/emergency savings, response to a decline, experience, and existing investment categories. Add a concise expectations/objective field with concrete choices once its meaning is agreed. Avoid promising a user-entered target return.

Validate required answers, allowed values, amount limits, and contradictions in the form. Explain errors beside the relevant fields. An Unsure answer is information, not permission to assume a high risk tolerance. The approved existing-holdings category question does not provide enough detail to measure concentration in the user's total portfolio.

### 2. Submit once

Use a clear action such as **Generate allocation**. Show factual progress states such as checking data, researching eligible assets, and calculating allocations. Do not show simulated research steps or a chat transcript.

Users can edit the original form and rerun. That replaces the previously discussed conversational refinement.

### 3. Research and construct the allocation behind the interface

Proposed responsibilities:

| Component | Responsibility |
| --- | --- |
| Profile rules | Interpret form answers and identify constraints/unsupported combinations. Use versioned, testable rules rather than inventing a validated risk score. |
| Eligible asset screen | Enforce supported market, fresh data, usable liquidity/history, asset exclusions, and domain-specific requirements. |
| Research agent | Gather sourced fundamentals, liquidity/trend evidence, news, and risks; produce structured findings for eligible candidates. Record evidence timestamps and uncertainty. |
| Allocation engine | Turn supported inputs and eligible candidates into bounded weights under a documented strategy, with explicit concentration and asset-count limits. |
| Amount calculator | Convert weights to currency amounts deterministically, reconcile rounding in integer minor units, and verify exact totals. |
| Explanation agent | Explain the actual computed result using the recorded evidence; it cannot silently change weights or invent performance. |

These are logical responsibilities, not a requirement for multiple AI agents, multiple services, or an immediate infrastructure choice. A single application can implement them behind one request workflow.

The allocation strategy itself still needs a decision: predefined profile-based templates, a constrained data-driven optimizer, or a combination. The public sources support these broad product patterns, not one universal scoring formula. Initial implementation should favor a small, documented, reproducible strategy over unconstrained LLM-generated weights. This is an engineering recommendation, not a claim that the method is financially validated.

### 4. Show the allocation result

The first view should provide:

- Entered amount/currency, summarized preferences, data-as-of time, and proposal timestamp.
- A list or table containing asset name, allocation percentage, dollar amount, and a short reason.
- A total of exactly 100% and exactly the entered budget for every completed plan.
- Expandable evidence, key risks, portfolio concentration, and methodology.
- Edit inputs, view asset details, and save the proposal/watchlist actions, subject to the later saved-state decision.

Keep explanations short initially, with depth available on demand. A chart is secondary to the actionable allocation table. Label output as a proposal; do not represent it as owned holdings.

### 5. Non-conversational result states

The user's full-allocation requirement applies to completed proposals. The research does not support asserting that every possible profile can receive a suitable all-crypto allocation.

Proposed states, requiring product confirmation:

- Invalid/incomplete form: highlight fields before submission.
- Data unavailable: show a retryable error with no fabricated current result.
- No supported strategy for the submitted profile: explain the mismatch on the result page and allow editing the form, without chat follow-ups.
- Successful proposal: allocate the complete budget, with no cash remainder.

These states preserve a form-to-results interaction. They do not require a conversational assistant. Unsupported behavior remains a design decision, not something to hide behind a fallback allocation.

## How this changes the current app

1. Make Discover's primary interaction a form rather than a watchlist table or chat window.
2. Add a dedicated allocation result view; retain Markets for browsing and My Watchlist for saved assets.
3. Introduce profile interpretation, candidate screening, allocation logic, and sourced research. None is established by the current next-candle classifier.
4. Keep the current 15-minute UP/DOWN model separate from investment-horizon portfolio allocation. Align and validate its forecast contract before showing historical forecast quality. It cannot be presented as evidence for a multi-year allocation without additional validation.
5. Support crypto and stocks through separate asset-specific research and eligibility rules. A future combined option also requires cross-market allocation logic, exchange calendars, currency handling, and risk comparisons.
6. Retain the previously identified data freshness, reconnect, prediction correctness, and persistence fixes as prerequisites for dependable evidence.

## Acceptance criteria to propose

- There is no message composer, chat transcript, or conversational follow-up in the allocation journey.
- Identical profile inputs, data snapshot, and strategy version reproduce the same eligible set and weights when using the initial deterministic strategy.
- Every completed allocation sums to the entered amount to its currency precision and to 100% at displayed precision.
- Each selected asset has current-enough evidence, a selection reason, a risk explanation, and source timestamps.
- Research and explanation text cannot introduce an asset or weight absent from the validated allocation result.
- Invalid forms, stale data, conflicting answers, and no eligible candidates have explicit, testable outcomes.
- Long-horizon recommendations do not silently rely on an unvalidated 15-minute prediction model.

## Remaining decisions

Confirm the proposed form/profile/allocation/result method first. Then settle objective choices, supported currency and budget range, asset-count/concentration bounds, unsupported-profile behavior, strategy construction, data sources, forecasting horizons, saved-state behavior, and visual direction. These choices are not answered by copying a platform's questionnaire.
