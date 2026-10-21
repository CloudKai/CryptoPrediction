import { DiscoverShell } from "@/components/discover/shell";
import { AssetBrowser } from "@/components/markets/asset-browser";
export default function StocksPage() {
  return <DiscoverShell title="Stocks"><AssetBrowser kind="stocks" /></DiscoverShell>;
}
export const metadata = { title: "Stocks · Crypto Prediction" };
