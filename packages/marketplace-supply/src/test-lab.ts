import { lookup } from "node:dns/promises";
import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { Readable } from "node:stream";
import type {
  AgentService,
  EvidenceEnvelope,
  MarketplaceServiceRecord,
  MarketplaceServiceTestCoverage,
  MarketplaceServiceTestResult,
  MarketplaceServiceTestRun,
  ServiceCategory,
  ServiceRuntimeEndpoint,
} from "@spotriq/domain";
import { createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";
import { assertStructuredJsonBudget, isPublicNetworkAddress, normalizeUntrustedText, validateExternalHttpUrl } from "@spotriq/security-hardening";

export const MARKETPLACE_TEST_LAB_METHOD = "marketplace.test-lab@1.0.0";
export const MCP_MODERN_PROTOCOL_VERSION = "2026-07-28";
export const MCP_LEGACY_PROTOCOL_VERSION = "2025-11-25";

export interface MarketplaceTestLab {
  run(record: MarketplaceServiceRecord): Promise<MarketplaceServiceTestRun>;
}

export interface MarketplaceTestLabOptions {
  fetcher?: typeof fetch;
  resolver?: (hostname: string) => Promise<string[]>;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRedirects?: number;
  allowInsecureHttp?: boolean;
  now?: () => Date;
}

export interface SafeHttpResult {
  status: number;
  finalUrl: string;
  contentType: string;
  bodyText: string;
  durationMs: number;
  headers: Headers;
}

interface ProtocolProbeResult {
  tests: MarketplaceServiceTestResult[];
  evidence: EvidenceEnvelope[];
}

const CATEGORY_TERMS: Record<ServiceCategory, string[]> = {
  rebalancing: ["rebalance", "rebalancing", "concentrated liquidity", "liquidity position", "lp range", "range management"],
  grid: ["grid trading", "price grid", "limit order", "order ladder", "re-grid", "regrid"],
  yield: ["yield", "apy", "apr", "lending supply", "supply market", "optimise", "optimize", "vault"],
  health: ["health factor", "liquidation", "collateral risk", "borrow risk", "lending risk", "risk monitor"],
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function truncate(value: string, max = 280): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

export function isPublicRuntimeAddress(address: string): boolean {
  return isPublicNetworkAddress(address);
}

async function defaultResolver(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  const records = await lookup(hostname, { all: true, verbatim: true });
  return [...new Set(records.map((record) => record.address))];
}

function validateRuntimeUrlShape(raw: string, allowInsecureHttp: boolean): URL {
  return validateExternalHttpUrl(raw, { label: "Runtime endpoint", allowInsecureHttp });
}

async function assertPublicResolution(url: URL, resolver: (hostname: string) => Promise<string[]>): Promise<string[]> {
  const resolutionHost = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = await resolver(resolutionHost);
  if (addresses.length === 0) throw new Error("Runtime endpoint host did not resolve to an IP address.");
  const blocked = addresses.filter((address) => !isPublicRuntimeAddress(address));
  if (blocked.length > 0) throw new Error(`Runtime endpoint resolves to a blocked/non-public address (${blocked[0]}).`);
  return addresses;
}

async function pinnedNodeFetch(url: URL, init: RequestInit, validatedAddresses: string[]): Promise<Response> {
  const pinnedAddress = validatedAddresses[0];
  if (!pinnedAddress) throw new Error("Runtime endpoint has no validated public address to pin.");
  const family = isIP(pinnedAddress);
  if (family !== 4 && family !== 6) throw new Error("Runtime endpoint resolved to an invalid address family.");
  const headers = Object.fromEntries(new Headers(init.headers).entries());
  const requestImpl = url.protocol === "https:" ? httpsRequest : httpRequest;
  const body = init.body;
  if (body !== undefined && body !== null && typeof body !== "string" && !(body instanceof Uint8Array)) {
    throw new Error("Marketplace Test Lab only sends bounded string or byte request bodies.");
  }

  return new Promise<Response>((resolve, reject) => {
    const request = requestImpl(url, {
      method: init.method ?? "GET",
      headers,
      signal: init.signal ?? undefined,
      ...(url.protocol === "https:" && isIP(url.hostname.replace(/^\[|\]$/g, "")) === 0 ? { servername: url.hostname } : {}),
      lookup: ((_hostname: string, lookupOptions: unknown, callback: (...args: unknown[]) => void) => {
        const options = (lookupOptions && typeof lookupOptions === "object" ? lookupOptions : {}) as { all?: boolean };
        if (options.all) callback(null, [{ address: pinnedAddress, family }]);
        else callback(null, pinnedAddress, family);
      }) as never,
    }, (response) => {
      const responseHeaders = new Headers();
      for (const [name, value] of Object.entries(response.headers)) {
        if (Array.isArray(value)) for (const item of value) responseHeaders.append(name, item);
        else if (value !== undefined) responseHeaders.set(name, String(value));
      }
      const status = response.statusCode ?? 502;
      const noBody = (init.method ?? "GET").toUpperCase() === "HEAD" || status === 204 || status === 205 || status === 304;
      const stream = noBody ? null : (Readable.toWeb(response) as ReadableStream<Uint8Array>);
      resolve(new Response(stream, { status, statusText: response.statusMessage, headers: responseHeaders }));
    });
    request.once("error", reject);
    if (typeof body === "string" || body instanceof Uint8Array) request.write(body);
    request.end();
  });
}

export async function boundedFetch(
  rawUrl: string,
  init: RequestInit,
  options: Required<Pick<MarketplaceTestLabOptions, "timeoutMs" | "maxResponseBytes" | "maxRedirects" | "allowInsecureHttp">> & {
    fetcher?: typeof fetch;
    resolver: (hostname: string) => Promise<string[]>;
  },
): Promise<SafeHttpResult> {
  let current = validateRuntimeUrlShape(rawUrl, options.allowInsecureHttp);
  const started = Date.now();
  for (let redirect = 0; redirect <= options.maxRedirects; redirect += 1) {
    const validatedAddresses = await assertPublicResolution(current, options.resolver);
    const requestInit: RequestInit = {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(options.timeoutMs),
      headers: {
        "User-Agent": "Spotriq-Marketplace-Test-Lab/0.36.0",
        Accept: "application/json, application/a2a+json;q=0.9",
        ...(init.headers ?? {}),
      },
    };
    const response = options.fetcher
      ? await options.fetcher(current, requestInit)
      : await pinnedNodeFetch(current, requestInit, validatedAddresses);
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error(`Runtime endpoint returned redirect ${response.status} without Location.`);
      if (redirect >= options.maxRedirects) throw new Error("Runtime endpoint exceeded the redirect limit.");
      current = validateRuntimeUrlShape(new URL(location, current).toString(), options.allowInsecureHttp);
      continue;
    }
    const declaredLength = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(declaredLength) && declaredLength > options.maxResponseBytes) {
      throw new Error(`Runtime response exceeds the ${options.maxResponseBytes}-byte test limit.`);
    }
    const reader = response.body?.getReader();
    let received = 0;
    const chunks: Uint8Array[] = [];
    if (reader) {
      while (true) {
        const next = await reader.read();
        if (next.done) break;
        received += next.value.byteLength;
        if (received > options.maxResponseBytes) {
          await reader.cancel();
          throw new Error(`Runtime response exceeds the ${options.maxResponseBytes}-byte test limit.`);
        }
        chunks.push(next.value);
      }
    }
    const body = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return {
      status: response.status,
      finalUrl: current.toString(),
      contentType: response.headers.get("content-type") ?? "",
      bodyText: new TextDecoder().decode(body),
      durationMs: Date.now() - started,
      headers: response.headers,
    };
  }
  throw new Error("Runtime endpoint redirect handling exhausted unexpectedly.");
}

