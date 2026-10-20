# Discover implementation

Discover is the default `/` route. `/discover` redirects to it. The old monitoring overview remains at `/markets`, with symbol monitors unchanged at `/dashboard/[symbol]`.

## Available behavior

- One grouped form with budget, optional preferences, and the five approved profile questions. No suitability answer is preselected.
- Inline validation and focusable error summary; live input summary; cancellable request status; dedicated `/discover/results` view; restoration through Edit inputs.
- Successful responses show reconciled asset allocations, evidence, risks, methodology, data timestamps, and expandable details.
- Explicit unavailable/incomplete states when a response cannot be produced or verified.
- Guests can explicitly save completed proposals and follow result assets on the current device. `/discover/saved` and `/watchlist` support viewing/removal. Proposals are not recorded as investments.
- Profile-circle menu with the real guest state. Authentication, currency changes, investment tracking, and the specialist analysis engine are not implemented by this UI slice. `/invested` explains the signed-in requirement and current availability.

The form/result lifecycle uses session storage. Explicit saved proposals and followed assets use local storage. No budget or profile is put in a URL. Local retention is until removal/browser storage clearing, with at most ten saved proposals and 100 followed assets. This is device-local storage, not account synchronization or encrypted storage. Storage failures are shown instead of silently losing a request. The current tab retains the latest request; older requests require an explicitly saved proposal to reopen.

## Connect analysis

An in-process specialist service now exists behind release gates. See [financial engine](FINANCIAL_ENGINE.md) for model/evidence configuration, reviewed strategy and evaluation requirements. The following external bridge remains available when that service is disabled; it now also enforces 3–5 assets, a 50% concentration cap on rounded amounts and canonical cent reconciliation.

### External allocation service

Set the server-only `ALLOCATION_SERVICE_URL` to the full POST endpoint of a separately implemented allocation service. HTTPS is required except for localhost development. Without it, `/api/allocation` returns an honest `analysis_not_connected` response. Setting `BACKEND_API_BASE_URL` alone does not connect allocation analysis; the existing FastAPI service has no allocation endpoint.

The bridge accepts a validated `DiscoverInput` from [profile.ts](../lib/discover/profile.ts), adds the fixed `limits` object, and POSTs it to the service. Maximum budget is $999,999,999.99 USD, with cents precision; optional preferences are limited to 1,000 characters. These are implementation input bounds, not investment eligibility rules. The bridge has a 60-second timeout and does not retry model calls automatically. Never point it at a public endpoint without implementing appropriate authentication, rate limits, and the analysis service's own budget enforcement.

The service response must follow [contract.ts](../lib/discover/contract.ts):

- `complete`: analysis ID, ISO timestamps, 1–5 unique canonical assets, positive integer `amountCents`, integer `weightBps`, reasons, risks, HTTPS evidence, methodology, limitations, and cumulative usage receipt.
- Weights sum to 10,000 basis points; amounts sum exactly to the request budget and agree with basis-point weights to rounding precision. Normal product output targets 3–5 assets; fewer is allowed when the supported strategy explicitly returns fewer.
- `usage.totalTokens` includes all service calls, reasoning, and retries; at most 15,000. `usage.explanationTokens` is at most 1,500 and cannot exceed total usage. The UI bridge checks the receipt but cannot independently verify a remote provider's accounting; the service must enforce the budget during execution.
- Fresh complete results require market evidence and generation timestamps within 15 minutes and no clock more than one minute ahead. This conservative initial freshness bound is a technical policy to revisit with the provider and product owner. Stored results retain their original timestamps; stale proposals show the incomplete/refresh state.
- `unavailable`, `incomplete`, or `unsupported`: code, concise message, and retryable flag. Raw upstream errors and unrecognized fields are not forwarded to users.

The [crypto-analysis skill](agent-skills/crypto-analysis/SKILL.md) is loaded by the gated in-process service; live quality evaluation remains required. This frontend does not generate recommendation weights or multi-year projections from a prompt or from the existing 15-minute classifier.

## Validation

```bash
npm run lint
npm run test
npx tsc --noEmit --incremental false
npm run build
```

Run browser tests against the default dev server, or target an already running production server:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 npm run test:e2e
```

The E2E complete-result test intercepts the allocation request with explicitly synthetic data from `test/fixtures/discover.ts`. Those fixtures are never imported by application code. Successful fixture rendering verifies UI behavior and contract enforcement, not investment accuracy. Set `DISCOVER_CAPTURE_DIR` to an existing writable directory to capture the tested desktop/mobile and key result states.
