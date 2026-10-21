import type { CSSProperties } from "react";

export function Icon({ name, size = 20, style }: { name: "discover" | "markets" | "stocks" | "watchlist" | "invested" | "user" | "arrow" | "back" | "check" | "info" | "external" | "lock" | "chevron" | "close"; size?: number; style?: CSSProperties }) {
  const paths = {
    discover: <><circle cx="12" cy="12" r="8.5" /><path d="m15.7 8.3-2 5.4-5.4 2 2-5.4z" /></>,
    markets: <><path d="M4 19V5M4 19h16M8 14l4-5 4 3 4-7" /></>,
    stocks: <><path d="m3 9 9-5 9 5H3ZM5 20h14M7 10v7m5-7v7m5-7v7" /></>,
    watchlist: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />,
    invested: <><rect x="3.5" y="7" width="17" height="13" rx="2" /><path d="M8 7V4h8v3M3.5 12h17M10 12v3h4v-3" /></>,
    user: <><circle cx="12" cy="8" r="3" /><path d="M5 21v-2a7 7 0 0 1 14 0v2" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    back: <path d="M20 12H4m6-6-6 6 6 6" />,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7v.1" /></>,
    external: <><path d="M14 4h6v6m0-6-9 9M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></>,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" /></>,
    chevron: <path d="m8 5 7 7-7 7" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>{paths[name]}</svg>;
}
