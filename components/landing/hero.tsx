import Link from "next/link";

import { HeroMarketMock } from "@/components/landing/hero-market-mock";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-6 pb-14 pt-16 lg:px-10 lg:pt-24">
      <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="animate-fade-up">
          <p className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-medium tracking-[0.14em] text-cyan-100 uppercase">
            Real-time crypto analytics
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
            Crypto Prediction Dashboard
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            Monitor multi-coin market structure and model outputs in one live workspace, with
            next-interval UP or DOWN prediction signals and confidence context.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Launch Dashboard
            </Link>
            <a
              href="#how-it-works"
              className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-white/45 hover:text-white"
            >
              See architecture
            </a>
          </div>
        </div>
        <div className="animate-fade-up [animation-delay:120ms]">
          <HeroMarketMock />
        </div>
      </div>
    </section>
  );
}
