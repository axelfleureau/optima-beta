import {
  type AgenticModelLane,
  type AgenticRuntimeStatus,
  getAgenticModelHosts,
  getAgenticModelRuntimeSnapshot,
} from "@/lib/agentic-capabilities"
import { getRuntimeSecret } from "@/lib/ai/openai-runtime"
import type { WorkspacePrincipal } from "@/lib/workspace-db"

export interface ResolvedAgenticModelRuntime {
  lane: AgenticModelLane
  providerId: string
  model: string
  mode: string
  runtimeAdapter: string
  runtimeStatus: AgenticRuntimeStatus
  runtimeDetail: string
  apiKeyEnv: string | null
  baseUrlEnv: string | null
  endpointEnv: string | null
  hasApiKey: boolean
  baseUrl: string | null
  endpoint: string | null
  secretRef: string | null
  endpointRef: string | null
  dataPolicy: string
  installSteps: string[]
}

export async function resolveAgenticModelRuntime(
  db: any,
  principal: WorkspacePrincipal,
  lane: AgenticModelLane,
): Promise<ResolvedAgenticModelRuntime | null> {
  const snapshot = await getAgenticModelRuntimeSnapshot(db, principal)
  const route = snapshot.routes.find((item) => item.lane === lane && item.status !== "disabled")
  const plan = snapshot.lanePlan.find((item) => item.lane === lane)
  if (!route && !plan) return null

  const hosts = getAgenticModelHosts()
  const providerId = route?.providerId ?? plan!.providerId
  const mode = route?.mode ?? plan!.mode
  const host =
    hosts.find((item) => item.providerId === providerId && item.mode === mode) ??
    hosts.find((item) => item.providerId === providerId) ??
    hosts.find((item) => item.lane === lane)

  const apiKey = host?.apiKeyEnv ? (await getRuntimeSecret(host.apiKeyEnv)).trim() : ""
  const baseUrl = host?.baseUrlEnv ? (await getRuntimeSecret(host.baseUrlEnv)).trim() : ""
  const endpoint = host?.endpointEnv ? (await getRuntimeSecret(host.endpointEnv)).trim() : ""
  const runtimeStatus = plan?.runtimeStatus ?? "reference_only"

  return {
    lane,
    providerId,
    model: route?.model ?? plan!.model,
    mode,
    runtimeAdapter: host?.runtimeAdapter ?? "openai_compatible",
    runtimeStatus,
    runtimeDetail:
      snapshot.hosts.find((item) => item.id === host?.id)?.runtimeDetail ??
      "Runtime non configurato nel catalogo host.",
    apiKeyEnv: host?.apiKeyEnv ?? null,
    baseUrlEnv: host?.baseUrlEnv ?? null,
    endpointEnv: host?.endpointEnv ?? null,
    hasApiKey: Boolean(apiKey),
    baseUrl: baseUrl || null,
    endpoint: endpoint || null,
    secretRef: route?.secretRef ?? host?.secretRefHint?.replace("{organizationId}", principal.organizationId) ?? null,
    endpointRef: route?.endpointRef ?? host?.baseUrlEnv ?? host?.endpointEnv ?? null,
    dataPolicy: host?.dataPolicy ?? "Policy dati non definita.",
    installSteps: host?.installSteps ?? [],
  }
}

export function formatAgenticRuntimeForPrompt(runtime: ResolvedAgenticModelRuntime | null) {
  if (!runtime) return "Runtime modello non risolto per questa lane."

  return [
    `Lane: ${runtime.lane}`,
    `Provider: ${runtime.providerId}`,
    `Modello: ${runtime.model}`,
    `Modalita: ${runtime.mode}`,
    `Adapter: ${runtime.runtimeAdapter}`,
    `Stato: ${runtime.runtimeStatus} (${runtime.runtimeDetail})`,
    `Policy dati: ${runtime.dataPolicy}`,
    `Secret ref: ${runtime.secretRef || "non richiesto"}`,
    `Endpoint ref: ${runtime.endpointRef || "default provider"}`,
  ].join("\n")
}
