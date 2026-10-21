import { DiscoverShell } from "@/components/discover/shell";
import { AssetBrowser } from "@/components/markets/asset-browser";

export default function MarketsPage() {
  return <DiscoverShell title="Crypto"><AssetBrowser kind="crypto" /></DiscoverShell>;
}

export const metadata = { title: "Crypto · Crypto Prediction" };
