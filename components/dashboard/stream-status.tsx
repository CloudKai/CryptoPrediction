import type { StreamConnectionStatus } from "@/types/market";
import { cn } from "@/lib/utils";

type StreamStatusProps = {
  status: StreamConnectionStatus;
};

const statusText: Record<StreamConnectionStatus, string> = {
  connecting: "Connecting",
  connected: "Connected",
  reconnecting: "Reconnecting",
  disconnected: "Disconnected",
};

const statusColor: Record<StreamConnectionStatus, string> = {
  connecting: "bg-amber-300",
  connected: "bg-emerald-300",
  reconnecting: "bg-amber-300",
  disconnected: "bg-rose-300",
};

export function StreamStatus({ status }: StreamStatusProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
      <span className={cn("size-2 rounded-full", statusColor[status])} />
      <span>{statusText[status]}</span>
    </div>
  );
}