function testResult(input: Omit<MarketplaceServiceTestResult, "testId"> & { runId: string; ordinal: number }): MarketplaceServiceTestResult {
  const { runId, ordinal, ...rest } = input;
  return { testId: `${runId}:t${ordinal}`, ...rest };
}

function parseJson(text: string): unknown {
  if (!text.trim()) throw new Error("Runtime returned an empty response body.");
  try {
    const parsed: unknown = JSON.parse(text);
    assertStructuredJsonBudget(parsed, { maxDepth: 12, maxNodes: 4096, maxArrayLength: 256, maxObjectKeys: 128, maxStringLength: 16_384 });
    return parsed;
  } catch (error) {
    if (error instanceof Error && error.name === "SecurityBoundaryError") throw error;
    throw new Error("Runtime response was not valid bounded JSON.");
  }
}

function categoryMatch(category: ServiceCategory, values: string[]): { matched: boolean; terms: string[] } {
  const text = values.join(" ").toLowerCase();
  const terms = CATEGORY_TERMS[category].filter((term) => text.includes(term));
  return { matched: terms.length > 0, terms };
}

function observedEvidence(input: {
  serviceId: string;
  metric: string;
  value: string | number;
  observedAt: string;
  confidence?: "high" | "medium" | "low" | "unavailable";
  sourceRef?: string;
  limitation: string;
}): EvidenceEnvelope {
  return createEvidenceEnvelope({
    subjectType: "agent_service",
    subjectId: input.serviceId,
    metric: input.metric,
    value: input.value,
    provenance: "marketplace-observed",
    source: DATA_SOURCES.MARKETPLACE,
    sourceRef: input.sourceRef,
    observedAt: input.observedAt,
    confidence: input.confidence ?? "high",
    method: EVIDENCE_METHODS.MARKETPLACE_TEST_LAB,
    limitation: input.limitation,
  });
}

