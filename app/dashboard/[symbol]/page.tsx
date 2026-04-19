import { redirect } from "next/navigation";

import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { DEFAULT_SYMBOL, TRACKED_COINS } from "@/lib/constants";
import { parseInterval } from "@/lib/utils";

type DashboardPageProps = {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ interval?: string }>;
};

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { symbol: rawSymbol } = await params;
  const query = await searchParams;
  const interval = parseInterval(query.interval);
  const symbol = rawSymbol.toUpperCase();
  const isValidSymbol = TRACKED_COINS.some((coin) => coin.symbol === symbol);

  if (!isValidSymbol) {
    redirect(`/dashboard/${DEFAULT_SYMBOL}?interval=${interval}`);
  }

  return <DashboardClient symbol={symbol} interval={interval} />;
}
