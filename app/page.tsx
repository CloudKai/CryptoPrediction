import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { DEFAULT_CHART_RANGE, DEFAULT_SYMBOL } from "@/lib/constants";
import { parseChartRange } from "@/lib/utils";

type HomePageProps = {
  searchParams: Promise<{ range?: string; interval?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const query = await searchParams;
  const range = parseChartRange(query.range ?? query.interval);

  return (
    <DashboardClient
      key={`${DEFAULT_SYMBOL}-${range}-home`}
      symbol={DEFAULT_SYMBOL}
      range={range ?? DEFAULT_CHART_RANGE}
      view="overview"
    />
  );
}
