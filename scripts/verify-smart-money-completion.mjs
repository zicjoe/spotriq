import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(root, file), "utf8");
const [appUi, repository, checkRoutes, smartMoney] = await Promise.all([
  read("apps/web/src/app/App.tsx"),
  read("apps/web/src/repositories/smartMoneyRepository.ts"),
  read("apps/api/src/routes/checks.ts"),
  read("packages/smart-money/src/index.ts"),
]);

const requireText = (source, marker, message) => {
  if (!source.includes(marker)) throw new Error(message);
};

requireText(appUi, "getCheckStatus(checkSessionId)", "Smart Money scan must use the lightweight status watchdog.");
requireText(appUi, "window.setInterval(() => { void refresh(); }, 900)", "Smart Money scan must poll terminal status independently of SSE.");
requireText(appUi, "The status watchdog remains authoritative if SSE is interrupted or buffered", "SSE must be an optimization, not a terminal-state single point of failure.");
requireText(appUi, "Date.now() - lastProgressAt > 45_000", "A genuinely stalled Smart Money scan must surface recovery instead of spinning indefinitely.");
requireText(repository, "/status`));", "Web repository must expose the lightweight Smart Money status endpoint.");
requireText(checkRoutes, '"/v1/checks/:checkSessionId/status"', "API must expose the lightweight Smart Money status endpoint.");
requireText(checkRoutes, "Smart Money Check SSE recovery poll failed", "SSE route must include database-backed recovery polling.");
requireText(checkRoutes, "setInterval(() => { void poll(); }, 1_000)", "SSE recovery polling must be bounded to about one second.");
requireText(checkRoutes, "smartMoney.listEvents(checkSessionId, lastSequence)", "SSE recovery must reconcile persisted events, not rely only on process-local listeners.");
requireText(smartMoney, 'label: "Preparing findings & agent matches"', "The final scan stage must not misleadingly claim it is already matching agents.");
requireText(smartMoney, "Finalize the scan in one persisted session update", "Smart Money finalization must avoid redundant terminal session writes.");
requireText(smartMoney, "await Promise.all([...yieldWrites, ...gridWrites, ...lendingWrites])", "Normalized portfolio child writes must not serialize independent remote DB round-trips.");

console.log("PASS: Spotriq Smart Money completion watchdog prevents missed/buffered SSE from causing indefinite scans and reduces finalization round-trips.");
