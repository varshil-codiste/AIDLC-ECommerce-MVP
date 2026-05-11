# v1 Deployment — Netlify (web) + Render (api + Postgres + Redis)

This guide walks through deploying the v1 demo to:

- **Netlify** — Next.js web app (`web/`)
- **Render** — NestJS API, managed PostgreSQL with pgvector, managed Key-Value (Redis-compatible)

Total time: **~45 minutes** if accounts are ready.

---

## Prerequisites

1. **GitHub access** to `varshil-codiste/AIDLC-ECommerce-MVP` from both Netlify and Render
2. **Anthropic API key** with credit (current key in `.env` may be from a low-balance workspace — verify before deploying)
3. **JWT key pair** (RS256) — generated locally, base64-encoded, pasted into Render

---

## Step 1 — Generate JWT keys (local, 2 min)

```bash
openssl genrsa -out /tmp/jwt-private.pem 2048
openssl rsa -in /tmp/jwt-private.pem -pubout -out /tmp/jwt-public.pem

# These two values get pasted into Render in Step 3
echo "JWT_PRIVATE_KEY_B64:"
base64 -w0 /tmp/jwt-private.pem; echo
echo "JWT_PUBLIC_KEY_B64:"
base64 -w0 /tmp/jwt-public.pem; echo
```

Keep this terminal open — you'll paste both values into Render.

---

## Step 2 — Deploy the API + DB + Redis on Render (15 min)

1. Sign in to **https://dashboard.render.com** (use Codiste email).
2. Click **New +** → **Blueprint**.
3. **Connect** your GitHub account to Render if not already connected.
4. Select repository **`varshil-codiste/AIDLC-ECommerce-MVP`**.
5. Branch: **`deploy/v1-netlify-render`** (or `main` once merged).
6. Render reads `render.yaml` and shows the resources it will create:
   - `ecommmer-postgres` (Postgres 16, free plan — 30 days then $7/mo)
   - `ecommmer-redis` (Key Value, free plan — 25 MB)
   - `ecommmer-api` (Docker web service, free plan)
7. Click **Apply**. Render starts provisioning the DB and Redis.
8. The first API build will **fail** because secrets are not set yet. That's expected.

### 2a. Set the API service env vars

Open the **`ecommmer-api`** service in Render → **Environment** tab → **Add Environment Variable** for each:

| Key                       | Value                                                                 |
| ------------------------- | --------------------------------------------------------------------- |
| `JWT_PRIVATE_KEY_B64`     | (paste from Step 1)                                                   |
| `JWT_PUBLIC_KEY_B64`      | (paste from Step 1)                                                   |
| `LLM_API_KEY`             | your Anthropic API key (starts with `sk-ant-...`)                     |
| `LLM_PROVIDER_API_KEY`    | same Anthropic API key (different parts of the codebase read each)    |
| `WEB_ORIGIN`              | leave as `https://localhost:3000` for now — update in Step 5          |

Click **Save Changes**. Render triggers a fresh deploy. Wait ~3–5 min.

When it goes green:

- Note the API URL on the service page (e.g. `https://ecommmer-api-xxxx.onrender.com`).
- Open `https://<api-url>/api/v1/health` in a browser — should return `{"status":"ok"}`.

### 2b. Seed the database (one-time, from your local machine)

The production Docker image is stripped of `ts-node`, so the seed runs from your
laptop pointing at Render's **External Database URL**.

1. In Render → **`ecommmer-postgres`** → **Connect** dropdown → copy **External Database URL**
   (it includes `?sslmode=require` — keep that).
2. From the repo root locally:

```bash
cd api
DATABASE_URL="<paste External Database URL here>" pnpm prisma db seed
```

This creates the demo `shopper@demo.com` / `merchant@demo.com` accounts and the
product catalog. Should finish in ~30s.

