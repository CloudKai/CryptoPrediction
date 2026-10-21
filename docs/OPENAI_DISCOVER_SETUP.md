# OpenAI setup for Discover

## Working Discover AI mode

Discover can now select crypto and/or stocks and propose percentages from fresh evidence rather than requiring a manually configured basket. Enable explicitly in private `.env.local`:

```dotenv
SPECIALIST_ANALYSIS_ENABLED=true
DISCOVER_AI_RECOMMENDATIONS_ENABLED=true
OPENAI_API_KEY=
CRYPTO_ANALYSIS_MODEL=gpt-5.4
COINGECKO_DEMO_API_KEY=
```

Keep existing keys; do not replace them with blanks. Restart Next.js after configuration changes. `npm run check:analysis` recognizes this mode. It does not require a fixed strategy or claim completed specialist evaluation. Results identify themselves as experimental AI proposals. The reviewed strategy path below remains available when this flag is false; Invested specialist review retains its evaluation requirement.

Crypto research retrieves CoinGecko USD snapshots, completed daily history and project documentation, plus optional NewsData reports. In experimental Discover, documentation is supplementary: an unavailable, redirected or unreadable page is omitted, its absence is passed to the model, and a server-owned limitation names the affected projects. Prices and completed daily history remain mandatory. Documentation stays mandatory for the reviewed specialist path. Independent history, documentation and news requests run concurrently to leave time for OpenAI. Calculated evidence includes provider 24h change, completed 7/30-day changes, historical volatility, drawdown and correlations. The model receives the profile and text preferences as untrusted data. It proposes 2–5 eligible assets. Crypto coverage uses a bounded activity-and-positive-trend screen with mandatory historical evidence; see [expanded coverage and exclusions](CRYPTO_DISCOVER_COVERAGE.md); Stocks can use the selected US/Singapore activity lists, and mixed proposals must include crypto and stocks. See [stock sources, USD budget semantics and limitations](STOCKS_IMPLEMENTATION.md). This is limited coverage, not a whole-market scanner. It can return unsupported when preferences cannot be met. Lower relative risk is never a claim that crypto is safe.

The server validates identities, unique assets, citations, integer percentages summing to 100%, maximum 50% per asset and exact cent allocation. Invalid output is rejected rather than replaced with a fixed basket. Essential-fund capacity must be explicitly “No.” Very small budgets and conflicting exclusions can be unsupported. Other questionnaire answers inform the analysis, not a validated suitability score. Text preferences are model-interpreted; semantic adherence and factual entailment of citations are not proven by structural validation.

Executable order-book liquidity is not collected or claimed; aggregate volume is not a substitute. News may be delayed or unavailable. Missing unlock and incident coverage are disclosed. Public data-use rights still require review. No approval report is invented. There are no future-price forecasts in Discover.

## Reviewed fixed-strategy mode

Discover already has an OpenAI Responses adapter. The earlier free-only configuration left it disabled, so a valid form submission returned `analysis_not_connected`. Selecting OpenAI does not create credentials, approve an allocation policy, or complete the specialist evaluation.

## Private configuration

Put these settings in the root `.env.local`, never in the tracked `.env.example` or a browser-visible `NEXT_PUBLIC_*` variable:

```dotenv
SPECIALIST_ANALYSIS_ENABLED=true
OPENAI_API_KEY=
CRYPTO_ANALYSIS_MODEL=gpt-5.4
```

Fill the blank key with your own project API key. The local implementation session prepared the enable flag and model without inventing a key. API use is billed independently of ChatGPT subscriptions. [Official pricing](https://developers.openai.com/api/docs/pricing).

GPT-5.4 is the proposed starting model for evaluation. It supports Responses and defaults to no reasoning effort, avoiding an implicit reasoning budget beyond this app's 1,500-output-token limit. Model choice and loading a skill do not establish crypto expertise or accuracy. [Model documentation](https://developers.openai.com/api/docs/models/gpt-5.4).

## Check setup without generating an allocation

```bash
npm run check:analysis
```

This loads the same development environment files as Next.js, prints presence checks without key values, and exits nonzero when required settings are missing. It does not approve the policy or evaluation report. To additionally check credentials and model access using the model-metadata endpoint, with no generation request:

```bash
npm run check:analysis -- --verify-openai
```

The application still needs a reviewed `ALLOCATION_STRATEGY_JSON` and a valid `SPECIALIST_EVALUATION_REPORT_PATH`. The policy owns supported profiles, eligible weights and exact budget allocation. The report must match the model and current skill hash, contain the fourteen real specialist-versus-generic comparisons, and record an actual human review. Existing example weights and test fixtures are not approval records. See [the financial engine](FINANCIAL_ENGINE.md) for the policy contract and live evaluation workflow. No approvals are generated by the setup command.

The API now distinguishes missing OpenAI configuration, a missing strategy, a pending specialist review, authentication failure, insufficient quota, rate limiting and unavailable model access. Only prewritten public messages leave the server; raw provider errors and credentials are not exposed. Market evidence and source permissions must also be suitable for the intended deployment; a valid OpenAI key does not resolve those separately documented requirements.

## Request limits and checks

The adapter counts the exact instructions/input/schema using `/v1/responses/input_tokens`, reserves up to 1,500 output tokens under the 15,000-total-token cap, and makes one generation call. It requests strict structured JSON, disables response storage, validates usage totals, and rejects incomplete output and unknown evidence citations. It has no automatic generation retries or invented fallback allocations. [Token counting](https://developers.openai.com/api/docs/guides/token-counting), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

Discover's schema limits each selected asset to one short claim and risk, restricts citations to supplied IDs, and shares the citation schema through a JSON Schema reference to avoid repeating its token cost. Per-asset source ownership and exact budget validation still run server-side. Distinct public errors identify crypto/stock evidence failures, invalid citations, OpenAI connection failures/timeouts, refusals, response truncation and unverifiable usage. Provider error bodies and credentials are never returned. These checks establish structure and provenance, not factual accuracy or investment suitability.

Ordinary unit and browser tests use provider fixtures and do not generate paid responses. Live evaluations require the separately documented explicit opt-in and can incur charges. Adding a key alone does not bypass remaining setup/review gates.
