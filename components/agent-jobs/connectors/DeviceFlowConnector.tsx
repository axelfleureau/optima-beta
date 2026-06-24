"use client"

/**
 * DeviceFlowConnector — wizard OAuth Device Flow (RFC 8628), wrangler-style.
 *
 * Flusso:
 *   1. Click "Connetti"
 *   2. POST /api/mcp/connect/[connectorId] → provider restituisce user_code + verification_url
 *   3. UI mostra prompt "Vai su X e inserisci ABCD-1234"
 *   4. UI fa polling su /api/mcp/oauth/device-poll/[connectorId] finché connected=true
 *   5. UI chiude il wizard con toast "Operativo"
 *
 * Sostituisce il vecchio path "Apri OAuth provider" che richiedeva setup manuale
 * di OAuth App per ogni provider.
 */

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Loader2, Network, ExternalLink, Copy } from "lucide-react"
import { toast } from "sonner"

interface DeviceFlowStart {
  flow: "device_flow"
  connector: string
  userCode: string
  verificationUrl: string
  interval: number
  expiresIn: number
  pollPath: string
  note: string
}

interface DeviceFlowPending {
  connected: false
  status: "authorization_pending" | "slow_down"
  nextPollMs: number
  verificationUrl?: string
  userCode?: string
}

interface DeviceFlowConnected {
  connected: true
  connector: string
  scope: string
  tokenType: string
  expiresIn: number | null
  secretRef: string
}

type DeviceFlowResponse = DeviceFlowStart | DeviceFlowPending | DeviceFlowConnected

interface Props {
  connectorId: string
  connectorLabel: string
  primaryActionAvailable: boolean
  primaryActionLabel?: string | null
  primaryActionExplanation?: string | null
  oauthAction: string | null
  setOauthAction: (value: string | null) => void
  onConnected?: () => void
}

