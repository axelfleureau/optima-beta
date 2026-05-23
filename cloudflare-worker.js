import handler from "./.open-next/worker.js"

async function runMilestoneCron(env, ctx) {
  if (!env.CRON_SECRET) {
    console.error("CRON_SECRET is not configured")
    return
  }

  const origin =
    env.NEXT_PUBLIC_SITE_URL ||
    env.NEXT_PUBLIC_APP_URL ||
    "https://optima-beta.workers.dev"
  const url = new URL("/api/cron/check-milestones", origin)

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
    console.error(`Milestone cron failed: ${response.status} ${body}`)
  }
}

export default {
  fetch: handler.fetch,

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(runMilestoneCron(env, ctx))
  },
}
