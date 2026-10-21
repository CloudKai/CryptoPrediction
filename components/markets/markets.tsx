"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Icon } from "@/components/discover/icons";
import { useMarketsData, type MarketAsset } from "@/hooks/use-markets-data";
import { chartWindow, MARKET_WINDOWS, type MarketWindow } from "@/lib/markets";
import { formatPercent, formatPrice } from "@/lib/utils";
import type { ChartRange } from "@/types/market";
import shared from "@/components/discover/discover.module.css";
import styles from "./markets.module.css";

function timeLabel(time: number) {
  return new Date(time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function Markets({ range }: { range: ChartRange }) {
  const [query, setQuery] = useState("");
  const [window, setWindow] = useState<MarketWindow>("24h");
  const [reload, setReload] = useState(0);
  const market = useMarketsData(reload, window);
  const rows = market.rows.filter(row => `${row.symbol} ${row.displayName}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <>
    <div className={shared.pageHeading}><h1>Markets</h1><p>Compare current prices and recent trends at a glance.</p></div>
    <section aria-labelledby="assets-heading" aria-busy={market.loading}>
      <div className={styles.toolbar}>
        <div><h2 id="assets-heading">Tracked assets</h2><p>Prices in USDT · checked every 25 seconds</p></div>
        <div className={styles.controls}>
          <fieldset className={styles.ranges}><legend>Chart history</legend><div>{(Object.keys(MARKET_WINDOWS) as MarketWindow[]).map(value => <label key={value} title={`Past ${MARKET_WINDOWS[value].description}`}><input type="radio" name="market-window" value={value} checked={window === value} onChange={() => setWindow(value)} /><span>{MARKET_WINDOWS[value].label}</span></label>)}</div></fieldset>
          <label className={styles.search}><span>Search assets</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search name or symbol" /></label>
        </div>
      </div>
      {market.error ? <div className={styles.notice} role="status"><p>{market.error} Any prices below may be out of date.</p><button className={shared.secondaryButton} onClick={() => setReload(value => value + 1)}>Try again</button></div> : null}
      {market.loading && !market.rows.length ? <div className={styles.grid} role="status"><span className={styles.srOnly}>Loading market data…</span>{[0, 1, 2, 3, 4, 5].map(value => <div className={styles.skeleton} key={value} aria-hidden="true" />)}</div>
        : !market.rows.length && !market.error ? <div className={styles.empty}><h3>No assets are available yet.</h3><p>The feed has not returned any supported coins.</p><button className={shared.secondaryButton} onClick={() => setReload(value => value + 1)}>Refresh markets</button></div>
        : !rows.length && market.rows.length ? <div className={styles.empty}><h3>No assets match your search.</h3><p>Try a coin’s name or symbol, such as Bitcoin or BTC.</p><button className={shared.secondaryButton} onClick={() => setQuery("")}>Clear search</button></div>
        : <><p className={styles.resultCount} role="status">{rows.length} {rows.length === 1 ? "asset" : "assets"} · charts show the past {MARKET_WINDOWS[window].description}{market.loading ? " · Updating…" : ""}</p><div className={styles.grid}>{rows.map(asset => <AssetCard key={asset.symbol} asset={asset} window={window} loading={market.loading} range={range} />)}</div></>}
    </section>
    <div className={styles.context}><div><h2>Reading the charts</h2><p>Solid lines show observed prices over the selected period. 1M covers the past 30 days. Changes use the nearest available close at or before the start of that period. USDT is the quote currency; these prices have not been converted to USD.</p></div><nav aria-label="Market resources"><Link href="/latest-news">Market news<Icon name="arrow" size={16} /></Link><Link href="/how-it-works">How signals work<Icon name="arrow" size={16} /></Link></nav></div>
  </>;
}

function AssetCard({ asset, window, loading, range }: { asset: MarketAsset; window: MarketWindow; loading: boolean; range: ChartRange }) {
  const quote = asset.snapshot;
  const snapshot = asset.snapshot?.window === window ? asset.snapshot : null;
  const change = snapshot?.change;
  const stale = !quote || quote.stale;
  const id = useId();
  return <article className={styles.card} aria-labelledby={id}>
    <header className={styles.cardHeading}><Link href={`/dashboard/${encodeURIComponent(asset.symbol)}?range=${range}`}><span className={styles.initial} aria-hidden="true">{asset.baseAsset.slice(0, 1)}</span><span><h3 id={id}>{asset.displayName}</h3><span>{asset.baseAsset} / {asset.quoteAsset}</span></span></Link><Link className={styles.monitorLink} href={`/dashboard/${encodeURIComponent(asset.symbol)}?range=${range}`} aria-label={`Open ${asset.displayName} monitor`}><Icon name="arrow" size={17} /></Link></header>
    {quote ? <>
      <div className={styles.values}><div><span>{stale ? "Last price" : "Current price"} · USDT</span><strong>{formatPrice(quote.price)}</strong></div><div className={styles.change}><span>{MARKET_WINDOWS[window].label} change</span><strong className={change == null ? styles.muted : change >= 0 ? styles.gain : styles.loss}>{change == null ? "Unavailable" : formatPercent(change)}</strong></div></div>
      {snapshot ? <MiniChart asset={asset} /> : <div className={styles.updatingChart} role="status">{loading ? "Updating chart…" : "Chart history unavailable"}</div>}
      <p className={styles.asOf}>{stale ? "Price may be out of date · " : "As of "}<time dateTime={new Date(quote.observedAt).toISOString()}>{timeLabel(quote.observedAt)}</time>{stale ? " · refresh the feed" : " · local time"}</p>
    </> : <div className={styles.noChart}><p role={loading ? "status" : undefined}>{loading ? "Updating chart…" : asset.error ?? "Price feed unavailable"}</p><span>{loading ? "Loading the selected history." : "The chart will return when the price feed recovers."}</span></div>}
  </article>;
}

function MiniChart({ asset }: { asset: MarketAsset }) {
  const snapshot = asset.snapshot!;
  const config = MARKET_WINDOWS[snapshot.window];
  const points = chartWindow(snapshot);
  if (points.length < 2) return <div className={styles.noChart}>Not enough observations to draw this chart.</div>;
  const start = snapshot.observedAt - config.hours * 3_600_000;
  const min = Math.min(...points.map(point => point.price));
  const max = Math.max(...points.map(point => point.price));
  const span = max - min || max * 0.002;
  const x = (time: number) => 4 + Math.max(0, (time - start) / (snapshot.observedAt - start)) * 312;
  const y = (price: number) => 100 - (price - min) / span * 80;
  const path = points.map((point, index) => `${index === 0 || point.time - points[index - 1].time > config.step ? "M" : "L"}${x(point.time).toFixed(2)},${y(point.price).toFixed(2)}`).join(" ");
  const last = points[points.length - 1];
  const change = snapshot.change;
  return <figure className={styles.chart}>
    <svg viewBox="0 0 320 120" role="img" aria-label={`${asset.displayName} observed prices over the past ${config.description}${change == null ? "" : `, ${formatPercent(change)}`}`} preserveAspectRatio="none" className={change == null || change >= 0 ? styles.gain : styles.loss}>
      <path d="M4 105H316 M4 60H316 M4 15H316" className={styles.chartGrid} />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last.time)} cy={y(last.price)} r="2.6" fill="currentColor" />
    </svg><figcaption><span>{snapshot.window === "24h" ? timeLabel(start) : new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span><span>Past {config.description}</span><span>{snapshot.stale ? timeLabel(snapshot.observedAt) : "Now"}</span></figcaption>
  </figure>;
}
