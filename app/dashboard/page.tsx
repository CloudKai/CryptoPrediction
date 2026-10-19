import { redirect } from "next/navigation";

import { DEFAULT_CHART_RANGE, DEFAULT_SYMBOL } from "@/lib/constants";

export default function DashboardRedirectPage() {
  redirect(`/dashboard/${DEFAULT_SYMBOL}?range=${DEFAULT_CHART_RANGE}`);
}
