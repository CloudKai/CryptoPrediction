import { expect, test } from "@playwright/test";

const COINS = [
  { symbol: "BTCUSDT", displayName: "Bitcoin", baseAsset: "BTC", quoteAsset: "USDT" },
  { symbol: "ETHUSDT", displayName: "Ethereum", baseAsset: "ETH", quoteAsset: "USDT" },
  { symbol: "BNBUSDT", displayName: "BNB", baseAsset: "BNB", quoteAsset: "USDT" },
  { symbol: "SOLUSDT", displayName: "Solana", baseAsset: "SOL", quoteAsset: "USDT" },
  { symbol: "XRPUSDT", displayName: "XRP", baseAsset: "XRP", quoteAsset: "USDT" },
  { symbol: "ADAUSDT", displayName: "Cardano", baseAsset: "ADA", quoteAsset: "USDT" },
  { symbol: "DOGEUSDT", displayName: "Dogecoin", baseAsset: "DOGE", quoteAsset: "USDT" },
  { symbol: "AVAXUSDT", displayName: "Avalanche", baseAsset: "AVAX", quoteAsset: "USDT" },
  { symbol: "LINKUSDT", displayName: "Chainlink", baseAsset: "LINK", quoteAsset: "USDT" },
  { symbol: "MATICUSDT", displayName: "Polygon", baseAsset: "MATIC", quoteAsset: "USDT" },
] as const;

const RANGE_TO_INTERVAL: Record<string, string> = {
  live: "1m",
  "1d": "5m",
  "1w": "1h",
  "1mo": "4h",
  "1y": "1d",
};

const RANGE_TO_LIMIT: Record<string, number> = {
  live: 60,
  "1d": 288,
  "1w": 168,
  "1mo": 180,
  "1y": 365,
};

function createCandles(symbol: string, interval: string, count: number) {
  const symbolIndex = COINS.findIndex((coin) => coin.symbol === symbol);
  const seed = Math.max(symbolIndex, 0) + 1;
  const now = Date.UTC(2026, 3, 22, 12, 0, 0);
  const intervalMs =
    interval === "1m"
      ? 60_000
      : interval === "5m"
        ? 300_000
        : interval === "15m"
          ? 900_000
          : interval === "1h"
            ? 3_600_000
            : interval === "4h"
              ? 14_400_000
              : 86_400_000;

  const basePrice = 70_000 / seed + seed * 120;

  return Array.from({ length: count }, (_, index) => {
    const time = now - (count - index) * intervalMs;
    const drift = index * seed * 0.85;
    const open = basePrice + drift + (index % 5) * 3;
    const close = open + ((index % 2 === 0 ? 1 : -1) * (seed + 2));
    const high = Math.max(open, close) + 4 + seed;
    const low = Math.min(open, close) - 4 - seed;
    const volume = 1_000 + index * 25 + seed * 110;

    return {
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Number(volume.toFixed(2)),
    };
  });
}

function createPrediction(symbol: string, interval: string) {
  const symbolIndex = COINS.findIndex((coin) => coin.symbol === symbol);
  const direction = symbolIndex % 2 === 0 ? "UP" : "DOWN";
  const price = 74_000 / (symbolIndex + 1) + symbolIndex * 150;

  return {
    symbol,
    interval,
    direction,
    confidence: 61 + symbolIndex * 2.7,
    updatedAt: "2026-04-22T12:15:00.000Z",
    forecastStartAt: "2026-04-22T12:15:00.000Z",
    forecastTargetTime: "2026-04-22T12:30:00.000Z",
    price: Number(price.toFixed(2)),
    actualDirection: null,
    resolvedAt: null,
  };
}

function createPredictionHistory(symbol: string) {
  const basePrice = 74_000;
  return Array.from({ length: 14 }, (_, index) => {
    const createdAt = new Date(Date.UTC(2026, 3, 22, 12, 0, 0) - index * 900_000);
    const isLatest = index === 0;
    const direction = index % 2 === 0 ? "UP" : "DOWN";

    return {
      id: `${symbol}-15m-${createdAt.toISOString()}`,
      symbol,
      interval: "15m",
      direction,
      actualDirection: isLatest ? null : direction,
      confidence: 73 - index * 1.1,
      createdAt: createdAt.toISOString(),
      resolvedAt: isLatest ? null : new Date(createdAt.getTime() + 900_000).toISOString(),
      price: Number((basePrice - index * 12.5).toFixed(2)),
    };
  });
}

