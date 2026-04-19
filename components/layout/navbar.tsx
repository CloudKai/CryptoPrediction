import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-cyan-400/20 ring-1 ring-cyan-300/40">
            <div className="m-1.5 size-5 rounded-md bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.6)]" />
          </div>
          <span className="font-mono text-sm font-semibold tracking-wider text-slate-100">
            CRYPTO PREDICTION DASHBOARD
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="#features" className="transition hover:text-cyan-200">
            Features
          </a>
          <a href="#how-it-works" className="transition hover:text-cyan-200">
            How It Works
          </a>
          <a href="#why-project" className="transition hover:text-cyan-200">
            Why This Project
          </a>
        </nav>

        <Link
          href="/dashboard"
          className="rounded-xl border border-cyan-300/50 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-400/20"
        >
          Open Dashboard
        </Link>
      </div>
    </header>
  );
}
