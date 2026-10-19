import type { ChartRange, Interval, MarketStreamEvent, StreamConnectionStatus } from "@/types/market";

type StreamCallbacks = {
  onStatus: (status: StreamConnectionStatus) => void;
  onEvent: (event: MarketStreamEvent) => void;
};

export type MarketStreamAdapter = {
  subscribe: (
    symbol: string,
    range: ChartRange,
    interval: Interval,
    callbacks: StreamCallbacks,
  ) => () => void;
};

function createDisabledAdapter(): MarketStreamAdapter {
  return {
    subscribe(_symbol, _range, _interval, callbacks) {
      callbacks.onStatus("disconnected");
      return () => {
        callbacks.onStatus("disconnected");
      };
    },
  };
}

function createWebSocketAdapter(wsBaseUrl: string): MarketStreamAdapter {
  return {
    subscribe(symbol, range, interval, callbacks) {
      callbacks.onStatus("connecting");
      const wsUrl = new URL(wsBaseUrl);
      wsUrl.searchParams.set("symbol", symbol);
      wsUrl.searchParams.set("range", range);
      wsUrl.searchParams.set("interval", interval);
      const socket = new WebSocket(wsUrl.toString());

      socket.onopen = () => callbacks.onStatus("connected");

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as MarketStreamEvent;
          callbacks.onEvent(payload);
        } catch {
          callbacks.onStatus("reconnecting");
        }
      };

      socket.onerror = () => callbacks.onStatus("reconnecting");
      socket.onclose = () => callbacks.onStatus("disconnected");

      return () => {
        socket.close();
        callbacks.onStatus("disconnected");
      };
    },
  };
}

export function createMarketStreamAdapter(): MarketStreamAdapter {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (wsUrl) {
    return createWebSocketAdapter(wsUrl);
  }
  return createDisabledAdapter();
}
