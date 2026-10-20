import type { Metadata } from "next";
import { DiscoverResults } from "@/components/discover/results";

export const metadata: Metadata = { title: "Allocation results" };
export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ request?: string; saved?: string }> }) {
  const query = await searchParams;
  return <DiscoverResults requestId={typeof query.request === "string" ? query.request : undefined} savedId={typeof query.saved === "string" ? query.saved : undefined} />;
}
