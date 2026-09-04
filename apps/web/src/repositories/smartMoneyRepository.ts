import type { ApiEnvelope, FindingServiceMatchesResponse, SmartMoneyCheckResponse, StartSmartMoneyCheckRequest } from "@spotriq/api-contracts";
import type { CheckSession, Finding, FindingServiceMatchPage, SmartMoneyPortfolioSnapshot, WalletControlState } from "../domain/types";
import type { BscNetwork } from "@spotriq/domain";
import { apiRequest } from "../api/client";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

export interface SmartMoneyCheckView {
  session: CheckSession;
  portfolio?: SmartMoneyPortfolioSnapshot;
  findings: Finding[];
}

export interface SmartMoneyRepository {
  startCheck(walletAddress: string, walletControl?: WalletControlState, network?: BscNetwork): Promise<SmartMoneyCheckView>;
  getCheckStatus(checkSessionId: string): Promise<CheckSession>;
  getCheck(checkSessionId: string): Promise<SmartMoneyCheckView>;
  getFindingMatches(checkSessionId: string, findingId: string, limit?: number): Promise<FindingServiceMatchPage>;
}

export class ApiSmartMoneyRepository implements SmartMoneyRepository {
  async startCheck(walletAddress: string, walletControl: WalletControlState = "WATCH_ONLY", network: BscNetwork = "mainnet") {
    const payload: StartSmartMoneyCheckRequest = { walletAddress, walletControl, network };
    return unwrap(await apiRequest<ApiEnvelope<SmartMoneyCheckResponse>>("/v1/checks", {
      method: "POST",
      body: JSON.stringify(payload),
    }));
  }

  async getCheckStatus(checkSessionId: string) {
    const data = unwrap(await apiRequest<ApiEnvelope<{ session: CheckSession }>>(`/v1/checks/${encodeURIComponent(checkSessionId)}/status`));
    return data.session;
  }

  async getCheck(checkSessionId: string) {
    return unwrap(await apiRequest<ApiEnvelope<SmartMoneyCheckResponse>>(`/v1/checks/${encodeURIComponent(checkSessionId)}`));
  }

  async getFindingMatches(checkSessionId: string, findingId: string, limit = 8) {
    const params = new URLSearchParams({ limit: String(limit) });
    return unwrap(await apiRequest<ApiEnvelope<FindingServiceMatchesResponse>>(`/v1/checks/${encodeURIComponent(checkSessionId)}/findings/${encodeURIComponent(findingId)}/matches?${params.toString()}`)).page;
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
