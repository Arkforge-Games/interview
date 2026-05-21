# Azure Environment Backup — Slayjobs

**Last refreshed:** 2026-05-20 12:39 UTC (snapshot taken just before Railway became the dual-deploy target)

Backups live OUTSIDE this repo at `~/.config/hobbyland-secrets/` because they contain live secrets (DB password, API keys, Stripe webhook secrets). The repo never carries real secrets — provider anti-leak scanners would revoke them within minutes if committed.

This doc is the index telling future-you where the backup is and how to restore from it.

## What's backed up (local-only, `~/.config/hobbyland-secrets/`)

| File | Contents |
|---|---|
| `slayjobs-azure-pgdump-2026-05-20T12-37-46Z.dump` | Full PG16 `pg_dump` of `slayjobs_db` — 619 users, 619 subscriptions, 837 sessions, 855 InterviewAnswer, 249 InterviewSession, 44 TrialCode (2.9 MB custom format) |
| `slayjobs-azure-appsettings-2026-05-20T12-39-29Z.json` | All 23 Azure App Service env vars with values: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI`, `STRIPE_SECRET_KEY`/`PUBLISHABLE_KEY`/`WEBHOOK_SECRET`/`MONTHLY_PRICE_ID`/`YEARLY_PRICE_ID`, `ANTHROPIC_API_KEY` (+ FALLBACK), `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `FRONTEND_URL`, `NODE_ENV`, `WEBSITES_PORT`, `DOCKER_REGISTRY_*` |
| `slayjobs-azure-webapp-config-2026-05-20T12-39-29Z.json` | Runtime stack — currently `DOCKER\|n8nhobbylandacr.azurecr.io/interview-app:1f9fd829e3398b7744db4a0bcf8a7c5e489a6722`. Image tag is the git commit, so reproducible from source. Plus `alwaysOn`, healthcheck path, etc. |
| `slayjobs-azure-hostnames-2026-05-20T12-39-29Z.json` | 3 hostnames + SSL state: `hobbyland-interview.azurewebsites.net`, `slayjobs.com`, `www.slayjobs.com` |
| `slayjobs-azure-webapp-show-2026-05-20T12-39-29Z.json` | Full Azure resource object: plan ID `hobbyland-interview-plan`, location Southeast Asia, kind app,linux |
| `slayjobs-RESTORE.md` | Detailed restore script with literal secret references (not committed here) |
| `slayjobs-supabase-db-password.txt` | Supabase DB password (the Railway+Supabase side) |
| `supabase.access-token` | Supabase Management API tokens + DB password + Stripe webhook secrets |
| `slayjobs.env.backup-2026-04-29T01-51-52Z` | Older April snapshot — kept for diffing against current state |

## How to refresh this backup

When Azure env vars or container image changes (e.g. you push a new commit and Azure builds a new image), re-run the capture:

```bash
TS=$(date -u +%Y-%m-%dT%H-%M-%SZ)
DIR=~/.config/hobbyland-secrets

az webapp config appsettings list --name hobbyland-interview --resource-group hobbyland-interview-rg --output json > $DIR/slayjobs-azure-appsettings-${TS}.json
az webapp config show --name hobbyland-interview --resource-group hobbyland-interview-rg --output json > $DIR/slayjobs-azure-webapp-config-${TS}.json
az webapp config hostname list --webapp-name hobbyland-interview --resource-group hobbyland-interview-rg --output json > $DIR/slayjobs-azure-hostnames-${TS}.json
az webapp show --name hobbyland-interview --resource-group hobbyland-interview-rg --output json > $DIR/slayjobs-azure-webapp-show-${TS}.json

# Fresh DB dump (PG16 client required — server is PG16)
PGPASSWORD='<n8nadmin-password>' /opt/homebrew/opt/postgresql@16/bin/pg_dump \
  "postgresql://n8nadmin@n8n-hobbyland-pg.postgres.database.azure.com:5432/slayjobs_db?sslmode=require" \
  --no-owner --no-acl -F c -f $DIR/slayjobs-azure-pgdump-${TS}.dump

chmod 600 $DIR/slayjobs-azure-*${TS}*
```

(The `n8nadmin` password lives in the `DATABASE_URL` env var inside the latest appsettings JSON.)

## How to restore from these backups

Full step-by-step in `~/.config/hobbyland-secrets/slayjobs-RESTORE.md` (kept outside the repo because the script has literal secret values inlined). High level:

1. **Recreate App Service Plan** (if gone): `az appservice plan create -g hobbyland-interview-rg -n hobbyland-interview-plan --sku B1 --is-linux`
2. **Recreate the Web App** pointing at the container image tag from `slayjobs-azure-webapp-config-*.json`
3. **Replay env vars** from `slayjobs-azure-appsettings-*.json` via `az webapp config appsettings set --settings @file.json` (strip metadata keys first via `jq`)
4. **Re-bind custom domains** (`slayjobs.com`, `www.slayjobs.com`) — DNS must already point at the new App Service
5. **Restore DB** via `pg_restore --clean --if-exists` against the existing Azure Postgres (or a fresh one if that's gone too)

## What's NOT in these backups (lives elsewhere, can't snapshot)

- **Stripe customer/subscription state** — lives in Stripe. To list webhooks: `curl -u "$STRIPE_SECRET_KEY:" https://api.stripe.com/v1/webhook_endpoints | jq .`
- **Google OAuth client config** — Google Cloud Console at `console.cloud.google.com/apis/credentials` (client `339274493372-0dk67efqq0t73chgfnul3li4oo46jlos`)
- **DNS records** for `slayjobs.com` — lives at the domain registrar
- **Azure Postgres firewall rules** — query via `az postgres flexible-server firewall-rule list -g n8n-hobbyland-rg -n n8n-hobbyland-pg` if needed
- **Azure Container Registry images** — live in `n8nhobbylandacr.azurecr.io`, separate from App Service. Listed via `az acr repository show-tags --name n8nhobbylandacr --repository interview-app`

## Related

- [RAILWAY-MIGRATION-STATUS.md](RAILWAY-MIGRATION-STATUS.md) — current dual-deploy state (Azure + Railway+Supabase)
- Parent repo migration playbook: `Documents/Azure-to-Railway-Migration/` (in n8nProject01 parent repo, not in this submodule)
