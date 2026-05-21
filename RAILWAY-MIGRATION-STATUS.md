# Railway + Supabase Migration Status

**Migration completed:** 2026-05-20 (slayjobs / interview repo)
**Playbook used:** `Documents/Azure-to-Railway-Migration/` (LibriAI playbook)
**State:** Dual-deployed — Azure + Railway both serving. Azure NOT decommissioned.

## Live state

| Component | Value |
|---|---|
| Railway workspace | `ops5hobbyland's Projects` |
| Railway project name | `supportive-essence` (auto-generated, not renamed) |
| Railway project ID | `96185a33-9274-4fc2-875c-342e203aa455` |
| Railway service name | `slayjobs` |
| Railway service ID | `e8a3833c-1d3d-4223-911f-24a7df89dbad` |
| Railway environment ID | `d9a6ae74-b2a0-4471-8746-17e333a78fcc` |
| Railway public domain | `https://slayjobs-production.up.railway.app` |
| Railway region | US East (sub-optimal — DB is in Seoul, ~200ms cross-region; move to Singapore for perf if needed) |
| Railway repo | `hobbyland-tony/slayjobs` (deploy branch `railway-supabase-migration`) |
| Deploy method | `railway up --detach` via CLI (Dockerfile build) |
| First successful deploy | `ccde5265-4855-49ed-8d0d-c9826585e012` on 2026-05-20 |
| Supabase project name | `slayjobs` |
| Supabase project ref | `nxaqkcmrudozelerfdsm` |
| Supabase region | `ap-northeast-2` (Seoul, AWS — matches LibriAI) |
| Postgres version | 17.6 |
| Supabase plan | Pro (org `Hobbyland` upgraded 2026-05-20) |
| DB host (direct) | `db.nxaqkcmrudozelerfdsm.supabase.co:5432` |
| DB host (pooler) | `aws-1-ap-northeast-2.pooler.supabase.com` (transaction :6543, session :5432) |
| DB password backup | `~/.config/hobbyland-secrets/supabase.access-token` (`SUPABASE_DB_PASSWORD`) |

## Azure (still running, NOT decommissioning)

| Component | Value |
|---|---|
| App Service | `hobbyland-interview` in `hobbyland-interview-rg` (misleading name — slayjobs.com is the custom hostname on top) |
| App Service hostname | `https://hobbyland-interview.azurewebsites.net` |
| Custom domain | `https://slayjobs.com` |
| Postgres | `n8n-hobbyland-pg.postgres.database.azure.com` / db `slayjobs_db` |
| Branch → Azure | `main` (auto-deploys via GitHub Actions) |
| Branch → Railway | `railway-supabase-migration` (NOT merged to main yet) |

Both platforms will get new commits when their respective branches are pushed. Merging the migration branch to `main` later makes Azure and Railway both auto-deploy on every push.

## Env vars set on Railway

