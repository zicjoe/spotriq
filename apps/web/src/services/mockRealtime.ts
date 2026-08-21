/**
 * Prototype realtime adapter.
 *
 * All timer-based behaviour is intentionally isolated here so UI components do
 * not depend on setTimeout. Replace these functions with EventSource/SSE-backed
 * adapters when the real API is connected.
 */

export type CheckEvent =
  | { type: "check.started" }
  | { type: "check.source.completed"; progress: number }
  | { type: "check.completed"; progress: 6 };

export function subscribeToMockCheck(
  onEvent: (event: CheckEvent) => void,
  onComplete: () => void,
) {
  onEvent({ type: "check.started" });

  const timers = [1, 2, 3, 4, 5, 6].map((progress, index) =>
    window.setTimeout(() => {
      if (progress === 6) {
        onEvent({ type: "check.completed", progress: 6 });
        window.setTimeout(onComplete, 350);
        return;
      }

      onEvent({
        type: "check.source.completed",
        progress: progress as 1 | 2 | 3 | 4 | 5,
      });
    }, 650 * (index + 1)),
  );

  return () => timers.forEach(window.clearTimeout);
}

export type MockActivationResult = {
  permissionGrant: {
    permissionGrantId: string;
    state: "ACTIVE";
  };
  activation: {
    activationId: string;
    state: "ACTIVE";
  };
};

/**
 * Prototype activation adapter. The production implementation will perform:
 * checkout intent validation -> wallet handler -> permission reconciliation ->
 * activation runtime handshake. Permission and activation remain separate
 * resources even in this mock result.
 */
export async function runMockActivation(): Promise<MockActivationResult> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 900));
  const suffix = Date.now().toString(36);
  return {
    permissionGrant: {
      permissionGrantId: `pg-demo-${suffix}`,
      state: "ACTIVE",
    },
    activation: {
      activationId: `act-demo-${suffix}`,
      state: "ACTIVE",
    },
  };
}

export async function runMockAgentTest(): Promise<{ status: "PASSED"; environment: "SIMULATION" }> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 800));
  return { status: "PASSED", environment: "SIMULATION" };
}

