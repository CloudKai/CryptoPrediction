import { cn } from "@/lib/utils";

type SkeletonCardProps = {
  className?: string;
};

export function SkeletonCard({ className }: SkeletonCardProps) {
  return <div className={cn("skeleton rounded-2xl border border-white/10 bg-slate-900/60", className)} />;
}
