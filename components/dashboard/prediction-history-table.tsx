"use client";

import { useMemo, useState } from "react";

import type { PredictionHistoryEntry } from "@/types/market";
import { formatPrice, formatTimestamp } from "@/lib/utils";
import { PredictionBadge } from "@/components/dashboard/prediction-badge";

type PredictionHistoryTableProps = {
  rows: PredictionHistoryEntry[];
};

const PAGE_SIZE = 10;

export function PredictionHistoryTable({ rows }: PredictionHistoryTableProps) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [currentPage, rows]);

  return (
    <div className="glass-panel overflow-hidden rounded-2xl">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-white">Recent Prediction History</h3>
            <p className="text-xs text-slate-400">
              Fifteen-minute forecasts, resolved against the price at prediction time.
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.13em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Predicted At</th>
              <th className="px-4 py-3 text-center font-medium">Prediction</th>
              <th className="px-4 py-3 text-center font-medium">Actual</th>
              <th className="px-4 py-3 text-right font-medium">Confidence</th>
              <th className="px-4 py-3 text-right font-medium">Start Price</th>
              <th className="px-4 py-3 text-left font-medium">Resolved At</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.map((row) => (
              <tr key={row.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-slate-300">{formatTimestamp(row.createdAt)}</td>
                <td className="px-4 py-3 text-center">
                  <PredictionBadge direction={row.direction} />
                </td>
                <td className="px-4 py-3 text-center">
                  {row.actualDirection ? (
                    <PredictionBadge direction={row.actualDirection} />
                  ) : (
                    <span className="text-xs text-slate-500">Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-100">
                  {row.confidence.toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-300">
                  ${formatPrice(row.price)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {row.resolvedAt ? formatTimestamp(row.resolvedAt) : "Pending"}
                </td>
              </tr>
            ))}
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-400">
                  No prediction history yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
            const active = pageNumber === currentPage;
            return (
              <button
                key={pageNumber}
                type="button"
                onClick={() => setPage(pageNumber)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-cyan-300/40 bg-cyan-400 text-slate-950"
                    : "border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
