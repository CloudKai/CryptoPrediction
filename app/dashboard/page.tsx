import { redirect } from "next/navigation";

import { DEFAULT_INTERVAL, DEFAULT_SYMBOL } from "@/lib/constants";

export default function DashboardRedirectPage() {
  redirect(`/dashboard/${DEFAULT_SYMBOL}?interval=${DEFAULT_INTERVAL}`);
}
