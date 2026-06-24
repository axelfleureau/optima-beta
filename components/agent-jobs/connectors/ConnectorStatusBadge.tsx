"use client"

/**
 * ConnectorStatusBadge — pill colorata per stato operational del connector.
 *
 * Estratto da agent-jobs-client.tsx (2026-06-24) per ridurre il mega-componente
 * da 7503 righe e per allineare i colori a una sola fonte di verità.
 */

import { cn } from "@/lib/utils"

export type ConnectorOperationalState =
  | "ready_to_connect"
  | "awaiting_credentials"
  | "awaiting_user_action"
  | "awaiting_health_check"
  | "connected"
  | "external"
  | "blocked"
  | "needs_review"
  | "needs_runtime"

export const CONNECTOR_OPERATIONAL_TONE: Record<ConnectorOperationalState, string> = {
  ready_to_connect: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  awaiting_credentials: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  awaiting_user_action: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  awaiting_health_check: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  connected: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  external: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  blocked: "border-red-300/30 bg-red-300/10 text-red-100",
  needs_review: "border-righello-pink/40 bg-righello-pink/10 text-pink-100",
  needs_runtime: "border-amber-300/25 bg-amber-300/10 text-amber-100",
}

export const CONNECTOR_OPERATIONAL_LABEL: Record<ConnectorOperationalState, string> = {
  ready_to_connect: "Da collegare",
  awaiting_credentials: "Mancano credenziali",
  awaiting_user_action: "In attesa utente",
  awaiting_health_check: "Verifica pendente",
  connected: "Operativo",
  external: "OAuth esterno",
  blocked: "Bloccato",
  needs_review: "Da rivedere",
  needs_runtime: "Runtime richiesto",
}

interface Props {
  state: ConnectorOperationalState
  className?: string
}

export function ConnectorStatusBadge({ state, className }: Props) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-xs font-black",
        CONNECTOR_OPERATIONAL_TONE[state] ?? CONNECTOR_OPERATIONAL_TONE.ready_to_connect,
        className,
      )}
    >
      {CONNECTOR_OPERATIONAL_LABEL[state] ?? state}
    </span>
  )
}
