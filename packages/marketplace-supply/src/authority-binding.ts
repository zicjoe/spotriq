import { lookup } from "node:dns/promises";
import { randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { publicKeyToAddress } from "viem/accounts";
import { recoverMessageAddress, type Hex } from "viem";
import type { AgentAuthorityBinding, EvidenceEnvelope, MarketplaceServiceRecord, ServiceRuntimeEndpoint } from "@spotriq/domain";
import { createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";
import { a2aCardUrl, boundedFetch, isPublicRuntimeAddress } from "./test-lab.js";

export const AGENT_AUTHORITY_BINDING_METHOD = "marketplace.agent-authority-binding@1.0.0";
export const SPOTRIQ_AUTHORITY_BINDING_EXTENSION_URI = "urn:spotriq:authority-binding:v1";
export const AUTHORITY_BINDING_SIGNATURE_SCHEME = "EIP191_SECP256K1" as const;

export interface AgentAuthorityBindingVerifierOptions {
  fetcher?: typeof fetch;
  resolver?: (hostname: string) => Promise<string[]>;
  timeoutMs?: number;
  maxResponseBytes?: number;
  maxRedirects?: number;
  allowInsecureHttp?: boolean;
  now?: () => Date;
  nonce?: () => string;
  publicKeyAddress?: (publicKey: Hex) => string;
  recoverAddress?: (message: string, signature: Hex) => Promise<string>;
}

export interface AgentAuthorityBindingVerifier {
  verify(record: MarketplaceServiceRecord): Promise<{ binding: AgentAuthorityBinding; evidence: EvidenceEnvelope[] }>;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function objectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
    : [];
}

async function defaultResolver(hostname: string): Promise<string[]> {
  if (isIP(hostname)) return [hostname];
  const records = await lookup(hostname, { all: true, verbatim: true });
  return [...new Set(records.map((record) => record.address))];
}

function assertSec1PublicKey(value: string): Hex {
  if (!/^0x(?:04[0-9a-fA-F]{128}|0[23][0-9a-fA-F]{64})$/.test(value)) {
    throw new Error("Authority-binding extension must declare a compressed or uncompressed SEC1 secp256k1 public key.");
  }
  return value as Hex;
}

function assertSignature(value: string): Hex {
  if (!/^0x[0-9a-fA-F]{130}$/.test(value)) throw new Error("Authority challenge response must contain a 65-byte EIP-191 signature.");
  return value as Hex;
}

function sameOriginUrl(raw: string, runtimeEndpoint: string, allowInsecureHttp: boolean): string {
  let runtime: URL;
  let challenge: URL;
  try {
    runtime = new URL(runtimeEndpoint);
    challenge = new URL(raw, runtime.origin);
  } catch {
    throw new Error("Authority challenge URL is not a valid URL.");
  }
  if (challenge.origin !== runtime.origin) throw new Error("Authority challenge URL must be same-origin with the declared A2A runtime.");
  if (challenge.username || challenge.password) throw new Error("Authority challenge URL must not embed credentials.");
  if (challenge.protocol !== "https:" && !(allowInsecureHttp && challenge.protocol === "http:")) {
    throw new Error("Authority challenge URL must use HTTPS.");
  }
  return challenge.toString();
}

function a2aEndpoint(record: MarketplaceServiceRecord): ServiceRuntimeEndpoint {
  const endpoint = (record.service.runtimeEndpoints ?? []).find((item) => item.machineCallable && item.interactionKind === "A2A");
  if (!endpoint) throw new Error("The selected service does not expose a machine-callable A2A runtime required for service-owned key binding.");
  return endpoint;
}

function unavailable(record: MarketplaceServiceRecord, endpoint: string, cardUrl: string, detail: string, observedAt: string): AgentAuthorityBinding {
  return {
    bindingId: `authority-binding:${encodeURIComponent(record.service.serviceId)}:unavailable`,
    serviceId: record.service.serviceId,
    agentId: record.identity.identity.agentId,
    state: "UNAVAILABLE",
    interactionKind: "A2A",
    runtimeEndpoint: endpoint,
    agentCardUrl: cardUrl,
    extensionUri: SPOTRIQ_AUTHORITY_BINDING_EXTENSION_URI,
    signatureScheme: AUTHORITY_BINDING_SIGNATURE_SCHEME,
    observedAt,
    evidenceIds: [],
    methodVersion: AGENT_AUTHORITY_BINDING_METHOD,
    detail,
    limitations: [
      "A service without the Spotriq authority-binding extension remains discoverable/testable, but Spotriq cannot safely bind an Altana session key to that service.",
      "No browser-entered or marketplace-invented public key can satisfy this binding.",
    ],
  };
}

export function createAgentAuthorityBindingVerifier(options: AgentAuthorityBindingVerifierOptions = {}): AgentAuthorityBindingVerifier {
  const fetcher = options.fetcher ?? fetch;
  const resolver = options.resolver ?? defaultResolver;
  const timeoutMs = options.timeoutMs ?? 6_000;
  const maxResponseBytes = options.maxResponseBytes ?? 128 * 1024;
  const maxRedirects = options.maxRedirects ?? 2;
  const allowInsecureHttp = options.allowInsecureHttp ?? false;
  const now = options.now ?? (() => new Date());
  const nonce = options.nonce ?? randomUUID;
  const publicKeyAddress = options.publicKeyAddress ?? ((publicKey: Hex) => publicKeyToAddress(publicKey));
  const recoverAddress = options.recoverAddress ?? ((message: string, signature: Hex) => recoverMessageAddress({ message, signature }));
  const httpOptions = { fetcher, resolver, timeoutMs, maxResponseBytes, maxRedirects, allowInsecureHttp };

  return {
    async verify(record) {
      const observedAt = now().toISOString();
      let endpoint: ServiceRuntimeEndpoint;
      try {
        endpoint = a2aEndpoint(record);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return { binding: unavailable(record, "", "", detail, observedAt), evidence: [] };
      }
      const cardUrl = a2aCardUrl(endpoint.endpoint, allowInsecureHttp);
      try {
        const cardResponse = await boundedFetch(cardUrl, { method: "GET" }, httpOptions);
        if (cardResponse.status < 200 || cardResponse.status >= 300) throw new Error(`A2A Agent Card returned HTTP ${cardResponse.status}.`);
        if (!/json/i.test(cardResponse.contentType)) throw new Error("A2A Agent Card did not return JSON.");
        const card = JSON.parse(cardResponse.bodyText) as Record<string, unknown>;
        const capabilities = card.capabilities && typeof card.capabilities === "object" && !Array.isArray(card.capabilities)
          ? card.capabilities as Record<string, unknown>
          : {};
        const extension = objectArray(capabilities.extensions).find((item) => normalizeText(item.uri) === SPOTRIQ_AUTHORITY_BINDING_EXTENSION_URI);
        if (!extension) {
          return { binding: unavailable(record, endpoint.endpoint, cardResponse.finalUrl, "The A2A Agent Card does not declare the Spotriq authority-binding extension.", observedAt), evidence: [] };
        }
        const params = extension.params && typeof extension.params === "object" && !Array.isArray(extension.params)
          ? extension.params as Record<string, unknown>
          : {};
        const publicKey = assertSec1PublicKey(normalizeText(params.sessionPublicKey));
        const scheme = normalizeText(params.signatureScheme).toLowerCase();
        if (scheme !== "eip191-secp256k1") throw new Error("Authority-binding extension must use eip191-secp256k1 challenge signatures.");
        const challengeUrl = sameOriginUrl(normalizeText(params.challengeUrl), endpoint.endpoint, allowInsecureHttp);
        const issuedAt = now();
        const expiresAt = new Date(issuedAt.getTime() + 60_000);
        const challengeNonce = nonce();
        const challenge = [
          "Spotriq authority binding verification",
          `serviceId:${record.service.serviceId}`,
          `agentId:${record.identity.identity.agentId}`,
          `nonce:${challengeNonce}`,
          `issuedAt:${issuedAt.toISOString()}`,
          `expiresAt:${expiresAt.toISOString()}`,
        ].join("\n");
        const challengeResponse = await boundedFetch(challengeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ serviceId: record.service.serviceId, agentId: record.identity.identity.agentId, nonce: challengeNonce, challenge, issuedAt: issuedAt.toISOString(), expiresAt: expiresAt.toISOString() }),
        }, httpOptions);
        if (challengeResponse.status < 200 || challengeResponse.status >= 300) throw new Error(`Authority challenge endpoint returned HTTP ${challengeResponse.status}.`);
        if (!/json/i.test(challengeResponse.contentType)) throw new Error("Authority challenge endpoint did not return JSON.");
        const response = JSON.parse(challengeResponse.bodyText) as Record<string, unknown>;
        if (normalizeText(response.challenge) !== challenge) throw new Error("Authority challenge response did not echo the exact Spotriq challenge.");
        const returnedKey = assertSec1PublicKey(normalizeText(response.sessionPublicKey));
        if (returnedKey.toLowerCase() !== publicKey.toLowerCase()) throw new Error("Authority challenge response used a different session public key than the Agent Card declaration.");
        const signature = assertSignature(normalizeText(response.signature));
        const expectedAddress = publicKeyAddress(publicKey);
        const recoveredAddress = await recoverAddress(challenge, signature);
        if (expectedAddress.toLowerCase() !== recoveredAddress.toLowerCase()) throw new Error("Authority challenge signature does not verify against the declared session public key.");

        const evidence = createEvidenceEnvelope({
          subjectType: "agent_service",
          subjectId: record.service.serviceId,
          metric: "service.authority_session_key_control",
          value: publicKey,
          provenance: "marketplace-observed",
          source: DATA_SOURCES.MARKETPLACE,
          sourceRef: challengeResponse.finalUrl,
          observedAt,
          confidence: "high",
          method: EVIDENCE_METHODS.MARKETPLACE_TEST_LAB,
          limitation: "Spotriq observed a fresh EIP-191 challenge signed by the service runtime using the private key corresponding to this public key. This proves runtime key control at the observation time; it does not prove future availability or financial execution safety.",
        });
        const binding: AgentAuthorityBinding = {
          bindingId: `authority-binding:${encodeURIComponent(record.service.serviceId)}:${expectedAddress.toLowerCase()}`,
          serviceId: record.service.serviceId,
          agentId: record.identity.identity.agentId,
          state: "VERIFIED",
          interactionKind: "A2A",
          runtimeEndpoint: endpoint.endpoint,
          agentCardUrl: cardResponse.finalUrl,
          extensionUri: SPOTRIQ_AUTHORITY_BINDING_EXTENSION_URI,
          challengeUrl: challengeResponse.finalUrl,
          signatureScheme: AUTHORITY_BINDING_SIGNATURE_SCHEME,
          sessionPublicKey: publicKey,
          sessionKeyAddress: expectedAddress.toLowerCase(),
          observedAt,
          evidenceIds: [evidence.evidenceId],
          methodVersion: AGENT_AUTHORITY_BINDING_METHOD,
          detail: "Spotriq verified a fresh service-runtime challenge signed by the Altana-compatible secp256k1 session key declared in the A2A Agent Card extension.",
          limitations: [
            "Binding proves possession of the declared session private key by the observed service runtime at this time; it is not a financial permission grant.",
            "A later Altana grant must use this exact public key and be independently verified onchain before Spotriq can call the authority binding active.",
          ],
        };
        return { binding, evidence: [evidence] };
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return {
          binding: {
            ...unavailable(record, endpoint.endpoint, cardUrl, detail, observedAt),
            bindingId: `authority-binding:${encodeURIComponent(record.service.serviceId)}:failed:${randomUUID()}`,
            state: "FAILED",
            detail,
          },
          evidence: [],
        };
      }
    },
  };
}
