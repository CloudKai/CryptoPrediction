# Markets implementation

Updated 20 October 2026 for the request “$impeccable change the Markets tab too”.

The `/markets` overview now extends the confirmed Discover investing workspace. It uses `DiscoverShell` and the existing system sans, cool neutral canvas, white bordered panels, muted metadata, grey-green actions, visible keyboard focus, and flat surfaces. This is an ordinary extension of the incumbent visual system, with no approved system change. `DESIGN.md` and `.impeccable/design.json` are preserved.

## Implemented behavior

- A labeled search filters the supported assets by name or symbol, ignoring case. The result count updates and a no-match state offers Clear search.
- The table compares asset identity, USDT price, signed recent change, base-unit volume, experimental model direction, and signal timestamp in UTC. Signed values and Up/Down text preserve meaning independently of color.
- An asset name opens its existing `/dashboard/[symbol]` monitor, carrying the parsed range query (including the legacy interval alias). News and methodology links remain available.
- Below 1190px, secondary columns move into each asset’s native More data disclosure. On mobile, the search stacks above the three primary columns, with the existing shell’s top navigation.
- Initial loading, feed failure with Try again, no supported assets with Refresh markets, and no search matches have explicit states. Retry remounts the data component while retaining the search query.

Markets uses the existing `useWatchlistData("15m", null)` backend integration. It requests the supported coin list, market history, and latest predictions, refreshing every 25 seconds. It opens no duplicate chart stream and introduces no new data engine or persistence. Search and retry state are held in component memory; this page does not save proposals, watchlists, purchases, or account preferences.

Quotes are **USDT, not converted USD**; the inherited guest USD account label does not change market quote units. The current hook computes change from available 15-minute candles over approximately 24 hours and sums recent candle volume in each asset’s own units. These volumes are not comparable across coins. Model direction remains an experimental short-term signal, with no allocation recommendation or return guarantee. Monitor and news pages retain their existing legacy dark implementation and are outside this visual change.

## Evidence and validation

Source checked: `app/markets/page.tsx`, `components/markets/markets.tsx`, `components/markets/markets.module.css`, `hooks/use-watchlist-data.ts`, and the incumbent `components/discover/discover.module.css`, together with `PRODUCT.md`, both design-system files, and `.impeccable/surfaces/app-markets-page-tsx.md`.

The following rendered captures were visually compared with the incumbent system:

- `output/playwright/markets-desktop-fixture.png`: complete comparison table and context.
- `output/playwright/markets-mobile-fixture.png`: compact table and mobile shell.
- `output/playwright/markets-mobile-expanded.png`: expanded secondary data.
- `output/playwright/markets-error.png`: unavailable feed and recovery action.
- `output/playwright/markets-search-empty.png`: search feedback, focus, and recovery.
- `output/playwright/markets-loading.png`: truthful pending state.

The local backend was offline; the error capture records that real condition. Other captures use browser-intercepted data from existing test fixtures. They demonstrate layout and state behavior, not live prices or predictive accuracy. No synthetic market data or review raster imagery ships with the page; the implementation uses code, text initials, and inline SVG icons.

The implementation session reports nine passing end-to-end tests, lint, TypeScript, and production build checks. The independent finish review in `.impeccable/review/markets/verdict.md` returned **ship**, with no material fixes. The existing detector report contains advisories only: 11px, 13px, and 16px sizes already appear in DESIGN.md prose; the positive green reinforces signed change; and the compact signal badge uses a 5px radius. The reviewer accepted those local treatments. They do not establish new system-wide tokens.

## Existing documentation boundary drift

`DESIGN.md` and its sidecar still describe Markets as a legacy dark page outside the Discover boundary. That description predates this authorized extension; Markets now shares Discover’s shell, while individual monitor pages remain legacy. The discrepancy is recorded here without silently refreshing either design-system file. A future explicitly requested documentation refresh can reconcile that boundary wording.
