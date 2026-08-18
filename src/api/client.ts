export type ApiErrorPayload = {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  recoverable?: boolean;
  retryable?: boolean;
  correlationId?: string;
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

const API_BASE_URL = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_BASE_URL ?? "";

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
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    throw new ApiError(payload?.message ?? `Request failed (${response.status})`, response.status, payload);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
