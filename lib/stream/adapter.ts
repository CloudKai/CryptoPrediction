import type { Interval, MarketStreamEvent, StreamConnectionStatus } from "@/types/market";

type StreamCallbacks = {
  onStatus: (status: StreamConnectionStatus) => void;
  onEvent: (event: MarketStreamEvent) => void;
};

export type MarketStreamAdapter = {
  subscribe: (
    symbol: string,
    interval: Interval,
    callbacks: StreamCallbacks,
  ) => () => void;
};

function createSseAdapter(): MarketStreamAdapter {
  return {
    subscribe(symbol, interval, callbacks) {
      callbacks.onStatus("connecting");
      const source = new EventSource(
        `/api/market/stream?symbol=${encodeURIComponent(symbol)}&interval=${interval}`,
      );

      source.onopen = () => {
        callbacks.onStatus("connected");
      };

      source.onmessage = (messageEvent) => {
        try {
          const payload = JSON.parse(messageEvent.data) as MarketStreamEvent;
          callbacks.onEvent(payload);
        } catch {
          callbacks.onStatus("reconnecting");
        }
      };

      source.onerror = () => {
        callbacks.onStatus("reconnecting");
      };

      return () => {
        source.close();
        callbacks.onStatus("disconnected");
      };
    },
  };
}

function createWebSocketAdapter(wsBaseUrl: string): MarketStreamAdapter {
  return {
    subscribe(symbol, interval, callbacks) {
      callbacks.onStatus("connecting");
      const wsUrl = new URL(wsBaseUrl);
      wsUrl.searchParams.set("symbol", symbol);
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
  return createSseAdapter();
}
