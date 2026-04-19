import { cn } from "@/lib/utils";

type ConfidenceMeterProps = {
  confidence: number;
};

export function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const rounded = Math.max(0, Math.min(100, confidence));
  const tone =
    rounded >= 75
      ? "bg-emerald-400"
      : rounded >= 60
        ? "bg-cyan-400"
        : rounded >= 50
          ? "bg-amber-400"
          : "bg-rose-400";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Model confidence</span>
        <span className="font-mono text-slate-200">{rounded.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10">
        <div
          className={cn("h-full rounded-full transition-all duration-300", tone)}
          style={{ width: `${rounded}%` }}
        />
      </div>
    </div>
  );
}
