import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const required = [
  ".github/dependabot.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/codeql.yml",
  ".github/workflows/dependency-review.yml",
  ".github/codeql/codeql-config.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  ".env.example",
  ".gitignore",
];

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) throw new Error(`Missing repository-readiness file: ${rel}`);
}

const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
for (const requiredIgnore of [".env", "*.pem", "*.key", "*.p12", "*.pfx"]) {
  if (!gitignore.includes(requiredIgnore)) throw new Error(`.gitignore must protect ${requiredIgnore}`);
}

const dependabot = fs.readFileSync(path.join(root, ".github/dependabot.yml"), "utf8");
for (const token of ['package-ecosystem: "npm"', 'package-ecosystem: "github-actions"', 'interval: "weekly"']) {
  if (!dependabot.includes(token)) throw new Error(`Dependabot configuration missing: ${token}`);
}

const ci = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
for (const token of ["permissions:", "contents: read", "pnpm install --frozen-lockfile", "pnpm check"]) {
  if (!ci.includes(token)) throw new Error(`CI workflow missing hardening/validation token: ${token}`);
}

const codeql = fs.readFileSync(path.join(root, ".github/workflows/codeql.yml"), "utf8");
for (const token of ["security-events: write", "github/codeql-action/init@v4", "github/codeql-action/analyze@v4", "javascript-typescript", "config-file: ./.github/codeql/codeql-config.yml"]) {
  if (!codeql.includes(token)) throw new Error(`CodeQL workflow missing: ${token}`);
}
const codeqlConfig = fs.readFileSync(path.join(root, ".github/codeql/codeql-config.yml"), "utf8");
for (const token of ["security-extended", "paths-ignore:", "js/missing-rate-limiting"]) {
  if (!codeqlConfig.includes(token)) throw new Error(`CodeQL configuration missing: ${token}`);
}

const depReview = fs.readFileSync(path.join(root, ".github/workflows/dependency-review.yml"), "utf8");
for (const token of ["actions/dependency-review-action@v4", "fail-on-severity: high"]) {
  if (!depReview.includes(token)) throw new Error(`Dependency review workflow missing: ${token}`);
}

const security = fs.readFileSync(path.join(root, "SECURITY.md"), "utf8");
if (!security.includes("v0.41.0")) throw new Error("SECURITY.md must describe the current v0.41.0 security posture.");
if (!security.includes("BSC Mainnet financial execution remains disabled")) {
  throw new Error("SECURITY.md must preserve the Mainnet execution prohibition.");
}

const sourceTruth = fs.readFileSync(path.join(root, "SOURCE_OF_TRUTH.md"), "utf8");
if (!sourceTruth.includes("Current repository release:** **v0.41.0")) {
  throw new Error("SOURCE_OF_TRUTH.md header must identify v0.41.0 as the current repository release.");
}

const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
if (!readme.includes("Current implementation: v0.41.0")) {
  throw new Error("README.md must identify v0.41.0 as the current implementation.");
}

const walletLifecycleVerifier = fs.readFileSync(path.join(root, "scripts/verify-wallet-session-lifecycle.mjs"), "utf8");
if (walletLifecycleVerifier.includes("new URL(import.meta.url).pathname")) {
  throw new Error("Wallet-session verifier must not derive filesystem paths from URL.pathname; it breaks Windows drive-letter paths.");
}
if (!walletLifecycleVerifier.includes("fileURLToPath(import.meta.url)")) {
  throw new Error("Wallet-session verifier must use fileURLToPath(import.meta.url) for cross-platform repository path resolution.");
}

const forbiddenFilePatterns = [/\.pem$/i, /\.p12$/i, /\.pfx$/i, /(^|\/)id_rsa(?:\.|$)/i];
const ignoredDirs = new Set(["node_modules", ".git", "dist", "coverage"]);
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    const rel = path.relative(root, full).replaceAll(path.sep, "/");
    if (ent.isDirectory()) walk(full);
    else if (forbiddenFilePatterns.some((re) => re.test(rel))) {
      throw new Error(`Potential credential/key file must not be committed: ${rel}`);
    }
  }
}
walk(root);

const textExt = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".yml", ".yaml", ".env", ".example", ".md"]);
const privateKeyMarker = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
function scanText(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) scanText(full);
    else {
      const ext = path.extname(ent.name);
      if (!textExt.has(ext) && ent.name !== ".env.example" && ent.name !== ".gitignore") continue;
      const content = fs.readFileSync(full, "utf8");
      if (privateKeyMarker.test(content)) throw new Error(`Private-key material marker detected in ${path.relative(root, full)}`);
    }
  }
}
scanText(root);

console.log("PASS: Spotriq repository readiness includes CI, Dependabot, focused CodeQL scanning, dependency review, security/community policy, secret-file guards, and current v0.41 security truth.");
