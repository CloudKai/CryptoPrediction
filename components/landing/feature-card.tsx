import type { ReactNode } from "react";

type FeatureCardProps = {
  title: string;
  description: string;
  icon: ReactNode;
};

export function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <article className="glass-panel group rounded-2xl p-5 transition hover:-translate-y-1 hover:border-cyan-200/30">
      <div className="mb-3 inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-cyan-200">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
    </article>
  );
}
