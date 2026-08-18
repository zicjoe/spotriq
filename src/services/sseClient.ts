export type RealtimeEvent<T = unknown> = {
  type: string;
  data: T;
};

export type RealtimeSubscription = {
  close(): void;
};

/**
 * Production-ready boundary for SSE streams. It is intentionally not wired to
 * the Figma demo flow yet; mockRealtime.ts implements the same conceptual role.
 */
export function subscribeToSse<T>(
  url: string,
  onEvent: (event: RealtimeEvent<T>) => void,
  onError?: (event: Event) => void,
): RealtimeSubscription {
  const source = new EventSource(url);

  source.onmessage = (message) => {
    try {
      const parsed = JSON.parse(message.data) as RealtimeEvent<T>;
      onEvent(parsed);
    } catch {
      onEvent({ type: "message", data: message.data as T });
    }
  };

  if (onError) source.onerror = onError;

  return {
    close: () => source.close(),
  };
}
