import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { DEFAULT_CHART_RANGE, DEFAULT_SYMBOL } from "@/lib/constants";

type InfoPageShellProps = {
  activeTab: "how-it-works" | "news";
  children: React.ReactNode;
};

export function InfoPageShell({ activeTab, children }: InfoPageShellProps) {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-75">
        <div className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full bg-cyan-500/16 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[460px] w-[460px] rounded-full bg-blue-500/12 blur-[120px]" />
      </div>

      <DashboardTopBar
        activeTab={activeTab}
        overviewHref={`/?range=${DEFAULT_CHART_RANGE}`}
        monitorHref={`/dashboard/${DEFAULT_SYMBOL}?range=${DEFAULT_CHART_RANGE}`}
      />

      <main className="relative z-10 mx-auto w-full max-w-[1600px] px-4 py-6 lg:px-6">
        {children}
      </main>
    </div>
  );
}
