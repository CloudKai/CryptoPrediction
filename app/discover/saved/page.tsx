import type { Metadata } from "next";
import { SavedProposals } from "@/components/discover/saved-and-watchlist";
export const metadata: Metadata = { title: "Saved proposals" };
export default function SavedPage() { return <SavedProposals />; }