export function DeviceFlowConnector({
  connectorId,
  connectorLabel,
  primaryActionAvailable,
  primaryActionLabel,
  primaryActionExplanation,
  oauthAction,
  setOauthAction,
  onConnected,
}: Props) {
  const [start, setStart] = useState<DeviceFlowStart | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopPolling = useRef(false)

  const actionKey = `connector-oauth:${connectorId}`
  const isLoading = oauthAction === actionKey

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current)
    }
  }, [])

  async function handleConnect() {
    setError(null)
    setStart(null)
    setConnected(false)
    stopPolling.current = false
    setOauthAction(actionKey)
    try {
      const response = await fetch(`/api/mcp/connect/${encodeURIComponent(connectorId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = (await response.json().catch(() => ({}))) as Partial<DeviceFlowStart> & {
        error?: string
        missingEnv?: string[]
      }
      if (!response.ok) {
        const missing = Array.isArray(data?.missingEnv) && data.missingEnv.length
          ? ` Mancano: ${data.missingEnv.join(", ")}.`
          : ""
        throw new Error(`${data?.error ?? "Device flow non avviato."}${missing}`)
      }
      if (data?.flow !== "device_flow" || !data.userCode) {
        throw new Error("Risposta device flow inattesa.")
      }
      setStart(data as DeviceFlowStart)
      toast.success("Device flow pronto", {
        description: `Apri ${data.verificationUrl} e inserisci ${data.userCode}.`,
      })
      schedulePoll(data.interval ?? 5)
    } catch (err: any) {
      const msg = err?.message ?? "Errore device flow."
      setError(msg)
      toast.error("Device flow non avviato", { description: msg })
    } finally {
      setOauthAction(null)
    }
  }

  function schedulePoll(intervalSeconds: number) {
    if (pollTimer.current) clearTimeout(pollTimer.current)
    pollTimer.current = setTimeout(poll, intervalSeconds * 1000)
  }

  async function poll() {
    if (stopPolling.current) return
    try {
      const response = await fetch(start?.pollPath ?? `/api/mcp/oauth/device-poll/${encodeURIComponent(connectorId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = (await response.json().catch(() => ({}))) as DeviceFlowResponse & {
        error?: string
      }
      if (!response.ok && response.status !== 400) {
        // Errori terminali
        setError(data?.error ?? "Polling device flow non riuscito.")
        stopPolling.current = true
        return
      }
      if ("connected" in data && data.connected) {
        setConnected(true)
        stopPolling.current = true
        toast.success(`${connectorLabel} operativo`, {
          description: "Token salvato nel runtime autorizzato. Nessun secret in D1.",
        })
        onConnected?.()
        return
      }
      if ("status" in data && (data.status === "authorization_pending" || data.status === "slow_down")) {
        schedulePoll((data.nextPollMs ?? (start?.interval ?? 5) * 1000) / 1000)
        return
      }
      // Errore 400 con error_description tipo expired/access_denied
      if (response.status === 410 || response.status === 403) {
        setError(data?.error ?? "Device flow terminato senza successo.")
        stopPolling.current = true
        return
      }
    } catch (err: any) {
      setError(err?.message ?? "Polling fallito.")
      stopPolling.current = true
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Copiato negli appunti")
    } catch {
      toast.error("Copia non riuscita")
    }
  }

  if (connected) {
    return (
      <div className="rounded-lg border border-emerald-300/25 bg-emerald-300/[0.07] p-3 text-sm leading-6 text-emerald-50">
        <p className="font-black text-emerald-100">{connectorLabel} collegato.</p>
        <p className="mt-1 text-emerald-100/90">
          Il token è stato salvato nel runtime autorizzato. Torna al control room per vederlo nello stato operativo.
        </p>
      </div>
    )
  }

  if (start) {
    return (
      <div className="rounded-lg border border-cyan-300/25 bg-cyan-300/[0.06] p-4 text-sm leading-6 text-cyan-50">
        <p className="font-black text-cyan-100">1. Apri {start.verificationUrl}</p>
        <p className="mt-1 text-cyan-100/90">
          2. Inserisci questo user code:
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="rounded-md border border-cyan-300/20 bg-black/40 px-3 py-2 font-mono text-lg font-black tracking-widest text-cyan-100">
            {start.userCode}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copy(start.userCode)}
            className="border-cyan-300/30 text-cyan-100 hover:bg-cyan-300/10"
          >
            <Copy className="mr-1 h-3 w-3" /> Copia
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.open(start.verificationUrl, "_blank", "noopener")}
            className="border-cyan-300/30 text-cyan-100 hover:bg-cyan-300/10"
          >
            <ExternalLink className="mr-1 h-3 w-3" /> Apri
          </Button>
        </div>
        <p className="mt-3 text-cyan-100/90">
          Optima fa polling automatico ogni {start.interval}s. Non chiudere questa finestra.
        </p>
        {error ? (
          <p className="mt-2 text-red-200">Errore: {error}</p>
        ) : (
          <p className="mt-2 inline-flex items-center gap-2 text-cyan-100">
            <Loader2 className="h-3 w-3 animate-spin" /> In attesa del consenso...
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {primaryActionExplanation ? (
        <p className="text-sm leading-6 text-pink-50/90">{primaryActionExplanation}</p>
      ) : null}
      <Button
        type="button"
        onClick={handleConnect}
        disabled={isLoading || !primaryActionAvailable}
        className="min-h-11 rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400"
      >
        {isLoading ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="mr-1.5 h-4 w-4" />
        )}
        {primaryActionLabel ?? `Connetti ${connectorLabel}`}
      </Button>
      <p className="text-xs leading-5 text-slate-400">
        <Network className="mr-1 inline h-3 w-3" />
        Flusso OAuth Device Flow (RFC 8628): 1 click qui → apri {connectorLabel} → inserisci user_code → fatto.
        Stesso pattern di <code>npx wrangler login</code>.
      </p>
      {error ? <p className="text-xs leading-5 text-red-200">{error}</p> : null}
    </div>
  )
}
