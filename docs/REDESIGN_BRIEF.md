# Product redesign brief

Status: discovery in progress. Updated 20 October 2026.

This document records the user's redesign decisions. The earlier project review describes the existing implementation and recommendations; it is not an approved redesign specification. Application implementation will follow confirmation of shared understanding at the end of the interview.

## Confirmed decisions

- Redesign both functionality and UI; the user finds the current MVP messy and difficult to use.
- Primary audience: crypto-curious beginners who understand basic prices and need help interpreting charts and forecasts.
- Start with cryptocurrency support. The product should leave room for stock features in the future; stocks are not requested as an immediate implementation deliverable.
- Portfolio emphasis: a useful, dependable full-stack product, with transparent experimental ML as a distinctive feature.
- Desired capabilities include market understanding, guided learning, forecast exploration, and AI-assisted asset selection. Their priority and entry journey are not settled by including all four.
- The AI should help users choose cryptocurrencies to explore. Future stock support should also include predictions and a way to choose between the supported markets; the exact selection behavior remains open.
- The redesign includes research and monitoring; transaction execution and paper trading are outside the agreed scope. The user subsequently added signed-in saving and investment-risk/reallocation review, superseding the earlier exclusion of investment tracking. Whether reviewed investments represent confirmed real holdings or merely saved proposals remains open.
- AI-assisted selection includes explained candidates based on stated interests and preferences. Suggestions should explain fit, trade-offs, and what to investigate; users can compare candidates and save assets to a watchlist. Forecasts provide supporting evidence rather than determining a ranking of likely winners. There is no conversational follow-up.
- Scope revision: the user explicitly wants a request such as “I want to invest $1,000” to produce analysis and recommendations of cryptocurrencies to get, with stock recommendations in a future expansion. This supersedes the earlier research-shortlist-only boundary. Transaction execution remains outside scope.
- Allocation output: show dollar amounts and percentages per recommended asset, with reasons and risks. The user requires every completed proposal to allocate 100% of the entered budget across recommended assets, with no unallocated remainder. This rejects the proposed option of leaving funds unallocated. Concentration limits, currency, rounding, and behavior when information or a suitable candidate set is unavailable remain open.
- Forecasts should communicate directional probability over a defined period, uncertainty, and measured historical performance, separately from asset recommendations. Forecast horizons and evaluation requirements remain open.
- New users start on Discover, now centered on a form-to-allocation workflow rather than chat prompts. Markets and My Watchlist provide separate browsing and saved-asset journeys; returning users should be able to resume saved research quickly.
- Personalization uses a concise form for budget, expectations, and the agreed investment-profile questions. Explain which preferences affected suggestions. Users can edit inputs and regenerate a result; conversational refinement is explicitly excluded. General browsing remains available without completing a recommendation profile.
- The user requires a specialized market-research AI rather than generic answers. Specific research tools, evidence requirements, selection rules, and quality acceptance criteria remain to be agreed.
- Confirmed research standard: screen supported assets using liquidity, volume, volatility, trend, and relevant news; apply user preferences through explicit selection criteria; explain candidate fit and risks with sources; show data timestamps; distinguish observations from forecasts; acknowledge insufficient evidence. Start with a small, well-supported asset universe and verify quality before expanding.
- The agent itself must demonstrate in-depth domain understanding. The intended crypto expertise includes market structure, liquidity, tokenomics, project fundamentals, technical analysis, and news interpretation. These are capability requirements to validate, not claims that the current application implements them. Detailed research tools and evaluation cases remain open. Future stock support will require its own domain-specific research capabilities.
- Interview communication should be short and precise.
- Risk-profile inputs use radio buttons with familiar, plain-language options informed by established investing-platform questionnaire factors. Wording and decision status are recorded in `RISK_PROFILE_PROPOSAL.md`.
- The five questions and options in `RISK_PROFILE_PROPOSAL.md` are approved as a short profile before budget-based recommendations. Users can browse without completing the profile. Answers have no preselected defaults; the hypothetical loss example scales with budget and is not a maximum-loss estimate. Scoring, answer-dependent constraints, and handling of uncertainty remain undecided.
- Interaction requirement: no chatbot and no follow-up conversation. The user fills expectations and investment amount, then receives the asset allocation list. Missing inputs use inline validation; unavailable data produces an explicit error instead of a fabricated allocation.
- Platform research completed in `research/FORM_TO_ALLOCATION_RESEARCH.md`, with supplemental Wealthfront/StashAway notes. The user approved the researched pattern: structured form → assessed profile → constrained allocation → result. Specialist AI handles sourced research and explanations; a defined allocation engine calculates weights and dollar amounts. Exact profile rules and portfolio construction remain open; competitor scoring formulas and authenticated screens were not reproduced. See `adr/0001-form-based-allocation.md`.
- Results normally contain 3–5 assets, depending on budget and eligibility, with expandable analysis for each. This is a presentation target, not a claim that a small crypto basket meets a given diversification objective.
- No sign-in is required to generate an allocation. Guests can save proposals and watchlists on the current device. Optional accounts are now included in the first redesigned release, superseding their earlier deferral; cross-device proposal syncing has not been specified.
- Currency requirement: guests use USD by default. Currency can be changed only in Settings after sign-in. Supported currencies, conversion semantics, and exchange-rate freshness remain open.
- Signed-in users can save their investment allocations and review what is at risk or could be moved. Investment tracking/review is gated by sign-in. Real holdings versus saved proposals, confirmation of purchases, valuation/cost basis, review triggers, alert delivery, and reallocation semantics remain open. No trade execution is authorized.
- Journey clarification: prediction/allocation output is a suggestion only. Investment recording and review belong in a separate signed-in **Invested** tab, rather than a purchase-confirmation step on the prediction result. Do not infer ownership or populate holdings from a generated suggestion. The Invested tab's data-entry/import method remains open. Use Invested as the tab name; My Investments was an unaccepted proposal.
- Invested input direction: a searchable coin dropdown and amount allocated. The user requests growth analysis over 1, 3, and 5 years, plus risk analysis. “All coins” catalog coverage and eligibility for analysis remain open. Purchase price/date were proposed earlier but not accepted as required inputs.
- Invested is a multi-coin list: users can add multiple coins and enter a current value for each. The user confirmed that amount means current value today. Show 1-, 3-, and 5-year growth analysis and signed percentage changes; interpret these as projected changes from the entered current-value baseline, not realized historical gains/losses. Actual cost-basis tracking is not established by these inputs.
- Layout requirement: one row per asset with aligned Coin / Current value / 1 year / 3 years / 5 years columns. The user explicitly requested the Current column before 1 year and approved a combined portfolio total row beneath asset rows, showing total current value and combined 1/3/5-year projections. Risk review occupies a separate full-width section below the projection table and totals. Detailed scenario presentation and responsive layout remain open. Combined scenarios require joint portfolio methodology rather than an assumption that individual downside percentiles can simply be added.
- Layout refinement: each coin's projection content has its own Coin Risk Review, followed after all coin entries by Portfolio total and a separate total/portfolio Risk Review. Proposed interpretation: each coin risk review sits beneath that coin's aligned projection row; overall risk sits beneath combined totals. The user prefers calm, eye-pleasing neutral colors instead of prominent blue/teal accents.
- Navigation confirmed: Discover, Markets, Watchlist, and signed-in Invested. News and explanations appear contextually in asset details/results. Settings are accessed through a profile-circle menu.
- Performance requirement: the user wants to understand old purchases that are profitable followed by additional purchases. Contributions must not count as investment gains; distinguish cost-based gain, cash-flow-adjusted historical performance, and projected change from today's baseline.
- Multiple purchase records per coin are approved: record purchase date, quantity, and total cost. Current-value-only entries can still support projections but cannot establish historical gain/loss. Current question: visually present a grouped coin summary with purchase-level detail while preserving per-coin and portfolio risk sections. The illustrative mockup is a design proposal, not a production implementation or actual market analysis.
- Visual proposal: `mockups/invested-purchase-history.html` compares Expandable rows with Coin sections. Both group purchases by coin, expose per-purchase cost/value/gain, preserve per-coin risk and portfolio-level risk, and demonstrate adding a purchase with hypothetical data. Multi-year estimates and measured risk are unavailable in the preview rather than invented. Layout selection remains open. JavaScript interaction checks passed using JSDOM; a real-browser visual check was unavailable because no browser surface was enabled.
- Layout trial selected: use Expandable rows first, with one coin summary and expandable purchase history beneath it. The user wants to try this direction; it is not a final design lock. Preserve aligned Current / 1 year / 3 years / 5 years columns, per-coin risk reviews, combined totals, and overall risk review.
- Projection presentation confirmed: each year column shows a central estimated value and signed change from today's value; expanded details show downside/base/upside scenarios, assumptions, and data limitations. Numerical methodology and calibration remain open.
- Refresh behavior confirmed: market-value updates are separate from deeper analysis. Refresh projections/risk when investments change or the user selects Refresh analysis. Display the analysis generation time. Automated alerts/background deep-analysis schedules are not approved.
- AI budget confirmed: 15,000 cumulative tokens per analysis across research, reasoning, outputs, and retries, with a 1,500-token final-explanation cap. Reuse appropriate cached evidence; return incomplete when the budget is exhausted. Keep caps configurable and assess research quality/cost. Interview replies remain concise.
- Specialized skill requirement confirmed: equip the application agent with domain-specific research/analysis instructions and checks. Draft application-agent skill pack: `agent-skills/crypto-analysis/SKILL.md`, with calculation, projection, and evaluation references. It is a reviewable specification, not installed or wired runtime behavior, model training, or evidence that accuracy targets have been met. Use lazy branch loading to respect the token budget.
- Discover flow confirmed during Impeccable shape: one grouped form containing amount, preferences, and all five profile questions; successful analysis opens a dedicated results view with an Edit inputs action. No conversational follow-ups or multi-screen questionnaire wizard.
- Discover visual direction chosen through Impeccable's decision page: Familiar investing app (category standard), code-led. Reference sketch: `.impeccable/mocks/decision/canon.html`; preserve its familiar left app navigation, grouped form, right request summary, neutral palette, and readable density while implementing the responsive full flow later. The user is being asked for two or three comparator products to set the craft bar before finalizing the shape brief. No direction contract or application code has been written.
- Proposed Invested output: explicitly forward-looking scenario ranges with assumptions and risk evidence, rather than invented fixed future returns. The existing 15-minute directional model does not implement multi-year valuation projections; a separate validated methodology and data-sufficiency policy would be required. This is a proposal awaiting agreement.
- Expectations derive from user-selected preferences/settings. The user proposed an optional textbox for more detailed wishes and requested a recommendation. Proposed behavior: a non-chat Additional preferences field whose interpreted constraints are reflected in results, with ambiguous/conflicting requests handled in the form rather than through conversation. Exact interpretation and precedence are not yet agreed.

