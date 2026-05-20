# Railway + Supabase Migration Status

**Migration date:** 2026-05-20
**State:** Dual-deployed (Azure + Railway both serving). Azure not decommissioned.

## Supabase
- **Project name:** `slayjobs`
- **Project ref:** `nxaqkcmrudozelerfdsm`
- **Region:** `ap-northeast-2` (Seoul, AWS) — matches LibriAI
- **Postgres version:** 17.6
- **Org:** Hobbyland (Pro plan as of 2026-05-20)
- **DB host (direct):** `db.nxaqkcmrudozelerfdsm.supabase.co:5432`
- **DB host (pooler):** `aws-1-ap-northeast-2.pooler.supabase.com:6543`
- **Password:** stored at `~/.config/hobbyland-secrets/slayjobs-supabase-db-password.txt` and `~/.config/hobbyland-secrets/slayjobs.env.local`

Schema pushed via `npx prisma db push --accept-data-loss` against the direct URL. 7 tables created (User, Session, Subscription, TrialCode, TrialCodeRedemption, InterviewSession, InterviewAnswer). **Fresh start — no data migrated from Azure.**

## Railway
- **Project name:** `supportive-essence` (auto-generated; not renamed)
- **Project ID:** `96185a33-9274-4fc2-875c-342e203aa455`
- **Service:** `slayjobs` (ID `e8a3833c-1d3d-4223-911f-24a7df89dbad`)
- **Region:** US East (Railway default; not changed because workload is light)
- **Domain:** https://slayjobs-production.up.railway.app
- **Deployed branch:** `railway-supabase-migration`
- **Deploy method:** `railway up --detach` (CLI), Dockerfile build
- **First successful deploy:** `ccde5265-4855-49ed-8d0d-c9826585e012` on 2026-05-20

### Env vars set on Railway
NODE_ENV, DATABASE_URL (pooler URL with `?pgbouncer=true`), FRONTEND_URL, GOOGLE_REDIRECT_URI, JWT_SECRET, JWT_ACCESS_EXPIRES, JWT_REFRESH_EXPIRES, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, VITE_GOOGLE_CLIENT_ID, ANTHROPIC_API_KEY, ANTHROPIC_API_KEY_FALLBACK, OPENAI_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_MONTHLY_PRICE_ID, STRIPE_YEARLY_PRICE_ID, STRIPE_WEBHOOK_SECRET.

**PORT is intentionally NOT set** — Railway injects its own and the app reads `process.env.PORT`.

## Verified post-deploy
- `GET /api/v1/health` → `200 {"success":true,"data":{"status":"ok",...}}`
- `GET /api/v1/health/db` → `200 {"success":true,"data":{"status":"ok","database":"connected",...}}`
- `GET /` (frontend) → `200`, ~4 KB index served by Express

## Azure (still running)
- App Service: `hobbyland-interview` in `hobbyland-interview-rg` (misleading name — slayjobs.com is a custom hostname on top)
- Continues to deploy from `main` via GitHub Actions
- Same Anthropic / OpenAI / Google OAuth keys as Railway

## Outstanding
- [ ] **Add Railway domain to Google OAuth client** at https://console.cloud.google.com/apis/credentials
  - OAuth client: `339274493372-0dk67efqq0t73chgfnul3li4oo46jlos`
  - Add to **Authorized JavaScript origins:** `https://slayjobs-production.up.railway.app`
  - Add to **Authorized redirect URIs:** `https://slayjobs-production.up.railway.app/api/v1/auth/google/callback`
  - **Keep existing slayjobs.com / hobbyland-interview.azurewebsites.net URIs in place.**
- [ ] Once OAuth URIs are added, test Google login on the Railway domain end-to-end
- [ ] Decide whether to merge `railway-supabase-migration` back into `main` (will make Azure + Railway both auto-deploy on every push)

## Gotchas hit during this migration
1. **Supabase org was reported as paid by user but API said free.** Was a stale state — user upgraded mid-flow and retry worked. Always check `GET /v1/organizations/<id>` to see `"plan"` before assuming.
2. **Pooler auth failed with the password from project creation.** Resetting the DB password via `PATCH /v1/projects/<ref>/database/password` resynced the pooler credentials and pooler auth started working immediately.
3. **Direct DB connection from this laptop is unreliable** — Supabase resolves to IPv6 (`2406:da12:...`) and the path is flaky. Prisma's `db push` worked once but psql kept failing with "Connection refused". Pooler URL (IPv4) is reliable; only use direct for occasional migrations.
4. **Railway was mid-outage** ("deploys disabled platform-wide" warning). `railway init` was rejected; project had to be created via the dashboard. After a few minutes the upload path recovered and `railway up` succeeded.
