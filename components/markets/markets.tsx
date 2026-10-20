"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useWatchlistData } from "@/hooks/use-watchlist-data";
import { formatCompactNumber, formatPercent, formatPrice } from "@/lib/utils";
import type { ChartRange } from "@/types/market";
import { Icon } from "@/components/discover/icons";
import shared from "@/components/discover/discover.module.css";
import styles from "./markets.module.css";

export function Markets({ range }: { range: ChartRange }) {
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);
  return <>
    <div className={shared.pageHeading}><h1>Markets</h1><p>Compare tracked crypto assets, then open a monitor for charts and model signals.</p></div>
    <MarketTable key={reload} query={query} setQuery={setQuery} range={range} retry={() => setReload((value) => value + 1)} />
    <div className={styles.context}><div><h2>Read the data in context</h2><p>Quotes are in USDT, not converted USD. Change and volume are calculated from available 15-minute candles over approximately 24 hours. Volume is in each asset’s own units, so it is not comparable across coins.</p><p>Model direction is an experimental short-term signal, not an allocation recommendation or a guarantee of returns.</p></div><nav aria-label="Market resources"><Link href="/latest-news">Market news<Icon name="arrow" size={16} /></Link><Link href="/how-it-works">How signals work<Icon name="arrow" size={16} /></Link></nav></div>
  </>;
}

function MarketTable({ query, setQuery, range, retry }: { query: string; setQuery: (value: string) => void; range: ChartRange; retry: () => void }) {
  // Markets polls the existing backend; it does not open a duplicate BTC chart stream.
  const market = useWatchlistData("15m", null);
  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return market.rows.filter((row) => `${row.symbol} ${row.displayName}`.toLowerCase().includes(normalized));
  }, [market.rows, query]);
  const hasData = market.rows.length > 0;
  return <section className={styles.panel} aria-labelledby="assets-heading" aria-busy={market.loading}>
    <div className={styles.toolbar}><div><h2 id="assets-heading">Tracked assets</h2><p>{hasData ? `${market.rows.length} assets · checked every 25 seconds` : "Prices, recent changes, and model direction"}</p></div><label className={styles.search}><span>Search assets</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or symbol" /></label></div>
    {market.loading && !hasData ? <div className={styles.loading} role="status"><p>Loading market data…</p>{[0, 1, 2, 3, 4].map((item) => <div className={styles.skeleton} key={item} aria-hidden="true" />)}</div> : market.error ? <div className={styles.empty} role="status"><Icon name="info" size={26} /><h3>Market data isn’t available right now.</h3><p>We couldn’t reach the market feed. Try again, or return later.</p><button type="button" className={shared.secondaryButton} onClick={retry}>Try again</button></div> : !market.rows.length ? <div className={styles.empty}><h3>No assets are available yet.</h3><p>The market feed has not returned any supported assets.</p><button type="button" className={shared.secondaryButton} onClick={retry}>Refresh markets</button></div> : <>
    <p className={styles.resultCount} role="status">{rows.length} {rows.length === 1 ? "asset" : "assets"}{query.trim() ? ` matching “${query.trim()}”` : " available"}{market.loading ? " · Refreshing…" : ""}</p>
    {rows.length ? <table className={styles.table}><caption className={styles.srOnly}>Tracked crypto assets. Prices are quoted in USDT. Open an asset to inspect its monitor.</caption><thead><tr><th scope="col">Asset</th><th scope="col">Price <span>USDT</span></th><th scope="col">24h change</th><th scope="col" className={styles.secondaryColumn}>24h volume</th><th scope="col" className={styles.secondaryColumn}>Model direction</th><th scope="col" className={styles.secondaryColumn}>Signal updated</th></tr></thead><tbody>{rows.map((row) => {
      const ticker = row.symbol.replace(/USDT$/, "");
      const timestamp = new Date(row.updatedAt);
      const updated = Number.isFinite(timestamp.getTime()) ? timestamp.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : "Unavailable";
      const direction = row.direction === "UP" ? "Up" : "Down";
      return <tr key={row.symbol}><td><Link className={styles.assetLink} href={`/dashboard/${encodeURIComponent(row.symbol)}?range=${range}`}><span className={styles.initial} aria-hidden="true">{ticker.slice(0, 1)}</span><span><strong>{row.displayName}</strong><span>{ticker}<Icon name="chevron" size={12} /></span></span></Link><details className={styles.mobileDetails}><summary>More data</summary><dl><div><dt>24h volume</dt><dd>{formatCompactNumber(row.volume24h)} {ticker}</dd></div><div><dt>Model direction</dt><dd>{direction}</dd></div><div><dt>Signal updated</dt><dd>{updated}</dd></div></dl></details></td><td>{formatPrice(row.price)}</td><td className={row.change24h >= 0 ? styles.gain : styles.loss}>{formatPercent(row.change24h)}</td><td className={styles.secondaryColumn}>{formatCompactNumber(row.volume24h)}<span className={styles.unit}>{ticker}</span></td><td className={styles.secondaryColumn}><span className={styles.direction}>{direction}</span></td><td className={`${styles.secondaryColumn} ${styles.timestamp}`}><time dateTime={Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : undefined}>{updated}</time></td></tr>;
    })}</tbody></table> : <div className={styles.empty}><h3>No assets match your search.</h3><p>Try a coin’s name or symbol, such as Bitcoin or BTC.</p><button type="button" className={shared.secondaryButton} onClick={() => setQuery("")}>Clear search</button></div>}
    </>}
    <div className={styles.tableFooter}><Icon name="info" size={15} /><span>Open an asset’s name to see its chart, model signal, and prediction history.</span></div>
  </section>;
}
