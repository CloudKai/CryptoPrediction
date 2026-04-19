import type { PredictionHistoryEntry } from "@/types/market";
import { formatPrice, formatTimestamp } from "@/lib/utils";
import { PredictionBadge } from "@/components/dashboard/prediction-badge";

type PredictionHistoryTableProps = {
  rows: PredictionHistoryEntry[];
};

export function PredictionHistoryTable({ rows }: PredictionHistoryTableProps) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="font-semibold text-white">Recent Prediction History</h3>
        <p className="text-xs text-slate-400">
          Last model outputs for this symbol and interval.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.13em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Timestamp</th>
              <th className="px-4 py-3 text-center font-medium">Direction</th>
              <th className="px-4 py-3 text-right font-medium">Confidence</th>
              <th className="px-4 py-3 text-right font-medium">Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-slate-300">{formatTimestamp(row.createdAt)}</td>
                <td className="px-4 py-3 text-center">
                  <PredictionBadge direction={row.direction} />
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-100">
                  {row.confidence.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-300">
                  ${formatPrice(row.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
