# Local evidence artifacts

`pnpm capture:public-launch-evidence` writes timestamped production API proof here.

Generated JSON evidence is intentionally ignored by git by default so environment-specific captures are not accidentally treated as canonical repository state. Archive the generated file with the external submission package when appropriate.
