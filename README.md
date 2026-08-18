# Spotriq

**BSC financial-agent marketplace**

> Know what your money needs. Spot the right agent for it.

This repository is the engineering-ready replacement of the Figma Make export.

## Run locally on Windows PowerShell

1. Extract the ZIP to a simple folder, for example:

```powershell
C:\dev\spotriq
```

2. Open PowerShell in that folder.

3. Confirm Node.js is installed:

```powershell
node -v
```

Use Node.js 20 or newer.

4. Enable pnpm with Corepack if pnpm is not already installed:

```powershell
corepack enable
corepack prepare pnpm@latest --activate
```

5. Install dependencies:

```powershell
pnpm install
```

6. Run the checks:

```powershell
pnpm check
```

7. Start Spotriq:

```powershell
pnpm dev
```

8. Open the local URL Vite prints, normally:

```text
http://localhost:5173
```

## Important
The current product uses clearly labelled sample marketplace data. Real BSC/protocol/backend integrations are the next engineering phase.

See:
- `docs/FIGMA_EXPORT_AUDIT.md`
- `docs/BACKEND_FUSION_CONTRACT.md`
- `docs/IMPLEMENTATION_REPORT_FRONTEND_STABILIZATION.md`


### Cross-platform pnpm note
The workspace intentionally does not restrict `supportedArchitectures`; pnpm should install the correct native optional dependencies for Windows development and Linux deployment environments.
