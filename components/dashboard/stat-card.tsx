import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
};

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <article className="glass-panel rounded-2xl p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <div className="mt-2 text-xs text-slate-400">{hint}</div> : null}
    </article>
  );
}