export function a2aCardUrl(endpoint: string, allowInsecureHttp: boolean): string {
  const parsed = validateRuntimeUrlShape(endpoint, allowInsecureHttp);
  if (parsed.pathname.endsWith("/.well-known/agent-card.json") || parsed.pathname.endsWith("/agent-card.json")) return parsed.toString();
  return new URL("/.well-known/agent-card.json", parsed.origin).toString();
}

function strictObjectArray(value: unknown, label: string, maxItems: number): Record<string, unknown>[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
    throw new Error(`${label} must be an array of at most ${maxItems} objects.`);
  }
  return value as Record<string, unknown>[];
}

function boundedOptionalText(value: unknown, label: string, maxLength: number): string {
  if (value === undefined || value === null || value === "") return "";
  return normalizeUntrustedText(value, label, maxLength);
}

function boundedStringArray(value: unknown, label: string, maxItems: number, maxLength: number): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== "string")) {
    throw new Error(`${label} must be an array of at most ${maxItems} strings.`);
  }
  return value.map((item, index) => normalizeUntrustedText(item, `${label}[${index}]`, maxLength));
}

function a2aCapabilityText(card: Record<string, unknown>): string[] {
  const values = [
    normalizeUntrustedText(card.name, "A2A Agent Card name", 160),
    boundedOptionalText(card.description, "A2A Agent Card description", 4000),
  ];
  for (const [index, skill] of strictObjectArray(card.skills, "A2A Agent Card skills", 64).entries()) {
    values.push(
      boundedOptionalText(skill.name, `A2A skill ${index} name`, 160),
      boundedOptionalText(skill.description, `A2A skill ${index} description`, 2000),
      ...boundedStringArray(skill.tags, `A2A skill ${index} tags`, 32, 160),
    );
  }
  return values.filter(Boolean);
}

function validateA2aCard(card: unknown, allowInsecureHttp: boolean): { protocolVersion?: string; capabilityText: string[] } {
  if (!card || typeof card !== "object" || Array.isArray(card)) throw new Error("A2A Agent Card is not a JSON object.");
  const item = card as Record<string, unknown>;
  normalizeUntrustedText(item.name, "A2A Agent Card name", 160);
  boundedOptionalText(item.description, "A2A Agent Card description", 4000);

  const interfaces = strictObjectArray(item.supportedInterfaces, "A2A supportedInterfaces", 16);
  const modernInterface = interfaces.find((candidate, index) => {
    const rawUrl = boundedOptionalText(candidate.url, `A2A interface ${index} URL`, 2048);
    const binding = boundedOptionalText(candidate.protocolBinding, `A2A interface ${index} protocolBinding`, 80);
    const version = boundedOptionalText(candidate.protocolVersion, `A2A interface ${index} protocolVersion`, 80);
    if (!rawUrl || !binding || !version) return false;
    validateExternalHttpUrl(rawUrl, { label: `A2A interface ${index} URL`, allowInsecureHttp });
    return true;
  });
  const legacyUrl = boundedOptionalText(item.url, "A2A legacy URL", 2048);
  const legacyVersion = boundedOptionalText(item.protocolVersion, "A2A legacy protocolVersion", 80);
  if (legacyUrl) validateExternalHttpUrl(legacyUrl, { label: "A2A legacy URL", allowInsecureHttp });
  if (!modernInterface && !(legacyUrl && legacyVersion)) {
    throw new Error("A2A Agent Card does not declare a valid supported interface/protocol version.");
  }
  return {
    protocolVersion: modernInterface ? boundedOptionalText(modernInterface.protocolVersion, "A2A protocolVersion", 80) : legacyVersion,
    capabilityText: a2aCapabilityText(item),
  };
}

