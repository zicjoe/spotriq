import { isIP } from "node:net";

export const SECURITY_HARDENING_METHOD = "security.failure-boundaries@1.0.0";

export class SecurityBoundaryError extends Error {
  constructor(
    message: string,
    public readonly code: "UNSAFE_URL" | "UNTRUSTED_TEXT" | "STRUCTURE_LIMIT",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "SecurityBoundaryError";
  }
}

function ipv4Parts(address: string): [number, number, number, number] | undefined {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return undefined;
  return parts as [number, number, number, number];
}

function isNonPublicIpv4(address: string): boolean {
  const parts = ipv4Parts(address);
  if (!parts) return true;
  const [a, b, c, d] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224 ||
    (a === 255 && b === 255 && c === 255 && d === 255)
  );
}

function stripIpv6Brackets(address: string): string {
  return address.startsWith("[") && address.endsWith("]") ? address.slice(1, -1) : address;
}

function isNonPublicIpv6(address: string): boolean {
  const normalized = stripIpv6Brackets(address).toLowerCase().split("%")[0]!;
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (/^fe[89ab]/.test(normalized)) return true;
  if (normalized.startsWith("ff")) return true;
  if (normalized.startsWith("2001:db8:")) return true;
  if (normalized.startsWith("100:")) return true;
  if (normalized.startsWith("::ffff:")) {
    const mapped = normalized.slice("::ffff:".length);
    return isIP(mapped) === 4 ? isNonPublicIpv4(mapped) : true;
  }
  return false;
}

/**
 * Returns true only for numeric addresses eligible for outbound public-network calls.
 * Hostname safety still requires DNS resolution followed by this same test for every A/AAAA answer.
 */
export function isPublicNetworkAddress(address: string): boolean {
  const normalized = stripIpv6Brackets(address.trim());
  const family = isIP(normalized);
  if (family === 4) return !isNonPublicIpv4(normalized);
  if (family === 6) return !isNonPublicIpv6(normalized);
  return false;
}

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.aws.internal",
  "instance-data.ec2.internal",
  "metadata.azure.internal",
]);

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa"];

export interface ExternalUrlPolicy {
  label?: string;
  allowInsecureHttp?: boolean;
  allowFragment?: boolean;
  maxLength?: number;
}

/**
 * Shape-level SSRF policy. DNS-based public-address validation must still happen immediately
 * before a network request, and production transports should pin the validated resolution.
 */
export function validateExternalHttpUrl(raw: string, options: ExternalUrlPolicy = {}): URL {
  const label = options.label ?? "External URL";
  const maxLength = options.maxLength ?? 2048;
  const input = raw.trim();
  if (!input || input.length > maxLength) {
    throw new SecurityBoundaryError(`${label} is required and must be at most ${maxLength} characters.`, "UNSAFE_URL");
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new SecurityBoundaryError(`${label} must be a valid absolute URL.`, "UNSAFE_URL");
  }

  if (url.username || url.password) throw new SecurityBoundaryError(`${label} must not embed credentials.`, "UNSAFE_URL");
  if (url.protocol !== "https:" && !(options.allowInsecureHttp && url.protocol === "http:")) {
    throw new SecurityBoundaryError(`${label} must use HTTPS.`, "UNSAFE_URL");
  }
  if (!options.allowFragment && url.hash) throw new SecurityBoundaryError(`${label} must not contain a URL fragment.`, "UNSAFE_URL");

  const rawHostname = stripIpv6Brackets(url.hostname).toLowerCase();
  const hostname = rawHostname.endsWith(".") ? rawHostname.slice(0, -1) : rawHostname;
  if (!hostname || hostname.length > 253) throw new SecurityBoundaryError(`${label} hostname is invalid.`, "UNSAFE_URL");
  if (BLOCKED_HOSTS.has(hostname) || BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new SecurityBoundaryError(`${label} host is reserved for local or infrastructure use.`, "UNSAFE_URL");
  }

  const family = isIP(hostname);
  if (family !== 0) {
    if (!isPublicNetworkAddress(hostname)) throw new SecurityBoundaryError(`${label} targets a blocked/non-public IP address.`, "UNSAFE_URL");
  } else {
    // Marketplace/operator endpoints are expected to be public DNS names. Single-label names
    // are treated as internal/resolver-relative and are not eligible for remote probing.
    if (!hostname.includes(".")) throw new SecurityBoundaryError(`${label} must use a public fully-qualified hostname.`, "UNSAFE_URL");
    const labels = hostname.split(".");
    if (labels.some((part) => !part || part.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(part))) {
      throw new SecurityBoundaryError(`${label} hostname contains an invalid DNS label.`, "UNSAFE_URL");
    }
  }
  return url;
}

