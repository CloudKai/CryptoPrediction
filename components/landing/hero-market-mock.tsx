const MOCK_POINTS = [
  52, 48, 56, 61, 58, 67, 65, 73, 71, 79, 76, 83, 81, 90, 86, 94, 92, 99,
];

export function HeroMarketMock() {
  return (
    <div className="glass-panel relative overflow-hidden rounded-3xl border border-cyan-200/20 p-5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.2),transparent_55%)]" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Live Forecast Signal</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">BTC/USDT</h3>
          </div>
          <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/20 px-3 py-2 text-right">
            <p className="text-xs text-emerald-200">Prediction</p>
            <p className="text-lg font-bold text-emerald-100">UP · 82%</p>
          </div>
        </div>

        <div className="mt-6 flex h-40 items-end gap-1.5">
          {MOCK_POINTS.map((value, index) => {
            const isPositive = index % 3 !== 0;
            return (
              <div
                key={`${value}-${index}`}
                className={`w-full rounded-t-md ${
                  isPositive ? "bg-emerald-400/70" : "bg-rose-400/60"
                }`}
                style={{ height: `${value}%` }}
              />
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-300">
          <div className="rounded-lg border border-white/10 bg-slate-900/60 p-2">
            Price
            <p className="mt-1 font-mono text-sm text-slate-100">$68,243.11</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-900/60 p-2">
            24h change
            <p className="mt-1 font-mono text-sm text-emerald-300">+1.64%</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-900/60 p-2">
            Stream
            <p className="mt-1 font-mono text-sm text-cyan-200">Connected</p>
          </div>
        </div>
      </div>
    </div>
  );
}
