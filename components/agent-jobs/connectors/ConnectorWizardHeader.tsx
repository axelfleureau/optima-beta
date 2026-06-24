"use client"

/**
 * ConnectorWizardHeader — header riusabile per il dialog del connector.
 *
 * Mostra: badge auth method, badge stato operational, badge health,
 *         badge setup kind, scopo, e l'hint di setup.
 *
 * Estratto da agent-jobs-client.tsx (2026-06-24).
 */

import { ConnectorStatusBadge, type ConnectorOperationalState } from "./ConnectorStatusBadge"
import { cn } from "@/lib/utils"

interface Props {
  authLabel: string
  operationalState: ConnectorOperationalState
  healthLabel?: string | null
  healthOk?: boolean
  setupLabel: string
  setupTone: string
  setupKindLabel: string
  setupKindTone: string
  purpose: string
  setupHint: string
}

export function ConnectorWizardHeader({
  authLabel,
  operationalState,
  healthLabel,
  healthOk,
  setupLabel,
  setupTone,
  setupKindLabel,
  setupKindTone,
  purpose,
  setupHint,
}: Props) {
  return (
    <section className="rounded-lg border border-cyan-300/15 bg-cyan-300/[0.05] p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-xs font-black text-cyan-50">
          {authLabel}
        </span>
        <ConnectorStatusBadge state={operationalState} />
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-bold",
            healthOk
              ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
              : "border-amber-300/20 bg-amber-300/10 text-amber-100",
          )}
        >
          {healthLabel ?? "Verifica non eseguita"}
        </span>
        <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", setupTone)}>
          Setup: {setupLabel}
        </span>
        <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", setupKindTone)}>
          {setupKindLabel}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-200">{purpose}</p>
      <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/[0.08] p-3 text-sm leading-6 text-amber-50">
        {setupHint}
      </p>
    </section>
  )
}
