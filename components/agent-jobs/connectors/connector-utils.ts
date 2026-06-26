// components/agent-jobs/connectors/connector-utils.ts
//
// Costanti e helper puri per i connector MCP. Estratti da agent-jobs-client.tsx
// (2026-06-25) per ridurre il mega-componente e dare una sola sorgente di verità
// per label, tone e priorità dei connector.
//
// Nessuna dipendenza da React, server-only o runtime env: solo funzioni pure.

export const PRIORITY_CONNECTOR_IDS = [
  "codex",
  "github",
  "notion",
  "browser",
  "cloudflare",
  "sendgrid",
  "telegram",
  "cloudinary",
  "hostinger",
] as const

export type PriorityConnectorId = (typeof PRIORITY_CONNECTOR_IDS)[number]

/** Stato di installazione del connector. Restituisce una stringa italiana per UI. */
export function installLabel(state: string): string {
  switch (state) {
    case "not_installed":
      return "Da collegare"
    case "guide_required":
      return "Setup da fare"
    case "configured":
      return "Policy salvata"
    case "healthy":
      return "Env rilevata"
    case "blocked":
      return "Bloccato"
    default:
      return state
  }
}

/** Tailwind classes per il badge install state. */
export function installTone(state: string): string {
  switch (state) {
    case "not_installed":
      return "border-white/10 bg-white/5 text-slate-400"
    case "guide_required":
      return "border-amber-300/25 bg-amber-300/10 text-amber-100"
    case "configured":
      return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
    case "healthy":
      return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
    case "blocked":
      return "border-red-300/25 bg-red-300/10 text-red-100"
    default:
      return "border-white/10 bg-white/5 text-slate-400"
  }
}

/** Tailwind classes per il badge stato operativo del connector. */
export function connectorOperationalTone(state: string): string {
  switch (state) {
    case "connected":
      return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
    case "ready_to_connect":
      return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
    case "needs_runtime":
      return "border-amber-300/25 bg-amber-300/10 text-amber-100"
    case "needs_review":
      return "border-purple-300/25 bg-purple-300/10 text-purple-100"
    case "blocked":
      return "border-red-300/25 bg-red-300/10 text-red-100"
    default:
      return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
  }
}

/** Tailwind classes per lo stato del runtime (Codex/OpenAI/Gemini etc.). */
export function runtimeStatusTone(state: string): string {
  switch (state) {
    case "ready":
      return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
    case "needs_secret":
    case "needs_endpoint":
      return "border-amber-300/25 bg-amber-300/10 text-amber-100"
    case "reference_only":
      return "border-white/10 bg-white/5 text-slate-400"
    default:
      return "border-white/10 bg-white/5 text-slate-400"
  }
}

/** Label italiana per il metodo di autenticazione del connector. */
export function connectorAuthLabel(method: string | undefined): string {
  switch (method) {
    case "oauth_pkce":
      return "OAuth / PKCE"
    case "external_oauth":
      return "OAuth esterno"
    case "device_flow":
      return "Device Flow (1-click)"
    case "browser_session_oauth":
      return "Browser MCP"
    case "github_app":
      return "GitHub App / policy"
    case "api_key_secret":
      return "API key"
    case "service_account":
      return "Service account"
    case "runner_env":
      return "Runtime / CLI"
    case "local_install":
      return "Runtime locale"
    default:
      return method ?? "?"
  }
}

/** Setup kind → label italiano. */
export function connectorSetupKindLabel(kind: string): string {
  switch (kind) {
    case "oauth":
      return "OAuth"
    case "browser":
      return "Browser MCP"
    case "github_owner":
      return "GitHub"
    case "runtime":
      return "Runtime"
    case "service_account":
      return "Service account"
    case "secret_ref":
      return "Secret ref"
    default:
      return kind
  }
}

/** Setup kind → tailwind classes. */
export function connectorSetupKindTone(kind: string): string {
  switch (kind) {
    case "oauth":
      return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
    case "browser":
      return "border-purple-300/25 bg-purple-300/10 text-purple-100"
    case "github_owner":
      return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
    case "runtime":
      return "border-amber-300/25 bg-amber-300/10 text-amber-100"
    case "service_account":
      return "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
    case "secret_ref":
      return "border-white/10 bg-white/5 text-slate-400"
    default:
      return "border-white/10 bg-white/5 text-slate-400"
  }
}

/** Determina se il connector supporta un flusso OAuth standard (PKCE o external). */
export function isStandardOAuthConnector(method: string | undefined): boolean {
  return method === "oauth_pkce" || method === "external_oauth"
}

/** Determina se il connector supporta OAuth Device Flow (1-click, wrangler-style). */
export function isDeviceFlowConnector(method: string | undefined): boolean {
  return method === "device_flow"
}

/** Ordina i connector per priorità operativa, mantenendo quelli non prioritari in coda. */
export function sortConnectorsByPriority<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ai = PRIORITY_CONNECTOR_IDS.indexOf(a.id as PriorityConnectorId)
    const bi = PRIORITY_CONNECTOR_IDS.indexOf(b.id as PriorityConnectorId)
    if (ai === -1 && bi === -1) return 0
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}