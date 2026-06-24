"use client"

/**
 * ConnectorStates — i tre stati canonici del flusso connector MCP:
 *   1. Collegamento   → l'utente deve fare qualcosa (login, secret, OAuth, device flow)
 *   2. Verifica       → Optima esegue health-check read-only
 *   3. Uso agentico   → solo a questo punto i subagenti possono usare il connector
 *
 * Estratto da agent-jobs-client.tsx (2026-06-24) per ridurre la complessità
 * del mega-componente e dare una rappresentazione coerente in tutto il
 * control room agentico.
 */

import { cn } from "@/lib/utils"

import type { ConnectorOperationalState } from "./ConnectorStatusBadge"

interface Props {
  realPrerequisiteMet: boolean
  primaryActionAvailable: boolean
  canCreateVerification: boolean
  operationalState: ConnectorOperationalState
  verificationBlockedLabel: string
  primaryActionLabel: string | null | undefined
}

export function ConnectorStates({
  realPrerequisiteMet,
  primaryActionAvailable,
  canCreateVerification,
  operationalState,
  verificationBlockedLabel,
  primaryActionLabel,
}: Props) {
  return (
    <div className="mt-3 grid gap-2 md:grid-cols-3">
      <div
        className={cn(
          "rounded-lg border p-3",
          realPrerequisiteMet
            ? "border-emerald-300/25 bg-emerald-300/[0.07]"
            : primaryActionAvailable
              ? "border-cyan-300/25 bg-cyan-300/[0.06]"
              : "border-amber-300/25 bg-amber-300/[0.07]",
        )}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
          1. Collegamento
        </p>
        <p className="mt-1 text-sm font-black text-white">
          {realPrerequisiteMet ? "Completato" : verificationBlockedLabel}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-300">
          {primaryActionLabel ?? "Azione richiesta"}
        </p>
      </div>

      <div
        className={cn(
          "rounded-lg border p-3",
          canCreateVerification
            ? "border-cyan-300/25 bg-cyan-300/[0.06]"
            : "border-white/10 bg-black/20",
        )}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
          2. Verifica
        </p>
        <p className="mt-1 text-sm font-black text-white">
          {canCreateVerification ? "Health-check disponibile" : "Bloccata"}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-300">
          Solo read-only: controlla sessione, scope, heartbeat o permessi.
        </p>
      </div>

      <div
        className={cn(
          "rounded-lg border p-3",
          operationalState === "connected"
            ? "border-emerald-300/25 bg-emerald-300/[0.07]"
            : "border-white/10 bg-black/20",
        )}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
          3. Uso agentico
        </p>
        <p className="mt-1 text-sm font-black text-white">
          {operationalState === "connected" ? "Abilitabile" : "Non ancora"}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-300">
          I subagenti possono usarlo solo con policy, audit e review coerenti.
        </p>
      </div>
    </div>
  )
}
