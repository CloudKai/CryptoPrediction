import type { PredictionDirection } from "@/types/market";
import { cn } from "@/lib/utils";

type PredictionBadgeProps = {
  direction: PredictionDirection;
  className?: string;
};

export function PredictionBadge({ direction, className }: PredictionBadgeProps) {
  const isUp = direction === "UP";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide",
        isUp
          ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
          : "border-rose-300/40 bg-rose-500/20 text-rose-100",
        className,
      )}
    >
      {direction}
    </span>
  );
}
