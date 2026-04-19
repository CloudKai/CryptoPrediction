export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950/80">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-slate-400 lg:px-10 md:flex-row md:items-center md:justify-between">
        <p>Crypto Prediction Dashboard · Portfolio analytics project</p>
        <p className="font-mono text-xs tracking-wide text-slate-500">
          Research and visualization only · No trading execution
        </p>
      </div>
    </footer>
  );
}