async function probeA2a(
  record: MarketplaceServiceRecord,
  endpoint: ServiceRuntimeEndpoint,
  runId: string,
  ordinalStart: number,
  options: Parameters<typeof boundedFetch>[2],
  observedAt: string,
): Promise<ProtocolProbeResult> {
  const tests: MarketplaceServiceTestResult[] = [];
  const evidence: EvidenceEnvelope[] = [];
  const cardUrl = a2aCardUrl(endpoint.endpoint, options.allowInsecureHttp);
  try {
    const result = await boundedFetch(cardUrl, { method: "GET" }, options);
    const reachableEvidence = observedEvidence({
      serviceId: record.service.serviceId,
      metric: "service.runtime_reachability",
      value: result.status,
      observedAt,
      sourceRef: result.finalUrl,
      limitation: "Spotriq observed an HTTP response from the declared A2A discovery surface. Reachability does not prove safe financial execution.",
    });
    evidence.push(reachableEvidence);
    tests.push(testResult({ runId, ordinal: ordinalStart, code: "ENDPOINT_REACHABILITY", label: "A2A discovery reachability", state: result.status >= 200 && result.status < 300 ? "PASS" : "FAIL", requiredForReadiness: true, detail: `A2A Agent Card discovery returned HTTP ${result.status}.`, endpoint: endpoint.endpoint, interactionKind: "A2A", observedAt, durationMs: result.durationMs, evidenceIds: [reachableEvidence.evidenceId] }));
    if (result.status < 200 || result.status >= 300) return { tests, evidence };
    if (!/json/i.test(result.contentType)) {
      tests.push(testResult({ runId, ordinal: ordinalStart + 1, code: "PROTOCOL_DISCOVERY", label: "A2A Agent Card discovery", state: "FAIL", requiredForReadiness: true, detail: `A2A discovery returned non-JSON content type ${result.contentType || "unknown"}.`, endpoint: endpoint.endpoint, interactionKind: "A2A", observedAt }));
      return { tests, evidence };
    }
    const parsed = parseJson(result.bodyText);
    const card = validateA2aCard(parsed, options.allowInsecureHttp);
    const contractEvidence = observedEvidence({
      serviceId: record.service.serviceId,
      metric: "service.protocol_contract",
      value: `A2A:${card.protocolVersion || endpoint.version || "unknown"}`,
      observedAt,
      sourceRef: result.finalUrl,
      limitation: "Spotriq validated the public A2A Agent Card shape and protocol declaration. This is contract-level evidence, not a financial outcome test.",
    });
    evidence.push(contractEvidence);
    tests.push(testResult({ runId, ordinal: ordinalStart + 1, code: "PROTOCOL_DISCOVERY", label: "A2A Agent Card discovery", state: "PASS", requiredForReadiness: true, detail: "A valid A2A Agent Card was observed at the standardized discovery surface.", endpoint: endpoint.endpoint, interactionKind: "A2A", protocolVersion: card.protocolVersion, observedAt, evidenceIds: [contractEvidence.evidenceId] }));
    tests.push(testResult({ runId, ordinal: ordinalStart + 2, code: "PROTOCOL_CONTRACT", label: "A2A protocol contract", state: "PASS", requiredForReadiness: true, detail: `Agent Card declares an A2A interface${card.protocolVersion ? ` using protocol ${card.protocolVersion}` : ""}.`, endpoint: endpoint.endpoint, interactionKind: "A2A", protocolVersion: card.protocolVersion, observedAt, evidenceIds: [contractEvidence.evidenceId] }));
    const capability = categoryMatch(record.service.category, card.capabilityText);
    const capabilityEvidence = observedEvidence({
      serviceId: record.service.serviceId,
      metric: "service.category_capability",
      value: capability.matched ? record.service.category : "not_observed",
      observedAt,
      confidence: capability.matched ? "medium" : "low",
      sourceRef: result.finalUrl,
      limitation: "Category capability evidence is based on machine-readable A2A skill/description metadata observed by Spotriq. It does not prove financial performance or successful execution.",
    });
    evidence.push(capabilityEvidence);
    tests.push(testResult({ runId, ordinal: ordinalStart + 3, code: "CATEGORY_CAPABILITY", label: "Category capability observation", state: capability.matched ? "PASS" : "INCONCLUSIVE", requiredForReadiness: true, detail: capability.matched ? `A2A machine-readable metadata contains category-relevant capability terms: ${capability.terms.join(", ")}.` : `The A2A Agent Card is valid, but Spotriq did not observe ${record.service.category}-specific capability terms in its public skills/description.`, endpoint: endpoint.endpoint, interactionKind: "A2A", protocolVersion: card.protocolVersion, observedAt, evidenceIds: [capabilityEvidence.evidenceId] }));
    return { tests, evidence };
  } catch (error) {
    tests.push(testResult({ runId, ordinal: ordinalStart, code: "ENDPOINT_REACHABILITY", label: "A2A discovery reachability", state: "FAIL", requiredForReadiness: true, detail: truncate(error instanceof Error ? error.message : String(error)), endpoint: endpoint.endpoint, interactionKind: "A2A", observedAt }));
    return { tests, evidence };
  }
}

