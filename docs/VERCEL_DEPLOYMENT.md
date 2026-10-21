# Vercel services deployment

The repository's root `vercel.json` defines `app` (Next.js at `.`) and `backend` (FastAPI at `backend`, entrypoint `app.main:app`). This follows Vercel's documented public-frontend/private-backend binding architecture. The user authorized finalizing these choices. No cloud project has been created or deployed by this change.

## Routing and the binding

All public paths, including `/api/*`, enter `app`. Next.js owns Discover, assets, news aggregation and portfolio APIs, so routing all `/api/*` to FastAPI would break these endpoints. Existing Next.js market/prediction proxies retain their public URLs and call FastAPI privately with the original `/api/...` path and query string.

The calling service `app` declares a service binding targeting `backend`, injecting `BACKEND_URL`. Do **not** create this environment variable manually. It is read inside runtime route handlers, never during builds or in middleware, and is never exposed to the browser. The binding does not authenticate requests at the application layer. No top-level rewrite targets `backend`, so FastAPI health, docs, raw HTTP APIs and WebSocket endpoints have no direct public ingress.

For standalone `npm run dev`, the proxy can still use `BACKEND_API_BASE_URL=http://localhost:8000` (or your actual local port). The binding takes precedence when present. Set external API keys/analysis flags from `.env.example` in Vercel's project environment settings as needed; never upload private `.env.local`. Configure the Vercel project root as the repository root. Use the same private AI/data configuration that works locally to enable Discover. No backend-to-app calls exist, so no reverse binding is configured.

## Local validation

From the repository root, with a current Vercel CLI and the Python tooling it requires:

```bash
npx vercel@latest dev -L
```

`-L` runs without linking a cloud project. `vercel dev` also starts both services and injects the binding, but may require project setup/login. The local Python adapter requires `uv >= 0.9.25`; older system installations must be upgraded or a compatible temporary installation placed on PATH. Do not use `next dev` alone to validate Vercel service discovery. Run only one Next dev server against this checkout at a time to avoid shared `.next` output conflicts.

If the local Turbopack persistence database cannot open, use `NEXT_DISABLE_TURBOPACK_CACHE=1 npx vercel@latest dev -L`. This disables only development filesystem caching and preserves production behavior.

Check `/` and `/api/coins` on the printed public origin. `/api/coins` should be handled by Next.js and retrieve the FastAPI catalog through the binding. `/health` and `/docs` should not expose FastAPI directly. These checks do not spend OpenAI generation tokens. Market history depends on Binance availability from the actual deployment region; failures are not replaced with synthetic data.

## Function runtime behavior

Backend modules use relative imports so both `backend.app.main:app` from the repository root and `app.main:app` from the isolated backend service root work. Settings no longer create artifact directories during import: deployed bundles can be read-only. Offline training already creates directories when writing artifacts.

With `VERCEL=1`, startup loads existing model artifacts without bootstrapping every market or launching a persistent background stream. HTTP history is fetched on demand; prediction requests refresh their required candles. Local Uvicorn startup retains the existing background-stream behavior.

In-memory prediction histories and caches are instance-local and can reset between invocations/deployments. Trained artifacts are ignored by Git by default, so a clean deployment may report models offline; this configuration does not train or fabricate models. Durable history or production model distribution requires separate storage/bundling work.

The Next.js news cache uses writable temporary storage when `VERCEL=1`, rather than writing into the read-only application bundle. This cache is ephemeral and instance-local; its 12-hour refresh window does not provide a deployment-wide API quota limit.

Leave `NEXT_PUBLIC_WS_URL` unset on Vercel. The internal binding is server-only and cannot become a browser WebSocket URL. This configuration exposes HTTP APIs through Next.js; it does not provide the legacy persistent browser WebSocket stream. If that stream must be public, choose a supported realtime service or hosting architecture separately before deployment.

Next.js function tracing already includes the specialist Markdown skill pack needed by Discover. Existing 15,000-total/1,500-output token budgets and analysis timeouts remain unchanged. The Vercel service configuration does not enable disabled analysis flags or approve specialist evaluations.

## Implementation verification

Vercel CLI 65.0.0 validated the configuration and started both frameworks locally with `vercel dev -L`, using a temporary compatible uv installation. The documented development-cache bypass resolved the earlier local Turbopack persistence error. HTTP checks passed for `/` (200), `/api/coins` (200 through the injected backend binding, confirmed in the FastAPI request log), `/health` and `/docs` (404, so backend endpoints are not directly exposed), and an invalid Discover POST (400 from the preserved Next.js handler, without spending model tokens). The production Next.js build (including TypeScript), lint, 86 JavaScript tests and 8 Python tests passed. The build needed network access for the existing Google Fonts. Temporary Vercel test servers were stopped after validation, and the ordinary development server was restored on port 3000. No cloud deployment was performed. Binding/path precedence, private-error redaction, isolated Python imports, function startup and on-demand prediction refresh have automated coverage.

References: [services](https://vercel.com/docs/services), [routing](https://vercel.com/docs/services/routing), [bindings](https://vercel.com/docs/services/bindings), [FastAPI runtime](https://vercel.com/docs/frameworks/backend/fastapi).
