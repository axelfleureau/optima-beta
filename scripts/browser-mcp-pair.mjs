#!/usr/bin/env node

const required = {
  BROWSER_MCP_SESSION: process.env.BROWSER_MCP_SESSION,
  BROWSER_MCP_PAIRING_CODE: process.env.BROWSER_MCP_PAIRING_CODE,
  BROWSER_MCP_TARGET: process.env.BROWSER_MCP_TARGET,
  BROWSER_MCP_CALLBACK_URL: process.env.BROWSER_MCP_CALLBACK_URL,
}

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key)

if (missing.length) {
  console.error(`Missing required Browser MCP pairing env: ${missing.join(", ")}`)
  process.exit(1)
}

const gateway = (process.env.BROWSER_MCP_GATEWAY_URL || process.env.BROWSER_MCP_ENDPOINT || "").replace(/\/$/, "")

if (!gateway) {
  console.error("Missing BROWSER_MCP_GATEWAY_URL or BROWSER_MCP_ENDPOINT.")
  console.error("Configure the Browser MCP gateway on the Optima runner/VPS before pairing.")
  process.exit(1)
}

const pairUrl = new URL(`${gateway}/pair`)
pairUrl.searchParams.set("session", required.BROWSER_MCP_SESSION)
pairUrl.searchParams.set("code", required.BROWSER_MCP_PAIRING_CODE)
pairUrl.searchParams.set("target", required.BROWSER_MCP_TARGET)
pairUrl.searchParams.set("callback", required.BROWSER_MCP_CALLBACK_URL)

console.log("Browser MCP pairing URL:")
console.log(pairUrl.toString())
console.log("")
console.log("Open this URL from the authorized device or expose it through the runner control plane.")
console.log("The login must happen in the isolated Browser MCP profile, then Optima must run the connector health-check.")