function jsonRpcResult(bodyText: string): Record<string, unknown> {
  const parsed = parseJson(bodyText);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("MCP response is not a JSON-RPC object.");
  const envelope = parsed as Record<string, unknown>;
  if (envelope.jsonrpc !== "2.0") throw new Error("MCP response does not declare JSON-RPC 2.0.");
  if (envelope.error !== undefined && envelope.error !== null) {
    if (typeof envelope.error !== "object" || Array.isArray(envelope.error)) throw new Error("MCP returned a malformed JSON-RPC error object.");
    const err = envelope.error as Record<string, unknown>;
    const message = boundedOptionalText(err.message, "MCP error message", 1000);
    const code = typeof err.code === "number" || typeof err.code === "string" ? String(err.code) : "unknown";
    throw new Error(`MCP returned JSON-RPC error ${message || code}.`);
  }
  if (!envelope.result || typeof envelope.result !== "object" || Array.isArray(envelope.result)) throw new Error("MCP response does not contain an object result.");
  return envelope.result as Record<string, unknown>;
}

function mcpToolText(result: Record<string, unknown>): string[] {
  const values: string[] = [];
  for (const [index, tool] of strictObjectArray(result.tools, "MCP tools", 128).entries()) {
    values.push(
      boundedOptionalText(tool.name, `MCP tool ${index} name`, 160),
      boundedOptionalText(tool.title, `MCP tool ${index} title`, 160),
      boundedOptionalText(tool.description, `MCP tool ${index} description`, 2000),
    );
  }
  return values.filter(Boolean);
}

async function mcpRequest(
  endpoint: string,
  method: string,
  params: Record<string, unknown>,
  protocolVersion: string,
  options: Parameters<typeof boundedFetch>[2],
  extraHeaders: Record<string, string> = {},
): Promise<SafeHttpResult> {
  return boundedFetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "MCP-Protocol-Version": protocolVersion,
      "Mcp-Method": method,
      ...extraHeaders,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: `spotriq-${randomUUID()}`, method, params }),
  }, options);
}

async function probeModernMcp(endpoint: string, options: Parameters<typeof boundedFetch>[2]): Promise<{ discover: SafeHttpResult; discoverResult: Record<string, unknown>; tools?: SafeHttpResult; toolsResult?: Record<string, unknown> }> {
  const meta = { "io.modelcontextprotocol/clientInfo": { name: "Spotriq Marketplace Test Lab", version: "0.25.0" } };
  const discover = await mcpRequest(endpoint, "server/discover", { _meta: meta }, MCP_MODERN_PROTOCOL_VERSION, options);
  if (discover.status < 200 || discover.status >= 300) throw new Error(`Modern MCP server/discover returned HTTP ${discover.status}.`);
  const discoverResult = jsonRpcResult(discover.bodyText);
  let tools: SafeHttpResult | undefined;
  let toolsResult: Record<string, unknown> | undefined;
  try {
    tools = await mcpRequest(endpoint, "tools/list", { _meta: meta }, MCP_MODERN_PROTOCOL_VERSION, options);
    if (tools.status >= 200 && tools.status < 300) toolsResult = jsonRpcResult(tools.bodyText);
  } catch {
    // Discovery remains useful even when the optional tool catalog cannot be read.
  }
  return { discover, discoverResult, tools, toolsResult };
}

