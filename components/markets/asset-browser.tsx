"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { AssetFeed, BrowseMarket, BrowseRange, BrowsedAsset } from "@/lib/assets/types";
import { EMPTY_DRAFT } from "@/lib/discover/profile";
import { saveDraft, useDraftSnapshot } from "@/lib/discover/storage";
import { formatPercent } from "@/lib/utils";
import { Icon } from "@/components/discover/icons";
import shared from "@/components/discover/discover.module.css";
import styles from "./markets.module.css";

const date = (time: string | number) => new Date(time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const price = (asset: BrowsedAsset) => new Intl.NumberFormat("en-US", { style: "currency", currency: asset.currency, maximumFractionDigits: asset.price < 1 ? 6 : 2 }).format(asset.price);

export function AssetBrowser({ kind }: { kind: "crypto" | "stocks" }) {
  const [market, setMarket] = useState<BrowseMarket>(kind === "crypto" ? "crypto" : "us");
  const [range, setRange] = useState<BrowseRange>(kind === "crypto" ? "24h" : "1mo");
  const [query, setQuery] = useState("");
  const [reload, setReload] = useState(0);
  const key = `${market}:${range}:${reload}`;
  const [state, setState] = useState<{ key: string; feed: AssetFeed | null; error: string; loading: boolean }>({ key, feed: null, error: "", loading: true });
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch(`/api/assets?market=${market}&range=${range}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]), cache: "no-store" });
        const body = await response.json();
        if (!response.ok || !Array.isArray(body.assets)) throw new Error(body.message ?? "The market feed is unavailable.");
        if (!controller.signal.aborted) setState({ key, feed: body, error: "", loading: false });
      } catch (error) {
        if (!controller.signal.aborted) setState({ key, feed: null, error: error instanceof Error ? error.message : "The market feed is unavailable.", loading: false });
      } finally { if (!controller.signal.aborted) timer = setTimeout(refresh,5*60000); }
    }
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [key,market,range]);
  const feed = state.key === key ? state.feed : null;
  const loading = state.key !== key || state.loading;
  const error = state.key === key ? state.error : "";
  const rows = feed?.assets.filter(asset => `${asset.name} ${asset.symbol}`.toLowerCase().includes(query.trim().toLowerCase())) ?? [];
  const windows: [BrowseRange,string][] = kind === "crypto" ? [["24h","24H"],["7d","7D"],["1mo","1M"]] : [["7d","1W"],["1mo","1M"],["1y","1Y"]];
  return <>
    <div className={shared.pageHeading}><h1>{kind === "crypto" ? "Crypto" : "Stocks"}</h1><p>{kind === "crypto" ? "The most traded coins, with prices and recent trends." : "Explore active US and Singapore stocks, then research an allocation."}</p></div>
    <section aria-labelledby="assets-heading" aria-busy={loading}>
      <div className={styles.toolbar}>
        <div><h2 id="assets-heading">Top 10 by trading activity</h2><p>{feed?.ranking ?? (kind === "crypto" ? "24-hour traded value · USD" : "Choose a stock market below")} · checked every 5 minutes</p></div>
        <div className={styles.controls}>
          {kind === "stocks" ? <fieldset className={styles.ranges}><legend>Stock market</legend><div>{(["us","sg"] as const).map(value => <label key={value}><input type="radio" name="stock-market" checked={market===value} onChange={() => setMarket(value)} /><span>{value === "us" ? "US" : "Singapore"}</span></label>)}</div></fieldset> : null}
          <fieldset className={styles.ranges}><legend>Chart history</legend><div>{windows.map(([value,label]) => <label key={value}><input type="radio" name="chart-history" checked={range===value} onChange={() => setRange(value)} /><span>{label}</span></label>)}</div></fieldset>
          <label className={styles.search}><span>Search these assets</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name or symbol" /></label>
        </div>
      </div>
      {loading ? <div className={styles.grid} role="status"><span className={styles.srOnly}>Loading market data…</span>{[0,1,2,3,4,5].map(n => <div key={n} className={styles.skeleton} aria-hidden="true" />)}</div>
      : error ? <div className={styles.empty} role="status"><h3>Market data is unavailable.</h3><p>{error}</p><button type="button" className={shared.secondaryButton} onClick={() => setReload(n => n+1)}>Try again</button></div>
      : !rows.length ? <div className={styles.empty} role="status"><h3>No assets match your search.</h3><p>Search a name or symbol in this market’s current top 10.</p><button type="button" className={shared.secondaryButton} onClick={() => setQuery("")}>Clear search</button></div>
      : <><p className={styles.resultCount} role="status">{rows.length} of {feed!.assets.length} assets · {kind === "crypto" ? "24h price change" : "Latest session change"} · local timestamps</p><div className={styles.grid}>{rows.map(asset => <BrowseCard key={asset.assetId} asset={asset} range={range} />)}</div></>}
    </section>
    <div className={styles.context}><div><h2>About this list</h2><p>Trading activity is an observation, not a buy signal or a measure of safety. {kind === "crypto" ? "Ranking uses reported 24-hour USD volume. Pegged and wrapped coins may appear. Discover checks eligibility and sufficient history separately; displayed coins are not guaranteed inclusion. Charts show observed USD prices." : "US ranking follows Yahoo Finance’s most-active universe by share volume. Singapore ranks SGD ordinary stocks by traded value on SGX. Stock charts use adjusted daily closes and exclude the current unfinished trading day."}</p>{feed?.limitations.map((line,i) => <p key={i}>{line}</p>)}</div>{feed ? <nav aria-label="Market resources"><a href={feed.sourceUrl} target="_blank" rel="noopener noreferrer">{feed.source}<Icon name="external" size={15} /></a><span className={styles.resultCount}>Checked {date(feed.checkedAt)}</span></nav> : null}</div>
  </>;
}

function BrowseCard({ asset, range }: { asset: BrowsedAsset; range: BrowseRange }) {
  const id = useId(), draft = useDraftSnapshot(), router = useRouter();
  const [notice,setNotice] = useState("");
  const days = range === "24h" ? 1 : range === "7d" ? 7 : range === "1mo" ? 30 : 366;
  const end = asset.points.at(-1)?.time ?? 0;
  const points = asset.points.filter(row => row.time >= end-days*86400000);
  const min = points.length ? Math.min(...points.map(row=>row.price)) : 0;
  const max = points.length ? Math.max(...points.map(row=>row.price)) : 0;
  const width = end-(points[0]?.time??end) || 1, height = max-min || Math.max(max*.002,1);
  const path = points.map((row,i)=>`${i ? "L" : "M"}${(4+(row.time-points[0].time)/width*312).toFixed(2)},${(100-(row.price-min)/height*80).toFixed(2)}`).join(" ");
  function discover() {
    const existing = draft ?? EMPTY_DRAFT;
    const preferences = `${existing.preferences.trim()}${existing.preferences.trim() ? "\n" : ""}Consider ${asset.name} (${asset.symbol}) in the allocation.`;
    if (preferences.length > 1000) { setNotice("Your preferences are full. Edit them in Discover to add this asset."); return; }
    if (!saveDraft({ ...existing, preferences, assetClass: asset.assetClass === "stock" ? "stocks" : "crypto", stockMarket: asset.market === "crypto" ? "both" : asset.market })) { setNotice("Your browser could not preserve this selection. Open Discover and enter it in preferences."); return; }
    router.push("/");
  }
  return <article className={styles.card} aria-labelledby={id}>
    <header className={styles.cardHeading}><a href={asset.sourceUrl} target="_blank" rel="noopener noreferrer"><span className={styles.initial} aria-hidden="true">{asset.symbol.slice(0,1)}</span><span><h3 id={id}>{asset.name}</h3><span>{asset.symbol} · {asset.currency}</span></span></a></header>
    <div className={styles.values}><div><span>Last traded price · {asset.currency}</span><strong>{price(asset)}</strong></div><div className={styles.change}><span>{asset.assetClass === "crypto" ? "24h" : "Session"} change</span><strong className={asset.changePct == null ? styles.muted : asset.changePct>=0 ? styles.gain : styles.loss}>{asset.changePct == null ? "Unavailable" : formatPercent(asset.changePct)}</strong></div></div>
    {points.length>=2 ? <figure className={styles.chart}><svg viewBox="0 0 320 120" preserveAspectRatio="none" role="img" aria-label={`${asset.name} observed ${asset.currency} ${asset.assetClass === "stock" ? "adjusted daily closes" : "prices"}`} className={points.at(-1)!.price >= points[0].price ? styles.gain : styles.loss}><path d="M4 105H316 M4 60H316 M4 15H316" className={styles.chartGrid}/><path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" /></svg><figcaption><span>{new Date(points[0].time).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span><span>{asset.assetClass === "stock" ? "Adjusted closes" : "Observed prices"}</span><span>{new Date(end).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span></figcaption></figure> : <div className={styles.updatingChart}>{asset.historyError ?? "Not enough observations to draw a chart."}</div>}
    <p className={styles.asOf}>Quote as of {date(asset.observedAt)} · may be delayed</p>
    <div className={styles.cardAction}><button type="button" className={shared.textButton} onClick={discover}>Use in Discover<Icon name="arrow" size={15}/></button>{notice ? <p role="status">{notice}</p> : null}</div>
  </article>;
}
