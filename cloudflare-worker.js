import handler from "./.open-next/worker.js"

async function runCronPath(env, ctx, path, label) {
  if (!env.CRON_SECRET) {
    console.error("CRON_SECRET is not configured")
    return
  }

  const origin =
    env.NEXT_PUBLIC_SITE_URL ||
    env.NEXT_PUBLIC_APP_URL ||
    "https://optima-beta.workers.dev"
  const url = new URL(path, origin)

  const response = await handler.fetch(
    new Request(url.toString(), {
      method: "GET",
      headers: {
        authorization: `Bearer ${env.CRON_SECRET}`,
        "user-agent": "cloudflare-cron",
      },
    }),
    env,
    ctx,
  )

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    console.error(`${label} cron failed: ${response.status} ${body}`)
  }
}

async function runMilestoneCron(env, ctx) {
  return runCronPath(env, ctx, "/api/cron/check-milestones", "Milestone")
}

async function runAgenticSelfImprovementCron(env, ctx) {
  return runCronPath(env, ctx, "/api/cron/agentic-self-improvement", "Agentic self-improvement")
}

async function runTeamInviteCron(env, ctx) {
  return runCronPath(env, ctx, "/api/cron/team-invites", "Team invites")
}

export default {
  fetch: handler.fetch,

  async scheduled(controller, env, ctx) {
    if (controller.cron === "0 9 * * *") {
      ctx.waitUntil(runMilestoneCron(env, ctx))
      return
    }

    if (controller.cron === "0 */6 * * *") {
      ctx.waitUntil(runAgenticSelfImprovementCron(env, ctx))
      return
    }

    if (controller.cron === "*/5 * * * *") {
      ctx.waitUntil(runTeamInviteCron(env, ctx))
      return
    }

    console.warn(`Unhandled cron trigger: ${controller.cron}`)
  },
}