async function legacyInitialize(endpoint: string, version: string, options: Parameters<typeof boundedFetch>[2]): Promise<{ initialize: SafeHttpResult; result: Record<string, unknown>; tools?: SafeHttpResult; toolsResult?: Record<string, unknown> }> {
  const initialize = await boundedFetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "MCP-Protocol-Version": version },
    body: JSON.stringify({ jsonrpc: "2.0", id: `spotriq-${randomUUID()}`, method: "initialize", params: { protocolVersion: version, capabilities: {}, clientInfo: { name: "Spotriq Marketplace Test Lab", version: "0.25.0" } } }),
  }, options);
  if (initialize.status < 200 || initialize.status >= 300) throw new Error(`Legacy MCP initialize returned HTTP ${initialize.status}.`);
  const result = jsonRpcResult(initialize.bodyText);
  const negotiated = normalizeText(result.protocolVersion) || version;
  const sessionId = initialize.headers.get("mcp-session-id") ?? undefined;
  const sessionHeaders: Record<string, string> = {};
  if (sessionId) sessionHeaders["Mcp-Session-Id"] = sessionId;
  try {
    await boundedFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "MCP-Protocol-Version": negotiated, ...sessionHeaders },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    }, options);
  } catch {
    // Some stateless-compatible legacy servers do not require an initialized notification response.
  }
  let tools: SafeHttpResult | undefined;
  let toolsResult: Record<string, unknown> | undefined;
  try {
    tools = await boundedFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "MCP-Protocol-Version": negotiated, ...sessionHeaders },
      body: JSON.stringify({ jsonrpc: "2.0", id: `spotriq-${randomUUID()}`, method: "tools/list", params: {} }),
    }, options);
    if (tools.status >= 200 && tools.status < 300) toolsResult = jsonRpcResult(tools.bodyText);
  } catch {
    // A valid initialize handshake is still contract evidence; tool catalog coverage becomes inconclusive.
  }
  return { initialize, result, tools, toolsResult };
}

async function probeMcp(
  record: MarketplaceServiceRecord,
  endpoint: ServiceRuntimeEndpoint,
  runId: string,
  ordinalStart: number,
  options: Parameters<typeof boundedFetch>[2],
  observedAt: string,
): Promise<ProtocolProbeResult> {
  const tests: MarketplaceServiceTestResult[] = [];
  const evidence: EvidenceEnvelope[] = [];
  let protocolVersion = MCP_MODERN_PROTOCOL_VERSION;
  let reachability: SafeHttpResult | undefined;
  let toolTexts: string[] = [];
  let modernFailure: string | undefined;
  try {
    const modern = await probeModernMcp(endpoint.endpoint, options);
    reachability = modern.discover;
    protocolVersion = MCP_MODERN_PROTOCOL_VERSION;
    toolTexts = modern.toolsResult ? mcpToolText(modern.toolsResult) : [];
  } catch (error) {
    modernFailure = error instanceof Error ? error.message : String(error);
    try {
      const declaredLegacy = /^202[4-5]-\d{2}-\d{2}$/.test(endpoint.version ?? "") ? endpoint.version! : MCP_LEGACY_PROTOCOL_VERSION;
      const legacy = await legacyInitialize(endpoint.endpoint, declaredLegacy, options);
      reachability = legacy.initialize;
      protocolVersion = normalizeText(legacy.result.protocolVersion) || declaredLegacy;
      toolTexts = legacy.toolsResult ? mcpToolText(legacy.toolsResult) : [];
    } catch (legacyError) {
      tests.push(testResult({ runId, ordinal: ordinalStart, code: "ENDPOINT_REACHABILITY", label: "MCP runtime reachability", state: "FAIL", requiredForReadiness: true, detail: truncate(`Modern probe: ${modernFailure}; legacy fallback: ${legacyError instanceof Error ? legacyError.message : String(legacyError)}`), endpoint: endpoint.endpoint, interactionKind: "MCP", observedAt }));
      return { tests, evidence };
    }
  }

  const reachableEvidence = observedEvidence({
    serviceId: record.service.serviceId,
    metric: "service.runtime_reachability",
    value: reachability!.status,
    observedAt,
    sourceRef: reachability!.finalUrl,
    limitation: "Spotriq observed an MCP protocol response. Reachability does not prove safe financial execution.",
  });
  const contractEvidence = observedEvidence({
    serviceId: record.service.serviceId,
    metric: "service.protocol_contract",
    value: `MCP:${protocolVersion}`,
    observedAt,
    sourceRef: reachability!.finalUrl,
    limitation: "Spotriq completed MCP protocol discovery/initialization without invoking financial tools. This is runtime contract evidence, not performance evidence.",
  });
  evidence.push(reachableEvidence, contractEvidence);
  tests.push(testResult({ runId, ordinal: ordinalStart, code: "ENDPOINT_REACHABILITY", label: "MCP runtime reachability", state: "PASS", requiredForReadiness: true, detail: `MCP endpoint responded successfully using protocol ${protocolVersion}.`, endpoint: endpoint.endpoint, interactionKind: "MCP", protocolVersion, observedAt, durationMs: reachability!.durationMs, evidenceIds: [reachableEvidence.evidenceId] }));
  tests.push(testResult({ runId, ordinal: ordinalStart + 1, code: "PROTOCOL_DISCOVERY", label: "MCP protocol discovery", state: "PASS", requiredForReadiness: true, detail: protocolVersion === MCP_MODERN_PROTOCOL_VERSION ? "MCP server/discover succeeded using the stateless 2026-07-28 protocol revision." : `MCP modern discovery was unavailable; a legacy initialize handshake succeeded using ${protocolVersion}.`, endpoint: endpoint.endpoint, interactionKind: "MCP", protocolVersion, observedAt, evidenceIds: [contractEvidence.evidenceId] }));
  tests.push(testResult({ runId, ordinal: ordinalStart + 2, code: "PROTOCOL_CONTRACT", label: "MCP protocol contract", state: "PASS", requiredForReadiness: true, detail: "Spotriq observed a valid JSON-RPC MCP discovery/initialization result without invoking a financial action.", endpoint: endpoint.endpoint, interactionKind: "MCP", protocolVersion, observedAt, evidenceIds: [contractEvidence.evidenceId] }));

  const capability = categoryMatch(record.service.category, toolTexts);
  const capabilityEvidence = observedEvidence({
    serviceId: record.service.serviceId,
    metric: "service.category_capability",
    value: capability.matched ? record.service.category : "not_observed",
    observedAt,
    confidence: capability.matched ? "medium" : "low",
    sourceRef: reachability!.finalUrl,
    limitation: "Category capability evidence is based on the MCP tool catalog observed by Spotriq. Spotriq did not call the financial tools, so this is not execution or performance evidence.",
  });
  evidence.push(capabilityEvidence);
  tests.push(testResult({ runId, ordinal: ordinalStart + 3, code: "CATEGORY_CAPABILITY", label: "Category capability observation", state: capability.matched ? "PASS" : "INCONCLUSIVE", requiredForReadiness: true, detail: capability.matched ? `MCP tool metadata contains category-relevant capability terms: ${capability.terms.join(", ")}.` : `The MCP protocol contract is valid, but Spotriq did not observe ${record.service.category}-specific terms in the readable tool catalog.`, endpoint: endpoint.endpoint, interactionKind: "MCP", protocolVersion, observedAt, evidenceIds: [capabilityEvidence.evidenceId] }));
  return { tests, evidence };
}