function createNewsItems(category: string) {
  return Array.from({ length: 10 }, (_, index) => ({
    id: `${category}-${index + 1}`,
    headline: `${category} headline ${index + 1}`,
    source: `${category} Source`,
    publishedAt: new Date(Date.UTC(2026, 3, 22, 12, 0, 0) - index * 3_600_000).toISOString(),
    summary: `Summary for ${category.toLowerCase()} story ${index + 1}.`,
    url: `https://example.com/${category.toLowerCase()}/${index + 1}`,
    imageUrl: null,
  }));
}

async function mockBackendApis(page: Parameters<typeof test.beforeEach>[0]["page"]) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    if (path === "/api/coins") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ coins: COINS }),
      });
      return;
    }

    if (path === "/api/crypto-news" || path === "/api/news") {
      const limit = Number(url.searchParams.get("limit") ?? "10");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          source: "newsdata.io",
          status: 200,
          syncedAt: "2026-04-22T12:20:00.000Z",
          refreshedFromUpstream: true,
          market: createNewsItems("Market").slice(0, limit),
          crypto: createNewsItems("Crypto").slice(0, limit),
          tech: createNewsItems("Tech").slice(0, limit),
          error: null,
          warning: null,
        }),
      });
      return;
    }

    if (path.startsWith("/api/market/") && path.endsWith("/history")) {
      const parts = path.split("/");
      const symbol = decodeURIComponent(parts[3] ?? "BTCUSDT");
      const range = url.searchParams.get("range") ?? "live";
      const interval = url.searchParams.get("interval") ?? RANGE_TO_INTERVAL[range] ?? "1m";
      const limit =
        Number(url.searchParams.get("limit") ?? String(RANGE_TO_LIMIT[range] ?? 60)) || 60;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          symbol,
          interval,
          candles: createCandles(symbol, interval, limit),
        }),
      });
      return;
    }

    if (path.startsWith("/api/prediction/") && path.endsWith("/history")) {
      const parts = path.split("/");
      const symbol = decodeURIComponent(parts[3] ?? "BTCUSDT");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          symbol,
          interval: "15m",
          history: createPredictionHistory(symbol),
        }),
      });
      return;
    }

    if (path.startsWith("/api/prediction/")) {
      const parts = path.split("/");
      const symbol = decodeURIComponent(parts[3] ?? "BTCUSDT");
      const interval = url.searchParams.get("interval") ?? "15m";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          symbol,
          interval,
          prediction: createPrediction(symbol, interval),
        }),
      });
      return;
    }

    await route.continue();
  });
}

