# slayjobs.com → Railway domain cutover

**Goal:** Flip the live user-facing domain `slayjobs.com` and `www.slayjobs.com` from Azure App Service (`hobbyland-interview`) to Railway service (`slayjobs` at `slayjobs-production.up.railway.app`). User-facing URL stays `slayjobs.com` — only the backend serving it changes.

**Cutover branch:** `domain-cutover-railway` (off `railway-supabase-migration`)

## Pre-cutover state (2026-05-21)

| What | Value |
|---|---|
| Apex `slayjobs.com` | A → `20.212.64.4` (Azure SE Asia) |
| `www.slayjobs.com` | CNAME → `hobbyland-interview.azurewebsites.net` |
| DNS provider | Cloudflare (`seth.ns.cloudflare.com`, `indie.ns.cloudflare.com`) |
| Cloudflare proxy | OFF (grey cloud, DNS-only) |
| Azure custom hostname bindings | `slayjobs.com`, `www.slayjobs.com`, `hobbyland-interview.azurewebsites.net` |
| Railway custom hostnames | None — only `slayjobs-production.up.railway.app` |

## Why no code changes

Searched the repo — only 2 places reference any URL (`backend/src/middleware/cors.ts:9` and `backend/src/app.ts:24`), and both already include `slayjobs.com` + `www.slayjobs.com` in CORS allow-list and CSP `connectSrc`. The app reads `FRONTEND_URL` from env. So the cutover is purely: env-var update + Railway domain binding + Cloudflare DNS swap.

## Cutover steps

### 1. Add custom domains on Railway (CLI, ~30 sec)

```bash
cd workflows/interview
railway domain slayjobs.com
railway domain www.slayjobs.com
```

Railway returns a CNAME target (something like `xxx.up.railway.app` for each domain). **Record both.**

### 2. Update Railway env vars (CLI, ~10 sec)

```bash
railway variables \
  --set "FRONTEND_URL=https://slayjobs.com" \
  --set "GOOGLE_REDIRECT_URI=https://slayjobs.com/api/v1/auth/google/callback"
```

Triggers an auto-redeploy (~2 min).

### 3. Update DNS at Cloudflare (browser, user action)

Open https://dash.cloudflare.com → `slayjobs.com` zone → DNS → Records

**For apex `slayjobs.com`:**
- DELETE the existing A record `slayjobs.com → 20.212.64.4`
- ADD a CNAME record: `slayjobs.com → <railway-cname-target-from-step-1>`
  - Cloudflare auto-flattens CNAME on apex (no manual workaround needed)
  - Proxy: keep OFF (grey cloud) to match current behavior
  - TTL: Auto

**For `www.slayjobs.com`:**
- EDIT the existing CNAME `www → hobbyland-interview.azurewebsites.net`
- Change target to `<railway-cname-target-from-step-1>`
- Proxy: keep OFF
- TTL: Auto

### 4. Wait for DNS propagation + Railway SSL issuance

```bash
# Watch DNS converge (usually 1-2 min on Cloudflare)
until dig +short slayjobs.com | grep -q railway; do echo "$(date +%H:%M:%S) waiting..."; sleep 15; done; echo "DNS done"

# Watch Railway issue Let's Encrypt cert (usually 1-3 min after DNS resolves)
until curl -sI https://slayjobs.com 2>&1 | grep -q "HTTP/2 200"; do echo "$(date +%H:%M:%S) waiting on SSL..."; sleep 15; done; echo "SSL done"
```

### 5. Verify end-to-end

```bash
curl -sI https://slayjobs.com/api/v1/health        # Expect 200 with timestamp
curl -sI https://www.slayjobs.com/                 # Expect 200
curl -s  https://slayjobs.com/api/v1/health/db     # Expect database:connected
```

Open https://slayjobs.com in browser — page should render normally with the Railway backend serving it.

### 6. Azure side — do NOT remove anything yet

Leave Azure's custom hostname bindings (`slayjobs.com`, `www.slayjobs.com`) intact for at least 1 week. Why:
- DNS caches at upstream resolvers can take 24-48h to fully expire
- If Railway has any issue during the first week, fastest rollback is "switch DNS back to Azure"

Plan to revisit: 2026-05-28. If everything is stable, then:
```bash
az webapp config hostname delete --webapp-name hobbyland-interview --resource-group hobbyland-interview-rg --hostname slayjobs.com
az webapp config hostname delete --webapp-name hobbyland-interview --resource-group hobbyland-interview-rg --hostname www.slayjobs.com
```

### 7. Optional follow-ups (do after verification)

- **Stripe webhook:** Current Railway endpoint uses `slayjobs-production.up.railway.app/api/v1/stripe/webhook` — works fine but the URL would be cleaner as `slayjobs.com/api/v1/stripe/webhook`. To update: PATCH endpoint `we_1TZ2WjBPOtTIgrAV6i5MqKWL` via `curl -u "$STRIPE_SECRET_KEY:" -X POST https://api.stripe.com/v1/webhook_endpoints/we_... -d "url=https://slayjobs.com/api/v1/stripe/webhook"`. Webhook secret stays the same.
- **Google OAuth:** No change needed if redirect URIs already include `https://slayjobs.com/api/v1/auth/google/callback` (they did pre-migration — slayjobs.com pointed at Azure with the same path).

## Rollback (if anything breaks)

DNS-side rollback (fastest):
1. Cloudflare → revert apex to `A 20.212.64.4` and `www` to `CNAME hobbyland-interview.azurewebsites.net`
2. Update Railway env vars back to `FRONTEND_URL=https://slayjobs-production.up.railway.app`, `GOOGLE_REDIRECT_URI=https://slayjobs-production.up.railway.app/api/v1/auth/google/callback`
3. Wait ~2 min for DNS to converge

Railway custom domain bindings (`railway domain slayjobs.com`) can be removed independently — they don't break anything if left in place while DNS points elsewhere.

## Risks

- **DNS TTL** — Cloudflare's "Auto" TTL is typically 5 min; some upstream resolvers ignore it. Up to ~30 min for full propagation in practice.
- **Mixed-state traffic** — during propagation, some users hit Azure, some hit Railway. Both backends serve from the same Postgres DB (Supabase vs Azure DB), so any writes during this window go to different DBs. Mitigation: short DNS TTL + brief cutover window, OR temporarily point Railway at the Azure DB during cutover. For slayjobs at current scale (~620 users), the dual-write risk is acceptable; recovery via `pg_dump` if needed.
- **Railway SSL provisioning** — first cert issuance can fail if Railway can't reach the domain (DNS not propagated). Usually self-heals on retry within 5 min.

## Status log

- 2026-05-21: Branch created, doc written, Railway custom domains NOT YET added (waiting on `railway login` token refresh).
