import type { Metadata } from "next";
import { DiscoverForm } from "@/components/discover/discover-form";
import { DiscoverShell } from "@/components/discover/shell";

export const metadata: Metadata = { title: "Discover", description: "Build a cryptocurrency allocation request from your budget, preferences, and investment profile." };

export default function HomePage() {
  return <DiscoverShell><DiscoverForm /></DiscoverShell>;
}