function coverageFromTests(tests: MarketplaceServiceTestResult[]): MarketplaceServiceTestCoverage["coverage"] {
  const required = tests.filter((test) => test.requiredForReadiness);
  if (required.length === 0) return "FAIL";
  const endpoints = new Map<string, MarketplaceServiceTestResult[]>();
  for (const test of required) {
    const key = test.endpoint ?? "unknown";
    const group = endpoints.get(key) ?? [];
    group.push(test);
    endpoints.set(key, group);
  }
  const requiredCodes: MarketplaceServiceTestResult["code"][] = ["ENDPOINT_POLICY", "ENDPOINT_REACHABILITY", "PROTOCOL_DISCOVERY", "PROTOCOL_CONTRACT", "CATEGORY_CAPABILITY"];
  const anyEndpointPasses = [...endpoints.values()].some((group) => {
    const codes = new Map(group.map((test) => [test.code, test.state]));
    return requiredCodes.every((code) => codes.get(code) === "PASS");
  });
  if (anyEndpointPasses) return "PASS";
  const anyHardFailure = required.some((test) => test.state === "FAIL");
  const anyObservedPass = required.some((test) => test.state === "PASS");
  if (anyHardFailure && !anyObservedPass) return "FAIL";
  return "PARTIAL";
}

export function emptyMarketplaceTestCoverage(serviceId: string): MarketplaceServiceTestCoverage {
  return {
    serviceId,
    coverage: "NOT_RUN",
    tests: [],
    evidence: [],
    methodVersion: MARKETPLACE_TEST_LAB_METHOD,
    note: "No Spotriq Marketplace Test Lab run exists for this service. Identity, indexed reputation and operator claims do not count as marketplace testing.",
    limitations: ["No runtime contract has been observed by Spotriq for this service."],
  };
}

