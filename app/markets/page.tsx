import { DiscoverShell } from "@/components/discover/shell";
import { Markets } from "@/components/markets/markets";
import { DEFAULT_CHART_RANGE } from "@/lib/constants";
import { parseChartRange } from "@/lib/utils";

export default async function MarketsPage({ searchParams }: { searchParams: Promise<{ range?: string; interval?: string }> }) {
  const query = await searchParams;
  const range = parseChartRange(query.range ?? query.interval);
  return <DiscoverShell title="Markets"><Markets range={range ?? DEFAULT_CHART_RANGE} /></DiscoverShell>;
}

export const metadata = { title: "Markets · Crypto Prediction" };