> **Note:** Render's free-tier web services spin down after 15 min of inactivity. The first request after idle takes ~30s to wake. Fine for a demo, not for production traffic.

---

## Step 3 — Deploy the web app on Netlify (10 min)

1. Sign in to **https://app.netlify.com** with the Codiste email.
2. **Add new site** → **Import an existing project** → **GitHub**.
3. Authorize Netlify to access `varshil-codiste/AIDLC-ECommerce-MVP`.
4. Select the repo. Branch: **`deploy/v1-netlify-render`** (or `main`).
5. Netlify auto-detects `netlify.toml` — the build settings should pre-fill:
   - Base directory: `.`
   - Build command: `corepack enable && pnpm install ...`
   - Publish directory: `web/.next`
6. **Before clicking Deploy**, expand **Add environment variables** and add:

| Key                   | Value                                              |
| --------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | the Render API URL from Step 2a (e.g. `https://ecommmer-api-xxxx.onrender.com`) |

7. Click **Deploy site**.
8. Wait ~3–5 min for the build. When green, Netlify shows your URL (e.g. `https://random-name.netlify.app`).
9. (Optional) Rename in **Site settings → Change site name** → `codiste-commerce`.

---

## Step 4 — Wire the API back to Netlify's origin (3 min)

The API's CORS only allows the origin in `WEB_ORIGIN`. Update it:

1. In Render → **`ecommmer-api`** → **Environment** → edit `WEB_ORIGIN`.
2. Set to your Netlify URL — e.g. `https://codiste-commerce.netlify.app` (no trailing slash).
3. **Save Changes** → Render redeploys automatically.

---

## Step 5 — Smoke test (2 min)

1. Open the Netlify URL in a clean browser window.
2. Log in with `shopper@demo.com` / `Shopper123!`.
3. Try: *"show me phones"* → should return a product carousel.
4. Try: *"add iPhone 15 Pro to my cart"* → cart widget.
5. Try: *"checkout"* → order confirmation.

If any step fails, the most common causes are:

| Symptom                                            | Where to look                                                |
| -------------------------------------------------- | ------------------------------------------------------------ |
| Login spinner forever / "Network error"            | `NEXT_PUBLIC_API_URL` wrong, or `WEB_ORIGIN` mismatch        |
| `CORS preflight failed` in browser console         | `WEB_ORIGIN` has trailing slash or wrong protocol            |
| `LLM_API_KEY missing` in Render logs               | env var typo, or only one of the two LLM_* keys set          |
| `relation does not exist` errors                   | seed not run — go to Step 2b                                 |
| Chat returns "Routing failed"                      | Anthropic credit exhausted — check console.anthropic.com     |
| 502 on first request after idle                    | Free-tier cold start — wait 30s and retry                    |

---

## Step 6 — Demo handoff

Share with the CTO / client:

- **URL:** the Netlify site (`https://codiste-commerce.netlify.app`)
- **Demo accounts:**
  - Shopper: `shopper@demo.com` / `Shopper123!`
  - Merchant: `merchant@demo.com` / `Merchant123!`
- **Prompts to try:** see README "Demo prompts" section

---

## Costs (free-tier limits)

| Service           | Free tier              | After                |
| ----------------- | ---------------------- | -------------------- |
| Render Postgres   | 30 days, 256 MB        | $7/mo (256 MB plan)  |
| Render Key Value  | 25 MB, forever         | $10/mo for more      |
| Render Web (API)  | 750 hrs/mo, sleeps     | $7/mo for always-on  |
| Netlify           | 100 GB bandwidth/mo    | Pro plan from $19    |

Total for one-shot client demo: **$0**. Always-on production: ~$24/mo.

---

## Rolling back

If a deploy breaks, in Render's **`ecommmer-api`** service → **Events** tab → click any prior deploy → **Rollback to this deploy**.

For the web: Netlify auto-keeps every deploy. **Deploys** tab → click a prior deploy → **Publish deploy**.
