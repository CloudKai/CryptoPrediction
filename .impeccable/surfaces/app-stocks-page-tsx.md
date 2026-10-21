# Stocks and market-selection extension

Mode: Operate. Ordinary extension of the familiar investing workspace in DESIGN.md; no new visual world or approved token change.

Target: `app/stocks/page.tsx`, shared `components/markets/asset-browser.tsx`, and the market-selection additions to Discover. Crypto remains at `/markets`; Stocks is at `/stocks`.

THESIS: Scan a short activity-ranked stock list, inspect observed prices and history, and carry an asset into an allocation request.

OWN-WORLD: Inherit the Discover shell's cool neutral canvas, charcoal system sans, flat white bordered panels, grey-green actions, tabular quantities, native controls, and visible focus. Stock filters and small charts extend the incumbent Markets pattern rather than establish global primitives.

STORY: Choose US or Singapore stocks, select 1W/1M/1Y history (1M default), and search names or symbols within the current top ten. Read last traded prices separately from adjusted-close history, quote timestamps, and provider limitations. Use in Discover preserves the request and adds the asset as a preference. Discover offers Crypto, Stocks, or Crypto + stocks, with US, Singapore, or both when stocks are included; its request summary reflects those selections. Budgets remain USD; Singapore stock prices are explicitly SGD.

FIRST VIEWPORT: Desktop shared rail and top bar, concise Stocks heading, market/history/search controls, then three-column cards. Cards reflow to two columns and then one on narrow screens; controls stack and five-item navigation moves above content. Discover retains its grouped form and secondary summary, stacked on mobile.

FORM: Code-led local extension. Asset cards retain identity, labeled price and signed session change, an observed-history line, currency and date labels, delayed-quote context, and a quiet Discover action. Loading, unavailable feed, empty search, and missing history use explicit text rather than fabricated values. Trading activity is an observation, not an investment-quality claim. This brief grants no provider approval or evaluation status.

EVIDENCE: Source checked: `app/stocks/page.tsx`; `components/markets/asset-browser.tsx` and `markets.module.css`; Discover's `discover-form.tsx`, `results.tsx`, `shell.tsx`, `request-summary.tsx`, and `discover.module.css`. Visual evidence checked: `.impeccable/review/stocks-desktop.png`, `stocks-mobile.png`, `discover-markets-desktop.png`, and `discover-markets-mobile.png`. Compared against PRODUCT.md, DESIGN.md, `.impeccable/design.json`, and incumbent Discover/Markets surface briefs. Screenshots are review evidence, not shipping imagery or financial evaluation receipts.

PERSISTENCE: Preserve DESIGN.md and its sidecar for this ordinary extension. Existing stale Markets wording in the sidecar and four-item mobile-navigation prose in DESIGN.md are recorded drift, not new rules; repairing those files is outside this extension's documentation boundary. Earlier surface briefs remain historical context; current source and this extension record describe Stocks and the added market selections.