test.describe("Crypto Prediction Dashboard Pages", () => {
  test.beforeEach(async ({ page }) => {
    await mockBackendApis(page);
  });

  test("Overview page watchlist search and navigation", async ({ page }) => {
    // 1. Load the overview page with a stable mocked API layer.
    await page.goto("/?range=live");

    // 2. Verify the main navigation shell is visible.
    await expect(page.getByText("CRYPTO PREDICTION DASHBOARD")).toBeVisible();
    await expect(page.getByRole("link", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Monitor & Predict" })).toBeVisible();
    await expect(page.getByRole("link", { name: "News" })).toBeVisible();
    await expect(page.getByRole("link", { name: "How It Works" })).toBeVisible();

    // 3. Verify the watchlist table renders and the search input filters symbols by short name or full name.
    await expect(page.getByRole("heading", { name: "Watchlist" })).toBeVisible();
    const watchlistSearch = page.getByPlaceholder("Search BTC, BNB, Bitcoin...");
    await watchlistSearch.fill("BN");
    await expect(page.locator("tbody tr").filter({ hasText: "BNB" })).toBeVisible();
    await expect(page.locator("tbody tr").filter({ hasText: "Bitcoin" })).toHaveCount(0);

    // 4. Click a filtered row and verify navigation to the monitor route for that symbol.
    await page.locator("tbody tr").filter({ hasText: "BNB" }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/BNBUSDT\?range=live$/);
  });

  test("Monitor page supports range changes, tracked coin search, and prediction history paging", async ({
    page,
  }) => {
    // 1. Load the detailed monitor view for BTC.
    await page.goto("/dashboard/BTCUSDT?range=live");

    // 2. Verify the monitor chart section and the key cards are visible.
    await expect(page.getByRole("heading", { name: "Bitcoin · BTC/USDT" })).toBeVisible();
    await expect(page.getByText("Selected Candle")).toBeVisible();
    await expect(page.getByText("Latest Price")).toBeVisible();
    await expect(page.getByText("Recent Prediction History")).toBeVisible();

    // 3. Switch the range and confirm the URL updates without losing the monitor layout.
    await page.getByRole("button", { name: "1 Week" }).click();
    await expect(page).toHaveURL(/\/dashboard\/BTCUSDT\?range=1w$/);
    await expect(page.getByRole("heading", { name: "Bitcoin · BTC/USDT" })).toBeVisible();

    // 4. Search tracked coins in the sidebar and switch to ETH.
    const trackedCoinSearch = page.getByPlaceholder("Search BTC, BNB, Bitcoin...");
    await trackedCoinSearch.fill("ETH");
    await page.getByRole("button", { name: /ETH Ethereum/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/ETHUSDT\?range=1w$/);
    await expect(page.getByRole("heading", { name: "Ethereum · ETH/USDT" })).toBeVisible();

    // 5. Open the second page of prediction history and verify pagination changes in place.
    await expect(page.getByText("Page 1 of 2")).toBeVisible();
    await page.getByRole("button", { name: "2" }).click();
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
  });

  test("Dashboard redirects keep users on a valid monitor route", async ({ page }) => {
    // 1. Open the dashboard index route and verify it redirects to the default symbol and range.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard\/BTCUSDT\?range=live$/);

    // 2. Open an invalid symbol and verify the app redirects back to the default tracked coin.
    await page.goto("/dashboard/not-a-coin?range=1w");
    await expect(page).toHaveURL(/\/dashboard\/BTCUSDT\?range=1w$/);
  });

  test("News page renders Market, Crypto, and Tech rows with article pagination", async ({ page }) => {
    // 1. Load the News page with three mocked categories of stories.
    await page.goto("/latest-news");

    // 2. Verify the page shell and section headings are visible.
    await expect(page.getByRole("link", { name: "News" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Market and technology stories" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Market" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Crypto" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tech" })).toBeVisible();

    // 3. Verify article links are real links and not dead buttons.
    await expect(page.getByRole("link", { name: "Read more" }).first()).toHaveAttribute(
      "href",
      /https:\/\/example\.com\//,
    );

    // 4. Move the Market row to page 2 and verify the row pagination updates.
    const marketRow = page.locator("div").filter({
      has: page.getByRole("heading", { name: "Market", exact: true }),
    }).first();
    await expect(marketRow.getByText("Page 1 of 4")).toBeVisible();
    await marketRow.getByRole("button", { name: "2" }).click();
    await expect(marketRow.getByText("Page 2 of 4")).toBeVisible();
  });

  test("How It Works page includes the workflow steps and integrated feature row", async ({ page }) => {
    // 1. Load the combined How It Works page.
    await page.goto("/how-it-works");

    // 2. Verify the five-step workflow section is visible.
    await expect(page.getByRole("heading", { name: "From historical candles to live model signals" })).toBeVisible();
    await expect(page.getByText("Historical Market Data")).toBeVisible();
    await expect(page.getByText("Model Training")).toBeVisible();
    await expect(page.getByText("Live Market Stream")).toBeVisible();
    await expect(page.getByText("Real-Time Prediction")).toBeVisible();
    await expect(page.getByText("Dashboard Visualization")).toBeVisible();

    // 3. Verify the old Features content is now rendered as the second row on the same page.
    await expect(page.getByRole("heading", { name: "A technical breakdown of the monitoring stack" })).toBeVisible();
    await expect(page.getByText("Beginner-friendly ML baseline")).toBeVisible();
    await expect(page.getByText("Backend-only external integrations")).toBeVisible();
  });
});
