export type BrowseMarket = "crypto" | "us" | "sg";
export type BrowseRange = "24h" | "7d" | "1mo" | "1y";
export type AssetObservation = { time: number; price: number };
export type BrowsedAsset = {
  assetId: string;
  assetClass: "crypto" | "stock";
  market: BrowseMarket;
  name: string;
  symbol: string;
  currency: string;
  price: number;
  changePct: number | null;
  activity: number;
  observedAt: string;
  sourceUrl: string;
  points: AssetObservation[];
  historyError?: string;
  metrics?: { annualizedLogVolatility: number; maxDrawdown: number; observations: number; trend7dPct: number | null; trend30dPct: number | null; periodStart: string; periodEnd: string; convention: string };
};
export type AssetFeed = {
  market: BrowseMarket;
  range: BrowseRange;
  checkedAt: string;
  ranking: string;
  source: string;
  sourceUrl: string;
  assets: BrowsedAsset[];
  limitations: string[];
};
