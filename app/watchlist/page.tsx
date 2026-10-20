import type { Metadata } from "next";
import { DiscoverShell } from "@/components/discover/shell";
import { LocalWatchlist } from "@/components/discover/saved-and-watchlist";
export const metadata: Metadata = { title: "Watchlist" };
export default function WatchlistPage() { return <DiscoverShell title="Watchlist"><LocalWatchlist /></DiscoverShell>; }
