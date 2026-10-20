import type { ReactNode } from "react";
import { DiscoverShell } from "@/components/discover/shell";

export default function DiscoverLayout({ children }: { children: ReactNode }) {
  return <DiscoverShell>{children}</DiscoverShell>;
}
