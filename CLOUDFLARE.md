# Cloudflare setup

This project is configured for Cloudflare Workers with the OpenNext adapter.

## Local commands

```bash
npm run dev
npm run cf:build
npm run cf:preview
npm run cf:deploy:staging
npm run cf:deploy:production
npm run cf:deploy
```

`cf:preview` runs the built app in the Workers runtime. `cf:deploy:staging` deploys the `staging` Wrangler environment. `cf:deploy:production` deploys the `production` Wrangler environment.

Current staging URL:

```text
https://optima-beta-staging.axel-15d.workers.dev
```

Production is configured for:

```text
https://appbeta.wearerighello.com
```

The `wearerighello.com` DNS zone must be active in the same Cloudflare account before Wrangler can attach the Worker custom domain. If the domain is still hosted elsewhere, add the zone to Cloudflare, update the registrar nameservers to the Cloudflare nameservers shown in the dashboard, and remove the existing `appbeta` record that points to Vercel. After that, `npm run cf:deploy:production` can provision the custom domain route.

Clerk production uses custom auth subdomains. Add these DNS-only records in the `wearerighello.com` zone before considering production login ready:

```text
clerk.appbeta             CNAME  frontend-api.clerk.services
accounts.appbeta          CNAME  accounts.clerk.services
clkmail.appbeta           CNAME  mail.kpyb0k2why3k.clerk.services
clk._domainkey.appbeta    CNAME  dkim1.kpyb0k2why3k.clerk.services
clk2._domainkey.appbeta   CNAME  dkim2.kpyb0k2why3k.clerk.services
```

Verify production readiness with:

```bash
npm run check:production
```

The readiness check is stricter than a simple uptime probe. `/api/health` returns `ok=true` when the core app is alive, and also exposes `readiness.agenticReady` for the agentic operating layer: D1 schema, R2 task media binding, runner API key, runner claim guard and MCP metadata. A production release that claims Optima is operating agentically should pass both.

## Runtime secrets

Do not commit secret values. Set them in Cloudflare with Wrangler:

```bash
npx wrangler secret put SESSION_SECRET --env staging
npx wrangler secret put FIREBASE_CLIENT_EMAIL --env staging
npx wrangler secret put FIREBASE_PRIVATE_KEY --env staging
npx wrangler secret put STRIPE_SECRET_KEY --env staging
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
npx wrangler secret put CRON_SECRET --env staging
npx wrangler secret put CLERK_SECRET_KEY --env staging
```

Repeat without `--env staging`, or with `--env production`, when production is ready.

The codebase also reads these optional secrets/variables depending on enabled features:

```text
OPENAI_API_KEY
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_PASS
SMTP_FROM
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
ENABLE_WELCOME_EMAILS
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
NEXT_PUBLIC_STRIPE_PRICE_90
NEXT_PUBLIC_STRIPE_PRICE_180
NEXT_PUBLIC_STRIPE_PRICE_360
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
```

`NEXT_PUBLIC_*` values are public client-side configuration. They must be available during the Next build as well as at runtime, so set them in the Cloudflare build environment or export them before local deploys.

## Cron

The previous Vercel cron at `/api/cron/check-milestones` is wired to a Cloudflare scheduled handler in `cloudflare-worker.js`. The schedule is `0 9 * * *` UTC in `wrangler.jsonc`.

## D1

The `DB` binding points to Cloudflare D1:

- staging: `optima-beta-staging-db`
- production: `optima-beta-production-db`

Schema migrations live in `migrations/`. Apply them with:

```bash
npx wrangler d1 migrations apply DB --env staging --remote
npx wrangler d1 migrations apply optima-beta-production-db --remote
```

The first schema creates the operational core for organizations, members, clients, projects, tasks, time entries, work status snapshots, AI usage, chat sessions/messages, and audit logs.

## Notes

Cloudflare Workers run in `workerd`, not a full Node.js server. This setup enables `nodejs_compat` and replaces Firebase Admin SDK usage with a lightweight REST adapter in `lib/firebase-admin.ts` to stay within Workers Free script-size limits. Clerk is currently integrated as the primary app session provider, while legacy Firebase data access remains in parts of the app until each module is migrated to D1. Server libraries such as `nodemailer`, PDF tooling, and remaining Firebase client-side data hooks still need runtime verification before production traffic.
