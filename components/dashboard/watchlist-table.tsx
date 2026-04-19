"use client";

import type { WatchlistRow } from "@/types/market";
import { formatCompactNumber, formatPercent, formatPrice, formatRelativeTime } from "@/lib/utils";
import { PredictionBadge } from "@/components/dashboard/prediction-badge";
import { cn } from "@/lib/utils";

type WatchlistTableProps = {
  rows: WatchlistRow[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
};

export function WatchlistTable({ rows, selectedSymbol, onSelect }: WatchlistTableProps) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="font-semibold text-white">Watchlist</h3>
        <p className="text-xs text-slate-400">Compare all tracked symbols in one view.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.13em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Symbol</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
              <th className="px-4 py-3 text-right font-medium">24h</th>
              <th className="px-4 py-3 text-right font-medium">Volume</th>
              <th className="px-4 py-3 text-center font-medium">Signal</th>
              <th className="px-4 py-3 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const selected = row.symbol === selectedSymbol;
              return (
                <tr
                  key={row.symbol}
                  onClick={() => onSelect(row.symbol)}
                  className={cn(
                    "cursor-pointer border-b border-white/5 transition hover:bg-white/5",
                    selected && "bg-cyan-500/10",
                  )}
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{row.symbol.replace("USDT", "")}</p>
                    <p className="text-xs text-slate-400">{row.displayName}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-100">
                    ${formatPrice(row.price)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-mono",
                      row.change24h >= 0 ? "text-emerald-300" : "text-rose-300",
                    )}
                  >
                    {formatPercent(row.change24h)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    {formatCompactNumber(row.volume24h)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <PredictionBadge direction={row.direction} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400">
                    {formatRelativeTime(row.updatedAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