`NODE_ENV`, `DATABASE_URL` (pooler URL with `?pgbouncer=true`), `FRONTEND_URL`, `GOOGLE_REDIRECT_URI`, `JWT_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `VITE_GOOGLE_CLIENT_ID`, `ANTHROPIC_API_KEY`, `ANTHROPIC_API_KEY_FALLBACK`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_YEARLY_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` (Railway endpoint secret, not Azure's).

`PORT` is intentionally NOT set — Railway injects its own; the app reads `process.env.PORT`.

## Stripe webhooks (BOTH active, ADD don't REPLACE)

| Endpoint ID | URL | Secret location |
|---|---|---|
| `we_1TA0KeBPOtTIgrAVewGWDQdw` | https://hobbyland-interview.azurewebsites.net/api/v1/stripe/webhook | Azure App Service env: `STRIPE_WEBHOOK_SECRET` |
| `we_1TZ2WjBPOtTIgrAV6i5MqKWL` | https://slayjobs-production.up.railway.app/api/v1/stripe/webhook | Railway env: `STRIPE_WEBHOOK_SECRET` |

Both subscribe to the same 5 events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`.

## Data migrated

Snapshot via `pg_dump` (PG16 client) from Azure Postgres 2026-05-19 → restored to Supabase via session-mode pooler. Verified post-restore:

| Table | Rows |
|---|---|
| User | 620 |
| Subscription | 620 |
| Session | 837 |
| InterviewAnswer | 855 |
| InterviewSession | 249 |
| TrialCode | 44 |
| TrialCodeRedemption | 0 |

Azure Postgres remains the source of truth. Supabase is a point-in-time copy plus the few writes done via Railway since cutover.

## Pre-migration Azure backup

Full Azure App Service snapshot (env vars, container image tag, hostnames, DB dump) captured 2026-05-20 12:39 UTC. Backup files live at `~/.config/hobbyland-secrets/` (not in this repo — they carry live secrets). See [BACKUP-RESTORE.md](BACKUP-RESTORE.md) for the index, restore script, and refresh procedure.

## Connection strings

```
# Direct (IPv6-only — Mac IPv6 routing to Supabase was flaky during migration; use pooler instead)
postgresql://postgres:<PASSWORD>@db.nxaqkcmrudozelerfdsm.supabase.co:5432/postgres

# Pooler — session mode (for pg_dump/pg_restore/prisma db push)
postgresql://postgres.nxaqkcmrudozelerfdsm:<PASSWORD>@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres

# Pooler — transaction mode (what Railway app uses)
postgresql://postgres.nxaqkcmrudozelerfdsm:<PASSWORD>@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Verified post-deploy

- `GET /api/v1/health` → `200 {"success":true,"data":{"status":"ok",...}}`
- `GET /api/v1/health/db` → `200` (database connection healthy from Railway → Supabase Seoul pooler)
- `GET /` (frontend) → `200`, Express serves Vite-built SPA from `/public`
- Static assets `/assets/*` → `200` (CORS allow-list includes Railway domain via patched middleware)
- 837 sessions readable via Supabase pooler with the current DB password
- React console emits #418/#423 hydration warnings — pre-existing SPA behavior, non-blocking

## OUTSTANDING — user action required

**Google OAuth client `339274493372-0dk67efqq0t73chgfnul3li4oo46jlos`:** Until these URIs are added, Google login on the Railway domain will fail with `redirect_uri_mismatch`.

1. Open https://console.cloud.google.com/apis/credentials
2. Open OAuth 2.0 Client ID `339274493372-...`
3. Authorized JavaScript origins → ADD `https://slayjobs-production.up.railway.app`
4. Authorized redirect URIs → ADD `https://slayjobs-production.up.railway.app/api/v1/auth/google/callback`
5. **Keep all existing Azure / slayjobs.com URIs** — do not replace
6. Save, wait ~5 min for Google propagation, then test Google login on the Railway domain
7. Decide whether to merge `railway-supabase-migration` back into `main` (would make Azure + Railway both auto-deploy on every push)

## Playbook lessons added (beyond what LibriAI surfaced)

1. **Supabase free-tier project cap is per org member who is owner/admin** (not per org total). Hitting it requires Pro upgrade. Pro upgrade is dashboard-only — Management API doesn't expose billing.
2. **DB password from project creation can desync from pooler auth.** Resetting via `PATCH /v1/projects/<ref>/database/password` resyncs the pooler credentials and pooler auth starts working immediately. Useful when project was created via dashboard but a known password is needed for `pg_restore`.
3. **`pg_dump`/`pg_restore` requires client version ≥ server version.** Azure PG was 16, Mac default is 14. Fix: `brew install postgresql@16`, use `/opt/homebrew/opt/postgresql@16/bin/pg_dump`.
4. **`backup` git remote URL had an embedded revoked GitHub token.** Fix: rewrite to bare HTTPS URL + `gh auth setup-git`.
5. **Supabase direct DB URL is IPv6-only on free tier** — even from a local Mac, IPv6 routing was unreliable (`2406:da12:...` resolved but connection refused). Use pooler URL even for migrations.
6. **Railway platform outage during this migration.** The "Deploys have been paused due to a platform outage" banner only blocked **new project creation** (server-side `projectCreate` mutation rejection). Existing projects' `railway up`, `railway link`, `railway variables`, deploys all worked. Bypass: create empty project via dashboard, then `railway link` from CLI and continue normally.
7. **Cross-region Railway (US East) + Supabase (Seoul) adds ~200ms DB latency per query.** For production-quality SlayJobs, move Railway region to Singapore (closest available to Seoul). Defer if latency is acceptable.
