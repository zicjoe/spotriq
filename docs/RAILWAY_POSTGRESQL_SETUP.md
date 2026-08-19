# Railway PostgreSQL Setup for Spotriq

Spotriq can run locally without PostgreSQL, but v0.5.0 can persist Smart Money Check sessions, portfolio snapshots, evidence, findings, and check events when `DATABASE_URL` is configured.

## Railway project setup

1. Open the Spotriq project in Railway.
2. Add a PostgreSQL database from the project canvas (`+ New` → Database → PostgreSQL).
3. Railway exposes PostgreSQL connection variables including `DATABASE_URL`.
4. For a Spotriq API service running inside the same Railway project, add a reference variable named `DATABASE_URL` that points to the Postgres service's `DATABASE_URL` rather than copying a hardcoded credential.
5. Deploy/redeploy the API service after applying the variable.

## Local migration against Railway

For local migration from your laptop, use Railway's externally reachable `DATABASE_PUBLIC_URL` (TCP proxy) as the value of local `DATABASE_URL`. Never commit `.env`. When Spotriq itself runs inside Railway, reference the Postgres service's private `DATABASE_URL` instead.

Then run:

```powershell
pnpm db:health
pnpm db:migrate
```

You should see migrations `0001`, `0002`, and `0003` applied on a fresh database.

## Local development without Railway

Leave `DATABASE_URL` blank. Spotriq automatically uses its in-memory Smart Money store. This mode is ephemeral: restarting the API loses previous check sessions.

## Production behavior

When `DATABASE_URL` exists, Spotriq automatically selects PostgreSQL persistence. No frontend or domain code changes are required.