const UNSAFE_TEXT_CONTROLS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;

export function normalizeUntrustedText(value: unknown, label: string, maxLength: number, options: { required?: boolean } = {}): string {
  const required = options.required ?? true;
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return "";
    throw new SecurityBoundaryError(`${label} must be text.`, "UNTRUSTED_TEXT");
  }
  const normalized = value.normalize("NFC").trim();
  if ((required && !normalized) || normalized.length > maxLength) {
    throw new SecurityBoundaryError(`${label} ${required ? "is required and " : ""}must be at most ${maxLength} characters.`, "UNTRUSTED_TEXT");
  }
  if (UNSAFE_TEXT_CONTROLS.test(normalized)) {
    throw new SecurityBoundaryError(`${label} contains unsafe control or bidirectional formatting characters.`, "UNTRUSTED_TEXT");
  }
  return normalized;
}

export interface StructuredJsonBudget {
  maxDepth?: number;
  maxNodes?: number;
  maxArrayLength?: number;
  maxObjectKeys?: number;
  maxStringLength?: number;
}

/** Prevents bounded HTTP bodies from becoming pathological object graphs after JSON parsing. */
export function assertStructuredJsonBudget(value: unknown, options: StructuredJsonBudget = {}): void {
  const maxDepth = options.maxDepth ?? 12;
  const maxNodes = options.maxNodes ?? 4096;
  const maxArrayLength = options.maxArrayLength ?? 256;
  const maxObjectKeys = options.maxObjectKeys ?? 128;
  const maxStringLength = options.maxStringLength ?? 16_384;
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }];
  let nodes = 0;

  while (stack.length) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > maxNodes) throw new SecurityBoundaryError(`Structured provider response exceeds the ${maxNodes}-node safety budget.`, "STRUCTURE_LIMIT");
    if (current.depth > maxDepth) throw new SecurityBoundaryError(`Structured provider response exceeds the maximum nesting depth ${maxDepth}.`, "STRUCTURE_LIMIT");
    const item = current.value;
    if (typeof item === "string") {
      if (item.length > maxStringLength) throw new SecurityBoundaryError(`Structured provider response contains a string longer than ${maxStringLength} characters.`, "STRUCTURE_LIMIT");
      continue;
    }
    if (typeof item === "number" && !Number.isFinite(item)) throw new SecurityBoundaryError("Structured provider response contains a non-finite number.", "STRUCTURE_LIMIT");
    if (item === null || typeof item !== "object") continue;
    if (Array.isArray(item)) {
      if (item.length > maxArrayLength) throw new SecurityBoundaryError(`Structured provider response array exceeds ${maxArrayLength} items.`, "STRUCTURE_LIMIT");
      for (const child of item) stack.push({ value: child, depth: current.depth + 1 });
      continue;
    }
    const entries = Object.entries(item as Record<string, unknown>);
    if (entries.length > maxObjectKeys) throw new SecurityBoundaryError(`Structured provider response object exceeds ${maxObjectKeys} keys.`, "STRUCTURE_LIMIT");
    for (const [key, child] of entries) {
      if (key === "__proto__" || key === "prototype") throw new SecurityBoundaryError(`Structured provider response contains forbidden key ${key}.`, "STRUCTURE_LIMIT");
      if (key.length > 256) throw new SecurityBoundaryError("Structured provider response contains an overlong object key.", "STRUCTURE_LIMIT");
      stack.push({ value: child, depth: current.depth + 1 });
    }
  }
}

export function isDatabaseUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; constraint?: unknown };
  return candidate.code === "23505" || candidate.code === 23505;
}
