import type { ApiEnvelope, SmartMoneyCheckResponse, StartSmartMoneyCheckRequest } from "@spotriq/api-contracts";
import type { CheckSession, Finding, SmartMoneyPortfolioSnapshot, WalletControlState } from "../domain/types";
import { apiRequest } from "../api/client";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

export interface SmartMoneyCheckView {
  session: CheckSession;
  portfolio?: SmartMoneyPortfolioSnapshot;
  findings: Finding[];
}

export interface SmartMoneyRepository {
  startCheck(walletAddress: string, walletControl?: WalletControlState): Promise<SmartMoneyCheckView>;
  getCheck(checkSessionId: string): Promise<SmartMoneyCheckView>;
}

export class ApiSmartMoneyRepository implements SmartMoneyRepository {
  async startCheck(walletAddress: string, walletControl: WalletControlState = "WATCH_ONLY") {
    const payload: StartSmartMoneyCheckRequest = { walletAddress, walletControl };
    return unwrap(await apiRequest<ApiEnvelope<SmartMoneyCheckResponse>>("/v1/checks", {
      method: "POST",
      body: JSON.stringify(payload),
    }));
  }

  async getCheck(checkSessionId: string) {
    return unwrap(await apiRequest<ApiEnvelope<SmartMoneyCheckResponse>>(`/v1/checks/${encodeURIComponent(checkSessionId)}`));
  }
}

export const smartMoneyRepository: SmartMoneyRepository = new ApiSmartMoneyRepository();

export const ACTIVE_CHECK_STORAGE_KEY = "spotriq.activeCheckSessionId";
export const CHECK_MODE_STORAGE_KEY = "spotriq.checkMode";

export function setActiveLiveCheck(checkSessionId: string) {
  sessionStorage.setItem(ACTIVE_CHECK_STORAGE_KEY, checkSessionId);
  sessionStorage.setItem(CHECK_MODE_STORAGE_KEY, "live");
}

export function setExampleCheckMode() {
  sessionStorage.removeItem(ACTIVE_CHECK_STORAGE_KEY);
  sessionStorage.setItem(CHECK_MODE_STORAGE_KEY, "example");
}

export function getActiveCheckMode(): "live" | "example" {
  return sessionStorage.getItem(CHECK_MODE_STORAGE_KEY) === "live" ? "live" : "example";
}

export function getActiveCheckSessionId(): string | undefined {
  return sessionStorage.getItem(ACTIVE_CHECK_STORAGE_KEY) ?? undefined;
}
