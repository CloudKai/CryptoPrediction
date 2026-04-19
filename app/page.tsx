import { FeatureCard } from "@/components/landing/feature-card";
import { Hero } from "@/components/landing/hero";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

const FEATURES = [
  {
    title: "Historical REST snapshots",
    description:
      "Loads market candle history from your backend API for robust context before each prediction update.",
  },
  {
    title: "Live stream synchronization",
    description:
      "Ingests backend stream updates to keep chart candles, predictions, and watchlist metrics reactive in near real time.",
  },
  {
    title: "Model signal clarity",
    description:
      "Each symbol surfaces next-interval UP or DOWN direction with confidence and timestamp for clear decision context.",
  },
  {
    title: "Multi-coin monitoring",
    description:
      "Track around 10 core symbols in one dashboard with symbol switching, watchlist comparison, and recent prediction history.",
  },
];

function CardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 18L9 11L13 14L20 6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 6H20V10" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute left-0 top-0 h-[480px] w-[480px] rounded-full bg-cyan-500/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-blue-500/15 blur-[120px]" />
      </div>
      <Navbar />

      <main className="relative z-10">
        <Hero />

        <section id="features" className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-10">
          <div className="mb-8 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.15em] text-cyan-200/80">Key features</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Built for real-time crypto analytics</h2>
            <p className="mt-3 text-slate-300">
              A clean frontend and integration layer designed to plug into your Python model service.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <FeatureCard
                key={feature.title}
                title={feature.title}
                description={feature.description}
                icon={<CardIcon />}
              />
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto w-full max-w-7xl px-6 pb-16 lg:px-10">
          <div className="glass-panel rounded-3xl p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.15em] text-cyan-200/80">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">Backend-first data flow</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <p className="font-semibold text-white">1. Historical REST data</p>
                <p className="mt-2 text-sm text-slate-300">
                  Backend fetches and serves historical candles for selected symbols and intervals.
                </p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <p className="font-semibold text-white">2. Offline ML inference</p>
                <p className="mt-2 text-sm text-slate-300">
                  Model predicts next interval direction and confidence, then exposes results via API.
                </p>
              </article>
              <article className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <p className="font-semibold text-white">3. Live stream updates</p>
                <p className="mt-2 text-sm text-slate-300">
                  Backend stream pushes candle and prediction updates; dashboard reconciles data in real time.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="why-project" className="mx-auto w-full max-w-7xl px-6 pb-20 lg:px-10">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="glass-panel rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.15em] text-cyan-200/80">Why this project</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Portfolio-ready full stack architecture</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Demonstrates strong frontend engineering with a clear backend contract, production-ready UI
                patterns, typed data pipelines, loading/error states, and stream-driven updates.
              </p>
            </article>
            <article className="glass-panel rounded-2xl p-6">
              <p className="text-xs uppercase tracking-[0.15em] text-cyan-200/80">Project intent</p>
              <h3 className="mt-3 text-2xl font-semibold text-white">Research and analytics only</h3>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                This dashboard is for market observation and model output visualization. It does not place
                trades or claim guaranteed prediction outcomes.
              </p>
            </article>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
