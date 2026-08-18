export type ApiErrorPayload = {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  recoverable?: boolean;
  retryable?: boolean;
  correlationId?: string;
  details?: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload?: ApiErrorPayload,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const env = (import.meta as ImportMeta & { env?: Record<string, string> }).env;
const API_BASE_URL = env?.VITE_SPOTRIQ_API_URL ?? env?.VITE_API_BASE_URL ?? "";

function normalizeApiError(value: unknown): ApiErrorPayload | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const candidate = record.error && typeof record.error === "object"
    ? record.error as Record<string, unknown>
    : record;
  return {
    code: typeof candidate.code === "string" ? candidate.code : undefined,
    message: typeof candidate.message === "string" ? candidate.message : undefined,
    recoverable: typeof candidate.recoverable === "boolean" ? candidate.recoverable : undefined,
    retryable: typeof candidate.retryable === "boolean" ? candidate.retryable : undefined,
    correlationId: typeof candidate.correlationId === "string" ? candidate.correlationId : undefined,
    details: candidate.details,
    fieldErrors: candidate.fieldErrors && typeof candidate.fieldErrors === "object"
      ? candidate.fieldErrors as Record<string, string[]>
      : undefined,
  };
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = normalizeApiError(await response.json());
    } catch {
      payload = undefined;
    }
    throw new ApiError(payload?.message ?? `Request failed (${response.status})`, response.status, payload);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
