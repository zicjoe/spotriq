import type { SmartMoneyCheckEvent } from "../domain/types";
import { getActiveCheckSessionId, smartMoneyRepository } from "../repositories/smartMoneyRepository";
import { subscribeToSse, type RealtimeSubscription } from "./sseClient";

export function subscribeToSmartMoneyCheck(
  checkSessionId: string,
  onEvent: (event: SmartMoneyCheckEvent) => void,
  onTerminal: () => void,
  onError?: (error: unknown) => void,
): RealtimeSubscription {
  let closed = false;
  let fallbackTimer: number | undefined;
  const subscription = subscribeToSse<SmartMoneyCheckEvent>(
    `/v1/checks/${encodeURIComponent(checkSessionId)}/events`,
    (message) => {
      const event = message.data;
      if (!event || typeof event !== "object") return;
      onEvent(event);
      if (event.type === "check.completed" || event.type === "check.failed") onTerminal();
    },
    () => {
      if (closed || fallbackTimer !== undefined) return;
      fallbackTimer = window.setInterval(async () => {
        try {
          const currentId = getActiveCheckSessionId();
          if (!currentId || currentId !== checkSessionId) return;
          const session = await smartMoneyRepository.getCheckStatus(checkSessionId);
          if (["COMPLETED", "PARTIAL", "FAILED"].includes(session.state)) {
            if (fallbackTimer !== undefined) window.clearInterval(fallbackTimer);
            fallbackTimer = undefined;
            onTerminal();
          }
        } catch (error) {
          onError?.(error);
        }
      }, 1200);
    },
  );

  return {
    close() {
      closed = true;
      subscription.close();
      if (fallbackTimer !== undefined) window.clearInterval(fallbackTimer);
    },
  };
}
