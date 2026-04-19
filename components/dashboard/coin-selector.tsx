"use client";

import type { Coin } from "@/types/market";
import { cn } from "@/lib/utils";

type CoinSelectorProps = {
  coins: Coin[];
  value: string;
  onChange: (symbol: string) => void;
};

export function CoinSelector({ coins, value, onChange }: CoinSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {coins.map((coin) => {
        const selected = coin.symbol === value;
        return (
          <button
            key={coin.symbol}
            type="button"
            onClick={() => onChange(coin.symbol)}
            className={cn(
              "rounded-xl border px-3 py-2 text-sm transition",
              selected
                ? "border-cyan-300/50 bg-cyan-500/15 text-cyan-100"
                : "border-white/10 bg-slate-900/70 text-slate-300 hover:border-white/25 hover:text-white",
            )}
          >
            {coin.symbol.replace("USDT", "")}
          </button>
        );
      })}
    </div>
  );
}
