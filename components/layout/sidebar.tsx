import type { Coin, StreamConnectionStatus } from "@/types/market";
import { cn } from "@/lib/utils";

type SidebarProps = {
  coins: Coin[];
  selectedSymbol: string;
  streamStatus: StreamConnectionStatus;
  onSelect: (symbol: string) => void;
};

const statusStyles: Record<StreamConnectionStatus, string> = {
  connecting: "bg-amber-400/30 text-amber-200 ring-amber-300/40",
  connected: "bg-emerald-500/25 text-emerald-200 ring-emerald-300/40",
  reconnecting: "bg-amber-400/30 text-amber-200 ring-amber-300/40",
  disconnected: "bg-rose-500/25 text-rose-200 ring-rose-300/40",
};

export function Sidebar({ coins, selectedSymbol, streamStatus, onSelect }: SidebarProps) {
  return (
    <aside className="glass-panel h-fit rounded-2xl p-4 lg:sticky lg:top-6">
      <div className="mb-4 border-b border-white/10 pb-4">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Control center</p>
        <h2 className="mt-2 text-lg font-semibold text-white">Market Overview</h2>
      </div>

      <div className="mb-5 rounded-xl border border-white/10 bg-slate-900/60 p-3">
        <p className="text-xs text-slate-400">Stream status</p>
        <div
          className={cn(
            "mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
            statusStyles[streamStatus],
          )}
        >
          {streamStatus.toUpperCase()}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-400">Tracked coins</p>
        <ul className="space-y-1.5">
          {coins.map((coin) => {
            const active = coin.symbol === selectedSymbol;
            return (
              <li key={coin.symbol}>
                <button
                  type="button"
                  onClick={() => onSelect(coin.symbol)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-2 text-left transition",
                    active
                      ? "border-cyan-300/50 bg-cyan-500/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.15)]"
                      : "border-white/10 bg-slate-900/70 text-slate-300 hover:border-white/25 hover:text-white",
                  )}
                >
                  <p className="font-medium">{coin.symbol.replace("USDT", "")}</p>
                  <p className="text-xs text-slate-400">{coin.displayName}</p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
