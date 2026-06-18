"use client"

import { useEffect } from "react"
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

export function CommandBar() {
  const { isOpen, close, status, missingParams, setContext } = useCommandBarStore()
  const { userData } = useAuth()
  const { clients } = useClients()
  const { users } = useUsers()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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
        className={cn(
          "relative top-3 flex max-h-[calc(100svh-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:top-5",
          "rounded-2xl bg-white dark:bg-slate-950",
          "border border-slate-200 shadow-2xl shadow-black/30 dark:border-slate-800",
          "sm:max-h-[min(66svh,600px)]",
          "motion-safe:duration-200 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:zoom-in-95 motion-safe:data-[state=open]:slide-in-from-top-4 motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[state=closed]:slide-out-to-top-4"
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
                
                <div className="shrink-0 px-4 pb-3 sm:px-5 sm:pb-4">
                  <OrchestrationFeedback />
                </div>

                {status === "gathering" && missingParams.length > 0 && (
                  <div className="min-h-0 overflow-y-auto overscroll-contain border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5">
                    <ContextForm />
                  </div>
                )}

                {status !== "gathering" && (
                  <div className="min-h-0 overflow-y-auto overscroll-contain">
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

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900 sm:px-5 sm:py-3">
          <div className="flex items-center justify-center text-xs text-muted-foreground sm:justify-between">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-xs">
                ⌘K
              </kbd>
              <span>command bar</span>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
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
