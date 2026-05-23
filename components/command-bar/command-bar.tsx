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
        className={cn(
          "max-w-3xl p-0 gap-0 overflow-hidden relative",
          "bg-white dark:bg-slate-950",
          "shadow-2xl border border-slate-200 dark:border-slate-800",
          "animate-in fade-in-0 zoom-in-95"
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
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative"
          >
            <div className="relative">
              <div className="relative z-10">
                <CommandInput />
                
                <div className="px-5 pb-4">
                  <OrchestrationFeedback />
                </div>

                {status === "gathering" && missingParams.length > 0 && (
                  <div className="p-5 border-t border-slate-200 dark:border-slate-800">
                    <ContextForm />
                  </div>
                )}

                {status !== "gathering" && <CommandResults />}
              </div>
            </div>

            {status === "processing" && (
              <div className="absolute inset-0 bg-slate-200/20 dark:bg-slate-700/20 animate-pulse pointer-events-none" />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                ⌘K
              </kbd>
              <span>per aprire</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
                ↵
              </kbd>
              <span>esegui</span>
              <kbd className="ml-3 px-2 py-1 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px]">
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
