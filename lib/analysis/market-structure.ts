import type { ResearchEvidence } from "./data";
export function correlation(left: number[], right: number[]) {
  if (left.length !== right.length || left.length < 250)
    throw new Error("Correlation requires aligned daily prices.");
  const a = left.slice(1).map((value, i) => Math.log(value) - Math.log(left[i]));
  const b = right.slice(1).map((value, i) => Math.log(value) - Math.log(right[i]));
  const meanA = a.reduce((x, y) => x + y, 0) / a.length, meanB = b.reduce((x, y) => x + y, 0) / b.length;
  let covariance = 0, varianceA = 0, varianceB = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - meanA, y = b[i] - meanB;
    covariance += x * y;
    varianceA += x * x;
    varianceB += y * y;
  }
  return { dailyLogReturnPearson: varianceA > 0 && varianceB > 0 ? Math.max(-1, Math.min(1, covariance / Math.sqrt(varianceA * varianceB))) : null, observations: a.length, interpretation: "Historical correlation, not a promise of future diversification." };
}
export async function liquidityEvidence(asset: {
  assetId: string;
  symbol: string;
}, signal?: AbortSignal): Promise<ResearchEvidence> {
  const url = `https://api.exchange.coinbase.com/products/${asset.symbol}-USD/book?level=2`;
  const response = await fetch(url, { signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(15000)]), cache: "no-store", redirect: "error" });
  if (!response.ok)
    throw new Error("Executable liquidity evidence unavailable.");
  const text = await response.text();
  if (text.length > 2000000)
    throw new Error("Order book exceeds limit.");
  const book = JSON.parse(text);
  const side = (rows: unknown): [
    number,
    number
  ][] => {
    if (!Array.isArray(rows) || !rows.length || rows.length > 20000)
      throw new Error("Invalid order book.");
    return rows.map(row => { if (!Array.isArray(row) || typeof row[0] !== "string" || typeof row[1] !== "string")
      throw new Error("Invalid order book."); const price = Number(row[0]), size = Number(row[1]); if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(size) || size < 0)
      throw new Error("Invalid order book."); return [price, size]; });
  };
  const bids = side(book.bids), asks = side(book.asks), bid = Math.max(...bids.map(row => row[0])), ask = Math.min(...asks.map(row => row[0]));
  const time = Date.parse(book.time), now = Date.now(), mid = (bid + ask) / 2;
  if (book.auction_mode || ask < bid || !Number.isFinite(time) || now - time > 60000 || time > now + 60000)
    throw new Error("Stale or non-continuous order book.");
  const bidDepth = bids.filter(([price]) => price >= mid * .995).reduce((sum, [price, size]) => sum + price * size, 0);
  const askDepth = asks.filter(([price]) => price <= mid * 1.005).reduce((sum, [price, size]) => sum + price * size, 0);
  if (![bidDepth, askDepth].every(Number.isFinite))
    throw new Error("Invalid order-book depth.");
  return { id: `${asset.assetId}:liquidity`, assetId: asset.assetId, title: `Coinbase ${asset.symbol}/USD order book`, url, observedAt: book.time, facts: { venue: "Coinbase Exchange", quote: "USD", bestBid: bid, bestAsk: ask, spreadBps: (ask - bid) / mid * 10000, bidDepthWithin50BpsUsd: bidDepth, askDepthWithin50BpsUsd: askDepth, limitations: ["One venue snapshot, not consolidated liquidity or a guaranteed execution price.", "Aggregated sizes are not multiplied by order count."] } };
}
export async function newsEvidence(asset: {
  assetId: string;
  name: string;
}, signal?: AbortSignal): Promise<ResearchEvidence[]> {
  const key = process.env.NEWSDATA_API_KEY;
  if (!key)
    return [];
  const url = new URL("https://newsdata.io/api/1/latest");
  url.searchParams.set("apikey", key);
  url.searchParams.set("q", asset.name);
  url.searchParams.set("language", "en");
  url.searchParams.set("size", "10");
  try {
    const response = await fetch(url, { signal: AbortSignal.any([signal ?? new AbortController().signal, AbortSignal.timeout(15000)]), cache: "no-store", redirect: "error" });
    if (!response.ok)
      return [];
    const text = await response.text();
    if (text.length > 500000)
      return [];
    const body = JSON.parse(text);
    if (body.status !== "success" || !Array.isArray(body.results))
      return [];
    return body.results.filter((row: {
      title?: string;
    }) => typeof row.title === "string" && row.title.toLowerCase().includes(asset.name.toLowerCase())).slice(0, 2).flatMap((row: {
      title: string;
      link: string;
      pubDate: string;
      description?: string;
    }, index: number) => {
      try {
        const source = new URL(row.link);
        const observedAt = new Date(row.pubDate.replace(" ", "T") + (row.pubDate.includes("T") ? "" : "Z")).toISOString();
        if (source.protocol !== "https:" || source.username || source.password || Date.now() - Date.parse(observedAt) > 7 * 86400000 || Date.parse(observedAt) > Date.now() + 60000)
          return [];
        return [{ id: `${asset.assetId}:news:${index}`, assetId: asset.assetId, title: row.title.slice(0, 200), url: source.href, observedAt, facts: { reportTitle: row.title.slice(0, 500), untrustedSummary: (row.description ?? "").slice(0, 1000), verification: "Third-party report discovered through NewsData; not independently verified. Conflicting reports must be flagged." } }];
      }
      catch {
        return [];
      }
    });
  }
  catch {
    return [];
  }
}