## Open decision tree

- Audience and portfolio emphasis: settled.
  - Primary user task and observable success: open.
    - Entry journey: Discover first, with Markets and My Watchlist, settled; detailed navigation remains open.
    - Role of forecasts, explanations, and news: pending primary task.
    - First-release feature scope: pending journey and priorities.
  - Product boundary: research, monitoring, and signed-in allocation saving/risk review, without transaction execution: settled. Holdings representation and tracking workflow remain open.
  - Meaning of AI-assisted selection: budget-aware investment recommendations requested, superseding research-shortlist-only scope.
    - Dollar amounts per recommended asset: settled.
    - Completed proposals allocate the entire budget across recommended assets: settled.
    - Guest USD default and signed-in-only currency settings: settled.
    - Investor constraints, allocation limits, supported currencies/FX behavior, rounding, and insufficient-information behavior: open.
    - Optional input approach and research evidence standard: settled.
    - No-chat form-to-results interaction: settled.
    - Profile-to-allocation pattern, inline missing-input validation, and explicit data-unavailable errors: settled.
    - Detailed selection rules, tools, unsupported-profile policy, and expertise evaluation: open.
  - Future stock support: desired; specific scope and timing remain open.
- Saved state: device-local guest proposals/watchlists and optional accounts in the first release, settled. Signed-in saved investment allocations/risk review are requested. Holdings representation, sync scope, retention, clear-data controls, and exact persistence behavior remain open.
- Invested is a separate signed-in, multi-coin current-value list with 1/3/5-year analysis, signed projected percentage changes, and risk review below the projections. Catalog coverage, calculation methodology, refresh behavior, and review behavior remain open.
- Budget-aware recommendation intake: five radio questions and options confirmed, required before budget-based recommendations; interpretation and handling of missing/conflicting answers remain open.
- Forecast meaning, horizon, availability, and displayed evidence: open.
- Visual direction and responsive behavior: open.
- Acceptance criteria and delivery sequence: open.

## Current implementation facts relevant to discovery

These are source observations, not a rendered UX audit or user research findings.

- The overview lists a fixed set of coins under the label Watchlist; users cannot add or remove personal favorites.
- The monitor combines chart range, selected-candle inspection, and a separate fixed 15-minute forecast horizon.
- Current educational content mostly explains the implementation rather than helping beginners interpret market information.
- Model and stream status exist in data/hooks but are not prominently displayed beside forecasts.
- Accounts, personal holdings, trading, and saved user preferences are not implemented in the inspected flows.

Sources: `components/dashboard/dashboard-client.tsx`, `components/dashboard/watchlist-table.tsx`, `components/dashboard/candlestick-chart-panel.tsx`, `components/dashboard/dashboard-home-sections.tsx`, `hooks/use-market-dashboard.ts`, and `backend/app/main.py`.

## Decision capture

Add confirmed answers here as the interview progresses. Create glossary entries when domain terms are agreed. Record ADRs only for decisions involving meaningful reversal cost, non-obvious context, and a real trade-off.
