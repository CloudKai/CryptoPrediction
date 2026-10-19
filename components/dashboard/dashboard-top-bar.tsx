import Link from "next/link";

import { DEFAULT_CHART_RANGE, DEFAULT_SYMBOL } from "@/lib/constants";

type DashboardTopBarProps = {
  activeTab?: "overview" | "monitor" | "how-it-works" | "news";
  overviewHref?: string;
  monitorHref?: string;
};

export function DashboardTopBar({
  activeTab = "overview",
  overviewHref = "/",
  monitorHref = `/dashboard/${DEFAULT_SYMBOL}?range=${DEFAULT_CHART_RANGE}`,
}: DashboardTopBarProps) {
  const tabs = [
    { href: overviewHref, label: "Overview", id: "overview" as const },
    { href: monitorHref, label: "Monitor & Predict", id: "monitor" as const },
    { href: "/latest-news", label: "News", id: "news" as const },
    { href: "/how-it-works", label: "How It Works", id: "how-it-works" as const },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-cyan-400/15 p-1.5 ring-1 ring-cyan-300/35">
              <div className="size-full rounded-lg bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.55)]" />
            </div>
            <div>
              <p className="font-mono text-sm font-semibold tracking-[0.18em] text-slate-100">
                CRYPTO PREDICTION DASHBOARD
              </p>
              <p className="text-xs text-slate-400">Real-time monitoring, model signals, and market context</p>
            </div>
          </Link>

          <div className="hidden rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-400 md:block">
            Backend-facing data only
          </div>
        </div>

        <nav className="overflow-x-auto">
          <div className="inline-flex min-w-full items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-1.5">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm transition ${
                  activeTab === tab.id
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
