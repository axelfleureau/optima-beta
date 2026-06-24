/**
 * Connector secrets — single source of truth per Optima MCP.
 *
 * Convenzione: `secret_ref` è una stringa tipo `connectorId:scope` (es.
 *   `github:owner_token`, `sendgrid:api_key`, `notion:oauth_runtime_secret`).
 * I secret veri vivono SOLO nel runtime autorizzato (Cloudflare Secrets, env,
 * wrangler secret). Mai in D1. Mai in chiaro in log.
 *
 * Questo helper fornisce:
 *   - `resolveSecret(ref)` → valore runtime (env var o fallback)
 *   - `listRequiredEnv(connector)` → env attese per un connector
 *   - `checkConnectorReadiness(connector)` → enabled / partial / missing / external
 *
 * Sostituisce la logica sparpagliata che ogni API route aveva inline.
 */

import { getStrategicMcpConnectors, type StrategicMcpConnector } from "@/lib/mcp-connectors"

const SECRET_REF_SEPARATOR = ":"

export type SecretResolveMode = "env" | "missing" | "external"

export function parseSecretRef(ref: string): { connectorId: string; scope: string } | null {
  if (!ref || typeof ref !== "string") return null
  const idx = ref.indexOf(SECRET_REF_SEPARATOR)
  if (idx <= 0 || idx === ref.length - 1) return null
  return {
    connectorId: ref.slice(0, idx),
    scope: ref.slice(idx + 1),
  }
}

export function buildSecretRef(connectorId: string, scope: string): string {
  return `${connectorId}${SECRET_REF_SEPARATOR}${scope}`
}

/**
 * Risolve un secret_ref dal runtime autorizzato.
 * Per ora Optima usa solo env vars del Worker; in futuro si può estendere a
 * Cloudflare Secrets / Vault esterno senza cambiare le call site.
 */
export function resolveSecret(ref: string | null | undefined, fallbackEnvNames: string[] = []): string {
  if (!ref) return ""
  const parsed = parseSecretRef(ref)
  if (!parsed) return ""
  const scopeUpper = parsed.scope.replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase()
  const connectorUpper = parsed.connectorId.replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase()
  const candidates = [
    `${connectorUpper}_${scopeUpper}`,
    ref.replace(/[^a-zA-Z0-9_]/g, "_").toUpperCase(),
    ...fallbackEnvNames,
  ]
  for (const name of candidates) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ""
}

/**
 * Lista univoca di env richieste/opzionali per un connector dal catalogo.
 */
export function listRequiredEnv(connector: StrategicMcpConnector): {
  required: string[]
  optional: string[]
  resolved: { name: string; present: boolean; value: string }[]
} {
  const required = connector.requiredEnv ?? []
  const optional = connector.optionalEnv ?? []
  const all = [...required, ...optional]
  const resolved = all.map((name) => {
    const value = process.env[name]?.trim()
    return { name, present: Boolean(value), value: value ?? "" }
  })
  return { required, optional, resolved }
}

/**
 * Readiness di un connector: lo stato "enabled / partial / missing / external"
 * centralizzato, condiviso tra UI, API e CLI.
 */
export function checkConnectorReadiness(
  connector: StrategicMcpConnector,
): {
  state: "enabled" | "partial" | "missing" | "external"
  missingRequired: string[]
  presentRequired: string[]
  optionalPresent: string[]
  optionalMissing: string[]
} {
  // Connector OAuth/Device Flow: dipende dalla installazione D1, non dalle env.
  if (
    connector.authMethod === "oauth_pkce" ||
    connector.authMethod === "external_oauth" ||
    connector.authMethod === "browser_session_oauth" ||
    connector.authMethod === "github_app"
  ) {
    return {
      state: "external",
      missingRequired: [],
      presentRequired: connector.requiredEnv,
      optionalPresent: [],
      optionalMissing: connector.optionalEnv ?? [],
    }
  }

  const presentRequired: string[] = []
  const missingRequired: string[] = []
  const optionalPresent: string[] = []
  const optionalMissing: string[] = []

  for (const name of connector.requiredEnv ?? []) {
    if (process.env[name]?.trim()) presentRequired.push(name)
    else missingRequired.push(name)
  }
  for (const name of connector.optionalEnv ?? []) {
    if (process.env[name]?.trim()) optionalPresent.push(name)
    else optionalMissing.push(name)
  }

  let state: "enabled" | "partial" | "missing" = "missing"
  if (missingRequired.length === 0 && presentRequired.length > 0) state = "enabled"
  else if (presentRequired.length > 0) state = "partial"

  return {
    state,
    missingRequired,
    presentRequired,
    optionalPresent,
    optionalMissing,
  }
}

/**
 * Snapshot completo di tutti i connector: utile per CLI, health endpoint e UI.
 */
export function snapshotAllConnectors() {
  return getStrategicMcpConnectors().map((connector) => ({
    id: connector.id,
    label: connector.label,
    category: connector.category,
    authMethod: connector.authMethod,
    readiness: checkConnectorReadiness(connector),
  }))
}

/**
 * Format per stdout CLI / log: breve e leggibile.
 */
export function formatReadinessLine(connector: StrategicMcpConnector): string {
  const r = checkConnectorReadiness(connector)
  const tag = r.state.toUpperCase().padEnd(8, " ")
  const missing =
    r.missingRequired.length > 0 ? `  missing: ${r.missingRequired.join(", ")}` : ""
  return `${tag}  ${connector.id.padEnd(28, " ")}  ${connector.label}${missing}`
}
