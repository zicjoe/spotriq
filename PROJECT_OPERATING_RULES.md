# Spotriq Project Operating Rules

**Status:** Canonical engineering workflow and continuation contract  
**Recovered from:** original Spotriq engineering practice + user-supplied foundational Master Product + Engineering Continuation Prompt  
**Applies from:** v0.21.0 foundation reconciliation onward

## 1. Source-of-truth rule

The latest supplied repository/ZIP is the implementation source of truth. Historical prompts and conversations preserve product intent and roadmap obligations, but they do not prove that code exists.

When implementation and product doctrine differ:

- record the implementation fact in `PROJECT_STATE.md`;
- preserve the product obligation in `SPOTRIQ_FOUNDATION.md` unless explicitly cancelled;
- record the mismatch in `SPOTRIQ_DRIFT_AUDIT.md`;
- update `CORRECTED_ROADMAP.md` with the corrective sequence.

Do not silently rewrite either history or current code reality.

## 2. Milestone execution contract

For an approved milestone, the default engineering flow is:

1. inspect the latest repository/ZIP;
2. read `PROJECT_STATE.md`, `SPOTRIQ_FOUNDATION.md`, `SPOTRIQ_DRIFT_AUDIT.md` and `CORRECTED_ROADMAP.md`;
3. inspect relevant subsystem docs and existing tests before changing code;
4. verify current external technical documentation where an integration may have changed;
5. implement inside the existing architecture rather than creating disconnected patches;
6. preserve existing functionality and locked domain/evidence boundaries;
7. add/update tests and negative/partial-data cases;
8. run all authoritative validation available in the environment;
9. update migrations/versioning/docs when the milestone genuinely requires them;
10. update `PROJECT_STATE.md` before the milestone is considered complete;
11. update the drift audit/roadmap if the milestone changes product direction;
12. package one complete replacement ZIP when a ZIP-based handoff is appropriate;
13. provide exact Windows PowerShell install/test commands and expected results;
14. provide a recommended conventional Git commit message and commit/push commands;
15. state the next recommended milestone.

A milestone is not complete merely because code was written.

## 3. Validation contract

`pnpm check` remains the authoritative local repository validation command. It currently runs the project verifier, TypeScript checks, tests and build.

At minimum, each milestone should consider:

- deterministic/unit tests;
- API contract/schema validation;
- TypeScript semantic checks;
- negative/error states;
- partial-data and stale-evidence states;
- external-provider timeout/failure/rate-limit behavior;
- UI loading/error/empty states;
- backwards compatibility;
- architecture verifier regression guards.

Never claim a live onchain transaction, provider grant, production payment or financial outcome unless the validation actually observed it.

## 4. Release discipline

For a meaningful implementation release:

- bump the root/package version consistently where the repository convention requires it;
- preserve existing migration numbering/history;
- update README and technical docs;
- update `SOURCE_OF_TRUTH.md` and `PROJECT_STATE.md`;
- add migrations only when data persistence changes require them;
- update tests and `scripts/verify-foundation.mjs` for new locked invariants;
- package the full project root as `Spotriq/`;
- exclude `.git` and `node_modules` from replacement ZIPs.

Documentation-only governance reconciliation does not need to pretend to be a new feature release.

## 5. Local and deployed data strategy

Local development must remain usable without Postgres/Redis:

- no `DATABASE_URL` → memory stores;
- `DATABASE_URL` configured → PostgreSQL stores.

Do not require a local Windows machine to resolve Railway private hostnames such as `postgres.railway.internal`. Railway private networking belongs inside deployed Railway services. Database migrations can run inside the deployed environment using `pnpm db:migrate` where configured.

Optional RPC/provider failures should degrade clearly rather than crash the entire local product.

## 6. Windows replacement-ZIP workflow

Typical user environment is Windows PowerShell with the project at `C:\dev\Spotriq`.

A replacement ZIP handoff should normally use a workflow equivalent to:

```powershell
cd C:\dev
Rename-Item Spotriq Spotriq-vOLD-backup
# Extract the replacement ZIP so the new root is C:\dev\Spotriq

Move-Item C:\dev\Spotriq-vOLD-backup\.git C:\dev\Spotriq\.git

if (Test-Path C:\dev\Spotriq-vOLD-backup\.env) {
    Copy-Item C:\dev\Spotriq-vOLD-backup\.env C:\dev\Spotriq\.env
}

cd C:\dev\Spotriq
pnpm install
pnpm check
pnpm dev
```

Preserve `pnpm-lock.yaml` according to the actual dependency state; do not blindly overwrite a newer valid lockfile with an older one.

Do not reintroduce Linux-only `supportedArchitectures` workspace configuration that previously broke Windows Rollup binaries.

## 7. Engineering interaction convention

When the user says **“Let’s go”**, proceed with the obvious documented next milestone unless repository inspection reveals a blocker or the user has explicitly reopened a product decision.

For long implementation work, provide concise progress updates. Diagnose errors from the actual output supplied; prefer fixing the implementation and returning a complete replacement ZIP over asking the user to manually edit many source files.

Every successful milestone handoff should include:

```powershell
git status
git add .
git commit -m "<recommended conventional commit>"
git push
```

## 8. Continuation rule

A new Spotriq conversation should not need an enormous master prompt. The minimum continuation package is:

1. latest Spotriq ZIP/repository;
2. `PROJECT_STATE.md`;
3. `SPOTRIQ_FOUNDATION.md`;
4. `SPOTRIQ_DRIFT_AUDIT.md`;
5. `CORRECTED_ROADMAP.md`;
6. this operating-rules file.

Historical chats/prompts are consulted only to resolve missing rationale or disputes, not as the primary day-to-day runtime context.
