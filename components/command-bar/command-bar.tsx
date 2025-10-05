"use client"

import { useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useCommandBarStore } from "@/lib/stores/command-bar-store"
import { useAuth } from "@/lib/auth-context"
import { useClients } from "@/hooks/use-clients"
import { useUsers } from "@/hooks/use-users"
import { CommandInput } from "./command-input"
import { CommandResults } from "./command-results"
import { ContextForm } from "./context-form"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { liquidExpand } from "@/lib/animations/liquid"

export function CommandBar() {
  const { isOpen, close, status, missingParams, setContext } = useCommandBarStore()
  const { userData } = useAuth()
  const { clients } = useClients()
  const { users } = useUsers()

  useEffect(() => {
    if (userData && clients) {
      setContext({
        tenantId: userData.tenantId,
        userId: userData.id,
        userRole: userData.role,
        availableClients: clients,
        availableUsers: users || [],
      })
    }
  }, [userData, clients, users, setContext])

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
          "max-w-2xl p-0 gap-0 overflow-hidden border-0",
          "bg-white/70 dark:bg-black/40 backdrop-blur-xl",
          "shadow-glass-lg",
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
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 opacity-50 pointer-events-none" />

              <div className="relative z-10">
                <CommandInput />

                {status === "gathering" && missingParams.length > 0 && (
                  <div className="p-4 border-t border-white/20 dark:border-white/10">
                    <ContextForm />
                  </div>
                )}

                {status !== "gathering" && <CommandResults />}
              </div>
            </div>

            {status === "processing" && (
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 animate-shimmer pointer-events-none" />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="px-4 py-2 border-t border-white/20 dark:border-white/10 bg-white/50 dark:bg-black/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/60 dark:bg-black/40 rounded border border-white/40 dark:border-white/20 font-mono text-[10px]">
                ⌘K
              </kbd>
              <span>per aprire</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/60 dark:bg-black/40 rounded border border-white/40 dark:border-white/20 font-mono text-[10px]">
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
