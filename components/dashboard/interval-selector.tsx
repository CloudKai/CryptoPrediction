"use client";

import { SUPPORTED_INTERVALS } from "@/lib/constants";
import type { Interval } from "@/types/market";
import { cn } from "@/lib/utils";

type IntervalSelectorProps = {
  value: Interval;
  onChange: (interval: Interval) => void;
};

export function IntervalSelector({ value, onChange }: IntervalSelectorProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/70 p-1">
      {SUPPORTED_INTERVALS.map((interval) => {
        const selected = value === interval;
        return (
          <button
            key={interval}
            type="button"
            onClick={() => onChange(interval)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
              selected
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )}
          >
            {interval}
          </button>
        );
      })}
    </div>
  );
}
