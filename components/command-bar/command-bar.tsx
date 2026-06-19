"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useCommandBarStore } from "@/lib/stores/command-bar-store"
import { useAuth } from "@/lib/auth-context"
import { useClients } from "@/hooks/use-clients"
import { useUsers } from "@/hooks/use-users"
import { CommandInput } from "./command-input"
import { CommandResults } from "./command-results"
import { ContextForm } from "./context-form"
import { OrchestrationFeedback } from "./orchestration-feedback"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { liquidExpand } from "@/lib/animations/liquid"

type CommandRuntimeReadiness = {
  deterministicReady: boolean
  commandBarReady: boolean
  chat?: {
    providerId: string
    model: string
    runtimeStatus: string
    runtimeDetail: string
  }
  research?: {
    providerId: string
    model: string
    runtimeStatus: string
    runtimeDetail: string
  }
  code?: {
    providerId: string
    model: string
    runtimeStatus: string
    runtimeDetail: string
  }
  graph?: {
    runtimeStatus: string
    runtimeDetail: string
    domains: number
  }
}

function statusTone(status?: string) {
  if (status === "ready" || status === "configured") return "text-emerald-300"
  if (status === "needs_secret" || status === "missing") return "text-amber-300"
  return "text-slate-400"
}

export function CommandBar() {
  const { isOpen, close, status, missingParams, setContext } = useCommandBarStore()
  const { userData } = useAuth()
  const { clients } = useClients()
  const { users } = useUsers()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [readiness, setReadiness] = useState<CommandRuntimeReadiness | null>(null)

  useEffect(() => {
    if (!isOpen) return

    if (userData && clients) {
      const selectedClient = searchParams.get("clientId") || undefined
      const newContext = {
        tenantId: userData.tenantId,
        userId: userData.id,
        userRole: userData.role,
        currentView: pathname,
        selectedClient,
        availableClients: clients,
        availableUsers: users || [],
      }
      setContext(newContext)
    }
  }, [isOpen, userData, clients, users, setContext, pathname, searchParams])

  useEffect(() => {
    if (!isOpen) return

    let cancelled = false
    fetch("/api/ai/command", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setReadiness(data)
      })
      .catch(() => {
        if (!cancelled) setReadiness(null)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        const { isOpen, open, close } = useCommandBarStore.getState()
        if (isOpen) {
          close()
        } else {
          open()
        }
      }

      if (e.key === "Escape" && isOpen) {
        close()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, close])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        stableViewport="top"
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cn(
          "flex !top-[calc(env(safe-area-inset-top)+0.75rem)] !translate-y-0 sm:!top-[8vh]",
          "max-h-[min(78svh,620px)] w-[min(760px,calc(100vw-1rem))] flex-col gap-0 overflow-hidden p-0",
          "rounded-2xl bg-white/98 backdrop-blur-xl dark:bg-slate-950/98",
          "border border-slate-200/80 shadow-2xl shadow-black/35 dark:border-slate-800/90",
          "motion-safe:duration-150 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=open]:slide-in-from-top-3 motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:zoom-out-98 motion-safe:data-[state=closed]:slide-out-to-top-3"
        )}
      >
        
        <DialogTitle className="sr-only">Command Bar</DialogTitle>
        <DialogDescription className="sr-only">
          Usa il comando AI per eseguire azioni rapide nella piattaforma
        </DialogDescription>

        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={liquidExpand.initial}
            animate={liquidExpand.animate}
            exit={liquidExpand.exit}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="relative flex min-h-0 flex-1 flex-col">
              <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                <CommandInput />
                
                <div className="shrink-0 px-3 pb-2 sm:px-4 sm:pb-3">
                  <OrchestrationFeedback />
                </div>

                {status === "gathering" && missingParams.length > 0 && (
                  <div className="min-h-0 overflow-y-auto overscroll-contain border-t border-slate-200 p-3 command-bar-scroll dark:border-slate-800 sm:p-4">
                    <ContextForm />
                  </div>
                )}

                {status !== "gathering" && (
                  <div className="min-h-0 overflow-y-auto overscroll-contain command-bar-scroll">
                    <CommandResults />
                  </div>
                )}
              </div>
            </div>

            {status === "processing" && (
              <div className="absolute inset-0 bg-slate-200/20 dark:bg-slate-700/20 animate-pulse pointer-events-none" />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50/95 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/95 sm:px-4">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="hidden items-center gap-2 sm:flex">
              <kbd className="px-2 py-1 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-xs">
                ⌘K
              </kbd>
              <span>Command</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
              <span className="font-medium text-emerald-600 dark:text-emerald-300">locale pronto</span>
              {readiness?.graph && (
                <span className={statusTone(readiness.graph.runtimeStatus)}>
                  grafo {readiness.graph.domains} domini
                </span>
              )}
              {readiness?.chat && (
                <span className={statusTone(readiness.chat.runtimeStatus)}>
                  chat {readiness.chat.providerId}
                </span>
              )}
              {readiness?.research && (
                <span className={statusTone(readiness.research.runtimeStatus)}>
                  research {readiness.research.providerId}
                </span>
              )}
              {readiness?.code && (
                <span className={statusTone(readiness.code.runtimeStatus)}>
                  code {readiness.code.providerId}
                </span>
              )}
            </div>
            <div className="hidden shrink-0 items-center justify-end gap-2 sm:flex">
              <kbd className="px-2 py-1 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-xs">
                ↵
              </kbd>
              <span>esegui</span>
              <kbd className="ml-3 px-2 py-1 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-xs">
                ESC
              </kbd>
              <span>per chiudere</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
