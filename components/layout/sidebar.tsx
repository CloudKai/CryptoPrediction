"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { Coin } from "@/types/market";

type SidebarProps = {
  coins: Coin[];
  selectedSymbol: string;
  onSelect: (symbol: string) => void;
};

export function Sidebar({ coins, selectedSymbol, onSelect }: SidebarProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");

  const filteredCoins = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return coins;

    return coins.filter((coin) => {
      const shortSymbol = coin.symbol.replace("USDT", "").toLowerCase();
      const fullSymbol = coin.symbol.toLowerCase();
      const displayName = coin.displayName.toLowerCase();
      return (
        shortSymbol.includes(normalizedQuery) ||
        fullSymbol.includes(normalizedQuery) ||
        displayName.includes(normalizedQuery)
      );
    });
  }, [coins, query]);

  useEffect(() => {
    const list = listRef.current;
    const activeIndex = filteredCoins.findIndex((coin) => coin.symbol === selectedSymbol);
    if (!list || activeIndex < 0) return;

    const nextChild = list.children.item(activeIndex) as HTMLElement | null;
    if (!nextChild) return;

    nextChild.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [filteredCoins, selectedSymbol]);

  return (
    <aside className="glass-panel h-fit rounded-2xl p-4">
      <h2 className="mb-4 text-sm uppercase tracking-[0.16em] text-slate-400">Tracked Coins</h2>
      <label className="mb-3 block">
        <span className="sr-only">Search tracked coins</span>
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search BTC, BNB, Bitcoin..."
          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/40"
        />
      </label>

      <div
        ref={listRef}
        className="scrollbar-panel max-h-[26rem] space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/40 p-2"
      >
        {filteredCoins.map((coin) => {
          const active = coin.symbol === selectedSymbol;
          return (
            <button
              key={coin.symbol}
              type="button"
              onClick={() => onSelect(coin.symbol)}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-left transition",
                active
                  ? "border-cyan-300/50 bg-cyan-500/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.12)]"
                  : "border-white/10 bg-slate-900/70 text-slate-300 hover:border-white/25 hover:text-white",
              )}
            >
              <p className="text-sm font-medium">{coin.symbol.replace("USDT", "")}</p>
              <p className="truncate text-[11px] text-slate-400">{coin.displayName}</p>
            </button>
          );
        })}
        {filteredCoins.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-slate-950/40 px-3 py-4 text-sm text-slate-400">
            No tracked coins match your search.
          </div>
        ) : null}
      </div>
    </aside>
  );
}
