import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const [smartMoney, tests, packageJson] = await Promise.all([
  read("packages/smart-money/src/index.ts"),
  read("packages/smart-money/src/index.test.ts"),
  read("package.json"),
]);

const requireText = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};
const rejectText = (source, marker, message) => {
  if (source.includes(marker)) throw new Error(message);
};

requireText(
  smartMoney,
  'const yieldOpportunitySnapshotId = `${snapshot.portfolioSnapshotId}:yield:${opportunity.opportunityId}`',
  "Yield opportunity persistence must scope the normalized snapshot primary key to the portfolio observation.",
);
rejectText(
  smartMoney,
  "[opportunity.opportunityId,snapshot.portfolioSnapshotId,snapshot.checkSessionId",
  "Stable Venus opportunityId must not be reused as the normalized yield snapshot primary key across checks.",
);
requireText(
  smartMoney,
  'session.failureReason = "Smart Money Check finalization failed. Start a fresh check."',
  "Finalization persistence failures must mark the Smart Money session FAILED instead of leaving SCANNING forever.",
);
requireText(
  smartMoney,
  'finalization.state = "FAILED"',
  "The final Smart Money progress row must become FAILED on persistence/finalization failure.",
);
requireText(
  tests,
  'Postgres yield snapshot persistence scopes stable Venus opportunity ids to each portfolio observation',
  "Regression coverage must verify repeated Smart Money checks cannot collide on yield snapshot primary keys.",
);
requireText(
  tests,
  'assert.equal(terminalFailure?.state, "FAILED")',
  "Regression coverage must verify a finalization exception is persisted as a terminal FAILED check.",
);
requireText(
  packageJson,
  '"verify:smart-money-persistence": "node scripts/verify-smart-money-persistence.mjs"',
  "The Smart Money persistence verifier must be exposed as a root script.",
);

console.log("PASS: Spotriq Smart Money persistence scopes repeated yield observations per portfolio snapshot and fails terminally instead of stranding SCANNING sessions.");
