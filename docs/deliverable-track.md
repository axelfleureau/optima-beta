# Optima deliverable track

This is the minimum bar for a version that can be shared as a real internal product, not just a staging prototype.

## Release gates

- Production domain serves Cloudflare/OpenNext, not Vercel or another stale origin.
- `/api/health` returns `200` with production app env, live Clerk mode, configured site URL, and working D1 binding.
- `/api/health` exposes `readiness.agenticReady=true` before Optima is described as an agentic operating system in production.
- `npm run check:production` passes before announcing a production deploy.
- Public auth uses live Clerk keys and the Clerk custom DNS records resolve.
- Mobile pages allow reliable vertical scroll without body lock conflicts.
- Workspace tasks support create, update, drag/drop, assignments, attachments, and task detail review.
- Team, clients, dashboard, rapportini, preventivi, AI assistant, and management pages return usable data or clear empty states.

## Current critical path

1. Complete Clerk DNS for `appbeta.wearerighello.com`.
2. Deploy the health endpoint and production readiness check.
3. Re-run production readiness and fix any failed runtime checks.
4. Stabilize authenticated mobile shell: dashboard, workspace, team, rapportini, preventivi.
5. Validate the operational data model: client -> project -> task -> assignment -> time entry -> report.
6. Convert AI assistant from chat-only into an operations copilot with persistent history and clear integration boundaries.

## Production-ready maxiplan

The full gate plan lives in `docs/production-ready-maxiplan.md`. This file tracks the minimum deliverable surface; the maxiplan tracks the broader path to a real internal operating system with agentic runner, MCP/OAuth, Graphify-style memory, VPS observability and mobile production UX.

## Product baseline

Optima should first feel excellent for Righello's internal operating loop:

- See what work exists.
- See who owns it.
- See what is late, blocked, or overloaded.
- Create and update tasks quickly.
- Attach media and proof to work.
- Track time and daily reports.
- Use AI to accelerate planning, copy, estimates, and visual assets.

Everything else should serve that loop.
