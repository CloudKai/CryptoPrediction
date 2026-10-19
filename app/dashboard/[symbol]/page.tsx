import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { DEFAULT_SYMBOL, TRACKED_COINS } from "@/lib/constants";
import { parseChartRange } from "@/lib/utils";

type DashboardPageProps = {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ range?: string; interval?: string }>;
};

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { symbol: rawSymbol } = await params;
  const query = await searchParams;
  const range = parseChartRange(query.range ?? query.interval);
  const symbol = rawSymbol.toUpperCase();
  const isValidSymbol = TRACKED_COINS.some((coin) => coin.symbol === symbol);

  if (!isValidSymbol) {
    redirect(`/dashboard/${DEFAULT_SYMBOL}?range=${range}`);
  }

  return <DashboardClient key={`${symbol}-${range}`} symbol={symbol} range={range} view="monitor" />;
}
