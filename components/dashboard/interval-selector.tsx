"use client";

import { CHART_RANGE_OPTIONS } from "@/lib/constants";
import type { ChartRange } from "@/types/market";
import { cn } from "@/lib/utils";

type IntervalSelectorProps = {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
};

export function IntervalSelector({ value, onChange }: IntervalSelectorProps) {
  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-1">
      {CHART_RANGE_OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
              selected
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
