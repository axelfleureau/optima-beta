import { resolve4, resolveCname } from "node:dns/promises"

const baseUrl = (process.env.OPTIMA_PRODUCTION_URL || "https://appbeta.wearerighello.com").replace(/\/$/, "")

const checks = []

function record(name, ok, detail = "") {
  checks.push({ name, ok, detail })
  const marker = ok ? "ok" : "fail"
  console.log(`${marker} ${name}${detail ? ` - ${detail}` : ""}`)
}

async function fetchText(path, redirect = "manual") {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect,
    headers: {
      "User-Agent": "optima-readiness-check/1.0",
    },
  })
  return {
    response,
    text: await response.text(),
  }
}

async function dnsExists(hostname) {
  try {
    const cname = await resolveCname(hostname)
    return { ok: cname.length > 0, detail: cname.join(", ") }
  } catch {
    try {
      const addresses = await resolve4(hostname)
      return { ok: addresses.length > 0, detail: addresses.join(", ") }
    } catch {
      return { ok: false, detail: "missing DNS record" }
    }
  }
}

async function main() {
  console.log(`Checking Optima production readiness: ${baseUrl}`)

  const login = await fetchText("/login")
  const server = login.response.headers.get("server") || ""
  const openNext = login.response.headers.get("x-opennext") || ""
  record("login responds", login.response.status === 200, `status ${login.response.status}`)
  record("served by Cloudflare", server.toLowerCase().includes("cloudflare"), `server=${server || "unknown"}`)
  record("served by OpenNext", openNext === "1", `x-opennext=${openNext || "missing"}`)
  record("uses Clerk live key", login.text.includes("pk_live_"), "pk_live present in HTML")
  record("does not expose Clerk test key", !login.text.includes("pk_test_"), "pk_test absent")
  record("uses Clerk proxy", login.text.includes(`${baseUrl}/__clerk`) || login.text.includes("/__clerk"), "__clerk proxy present in HTML")
  record("does not call Clerk custom subdomain directly", !login.text.includes("clerk.appbeta.wearerighello.com"), "custom FAPI host absent in HTML")

  const clerkScript = await fetchText("/__clerk/npm/@clerk/clerk-js@5/dist/clerk.browser.js", "follow")
  record(
    "Clerk proxy serves browser script",
    clerkScript.response.status === 200 && clerkScript.text.includes("Clerk"),
    `status ${clerkScript.response.status}`,
  )

  const buildId = await fetchText("/BUILD_ID")
  record("BUILD_ID available", buildId.response.status === 200 && buildId.text.trim().length > 0, buildId.text.trim())

  const health = await fetchText("/api/health")
  let healthJson = null
  try {
    healthJson = JSON.parse(health.text)
  } catch {
    // Ignore, recorded below.
  }
  record("health endpoint ready", health.response.status === 200 && healthJson?.ok === true, healthJson ? JSON.stringify(healthJson.checks) : `status ${health.response.status}`)
  record(
    "agentic readiness ready",
    healthJson?.readiness?.agenticReady === true,
    healthJson?.readiness ? JSON.stringify(healthJson.readiness) : "missing readiness block",
  )
  record(
    "agent runner claim enabled",
    healthJson?.checks?.agentRunnerClaimEnabled === true,
    `status=${healthJson?.checks?.agentRunnerStatus ?? "unknown"}`,
  )
  record(
    "agent runner API key configured",
    healthJson?.checks?.agentRunnerApiKeyConfigured === true,
    healthJson?.checks?.agentRunnerApiKeyConfigured ? "configured" : "missing",
  )
  record(
    "agentic D1 schema complete",
    healthJson?.checks?.requiredTables?.ok === true,
    healthJson?.checks?.requiredTables
      ? `${healthJson.checks.requiredTables.present}/${healthJson.checks.requiredTables.expected} tables`
      : "missing table status",
  )
  record(
    "task media R2 binding configured",
    healthJson?.checks?.taskMediaBucketConfigured === true,
    healthJson?.checks?.taskMediaBucketConfigured ? "TASK_MEDIA available" : "TASK_MEDIA missing",
  )
  record(
    "MCP authorization configured",
    healthJson?.checks?.mcpAuthorizationConfigured === true,
    healthJson?.checks?.mcpAuthorizationConfigured
      ? `mode=${healthJson?.checks?.mcpAuthorizationMode ?? "unknown"}`
      : "set OPTIMA_MCP_SERVICE_TOKEN or OAuth/JWT MCP env",
  )

  const protectedResource = await fetchText("/.well-known/oauth-protected-resource")
  record(
    "MCP protected resource metadata",
    protectedResource.response.status === 200 && protectedResource.text.includes("mcp"),
    `status ${protectedResource.response.status}`,
  )

  const authServer = await fetchText("/.well-known/oauth-authorization-server")
  record(
    "MCP authorization metadata",
    authServer.response.status === 200 && authServer.text.includes("token_endpoint"),
    `status ${authServer.response.status}`,
  )

  for (const hostname of ["clerk.appbeta.wearerighello.com", "accounts.appbeta.wearerighello.com"]) {
    const result = await dnsExists(hostname)
    record(`${hostname} DNS`, result.ok, result.detail)
  }

  const failed = checks.filter((check) => !check.ok)
  if (failed.length > 0) {
    console.error(`Production readiness failed: ${failed.length} check(s) failing.`)
    process.exit(1)
  }

  console.log("Production readiness passed.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