export function coverageFromRun(run: MarketplaceServiceTestRun): MarketplaceServiceTestCoverage {
  return {
    serviceId: run.serviceId,
    coverage: run.coverage,
    latestRunId: run.runId,
    tests: run.tests,
    evidence: run.evidence,
    observedAt: run.completedAt,
    methodVersion: run.methodVersion,
    note: run.coverage === "PASS"
      ? "Spotriq observed at least one declared machine endpoint passing endpoint policy, reachability, protocol-contract and category-capability checks. Financial execution was not performed."
      : run.coverage === "PARTIAL"
        ? "Spotriq observed some valid runtime evidence, but the service did not satisfy every required contract-level marketplace test."
        : "No declared machine endpoint satisfied the required contract-level marketplace tests.",
    limitations: run.limitations,
  };
}

export function createMarketplaceTestLab(options: MarketplaceTestLabOptions = {}): MarketplaceTestLab {
  const fetcher = options.fetcher;
  const resolver = options.resolver ?? defaultResolver;
  const timeoutMs = options.timeoutMs ?? 5_000;
  const maxResponseBytes = options.maxResponseBytes ?? 256_000;
  const maxRedirects = options.maxRedirects ?? 2;
  const allowInsecureHttp = options.allowInsecureHttp ?? false;
  const now = options.now ?? (() => new Date());
  const httpOptions = { fetcher, resolver, timeoutMs, maxResponseBytes, maxRedirects, allowInsecureHttp };

  return {
    async run(record: MarketplaceServiceRecord): Promise<MarketplaceServiceTestRun> {
      const startedAt = now().toISOString();
      const runId = `test-run:${randomUUID()}`;
      const tests: MarketplaceServiceTestResult[] = [];
      const evidence: EvidenceEnvelope[] = [];
      const machineEndpoints = (record.service.runtimeEndpoints ?? []).filter((endpoint) => endpoint.machineCallable && (endpoint.interactionKind === "A2A" || endpoint.interactionKind === "MCP"));
      let ordinal = 1;

      if (machineEndpoints.length === 0) {
        tests.push(testResult({ runId, ordinal, code: "ENDPOINT_POLICY", label: "Runtime endpoint safety", state: "FAIL", requiredForReadiness: true, detail: "No declared A2A or MCP machine endpoint is available for marketplace testing.", observedAt: startedAt }));
      }

      for (const endpoint of machineEndpoints) {
        let safeUrl: URL;
        try {
          safeUrl = validateRuntimeUrlShape(endpoint.endpoint, allowInsecureHttp);
          await assertPublicResolution(safeUrl, resolver);
          tests.push(testResult({ runId, ordinal, code: "ENDPOINT_POLICY", label: "Runtime endpoint safety", state: "PASS", requiredForReadiness: true, detail: "Endpoint uses an allowed remote URL shape and currently resolves only to public IP addresses.", endpoint: endpoint.endpoint, interactionKind: endpoint.interactionKind, observedAt: startedAt }));
        } catch (error) {
          tests.push(testResult({ runId, ordinal, code: "ENDPOINT_POLICY", label: "Runtime endpoint safety", state: "FAIL", requiredForReadiness: true, detail: truncate(error instanceof Error ? error.message : String(error)), endpoint: endpoint.endpoint, interactionKind: endpoint.interactionKind, observedAt: startedAt }));
          ordinal += 10;
          continue;
        }
        const probe = endpoint.interactionKind === "A2A"
          ? await probeA2a(record, endpoint, runId, ordinal + 1, httpOptions, startedAt)
          : await probeMcp(record, endpoint, runId, ordinal + 1, httpOptions, startedAt);
        tests.push(...probe.tests);
        evidence.push(...probe.evidence);
        ordinal += 10;
      }

      const coverage = coverageFromTests(tests);
      const completedAt = now().toISOString();
      return {
        runId,
        serviceId: record.service.serviceId,
        state: coverage === "PASS" ? "COMPLETED" : coverage === "PARTIAL" ? "PARTIAL" : "FAILED",
        coverage,
        startedAt,
        completedAt,
        methodVersion: MARKETPLACE_TEST_LAB_METHOD,
        tests,
        evidence,
        limitations: [
          "Marketplace Test Lab performs bounded contract-level observations only; it does not move funds, sign transactions, call financial tools, or establish profitability.",
          "Endpoint DNS is validated before every HTTP hop and redirects are revalidated. The production default transport pins each request to the validated public address to close the application-level DNS rebinding/TOCTOU gap; infrastructure egress controls remain defense in depth.",
          "A category-capability PASS means Spotriq observed relevant machine-readable skill/tool metadata, not that the financial strategy was executed successfully.",
        ],
      };
    },
  };
}
