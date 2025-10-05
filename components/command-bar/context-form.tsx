"use client"

import { useState } from "react"
import { useCommandBarStore } from "@/lib/stores/command-bar-store"
import { GlassInput } from "@/components/ui/glass-input"
import { GlassButton } from "@/components/ui/glass-button"
import { useClients } from "@/hooks/use-clients"
import { useUsers } from "@/hooks/use-users"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import { liquidExpand } from "@/lib/animations/liquid"
import { AlertCircle } from "lucide-react"

export function ContextForm() {
  const { missingParams, nlpResponse, context, setStatus } = useCommandBarStore()
  const { clients } = useClients()
  const { users } = useUsers()
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}
    missingParams.forEach((param) => {
      if (!formData[param]) {
        newErrors[param] = `${param} è obbligatorio`
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setStatus("executing")

    try {
      if (!nlpResponse || !context) return

      const completeEntities = {
        ...nlpResponse.entities,
        ...formData,
      }

      const { executeIntent } = await import("@/lib/command-bar/handlers")
      const result = await executeIntent(nlpResponse.intent, completeEntities, context)

      const searchIntents = ["SEARCH_TASK", "SEARCH_GLOBAL"]
      const isSearchIntent = searchIntents.includes(nlpResponse.intent)

      if (result.success && result.data && isSearchIntent) {
        setStatus("idle")
        useCommandBarStore.getState().setSearchResults(
          Array.isArray(result.data) ? result.data : [result.data]
        )
      } else if (result.success) {
        setStatus("idle")
        setTimeout(() => {
          useCommandBarStore.getState().close()
        }, 1000)
      } else {
        setStatus("idle")
        useCommandBarStore.getState().setError(result.error || "Errore nell'esecuzione")
      }
    } catch (error: any) {
      console.error("Context form error:", error)
      setStatus("idle")
      useCommandBarStore.getState().setError(error.message || "Errore nell'esecuzione")
    }
  }

  const renderField = (param: string) => {
    const paramLower = param.toLowerCase()

    if (paramLower.includes("client") || paramLower === "clientid" || paramLower === "clientname") {
      return (
        <div key={param} className="space-y-2">
          <label className="text-sm font-medium text-foreground">Cliente</label>
          <Select
            value={formData[param]}
            onValueChange={(value) => setFormData({ ...formData, [param]: value })}
          >
            <SelectTrigger className="bg-white/60 dark:bg-black/30 backdrop-blur-md border-white/40 dark:border-white/20">
              <SelectValue placeholder="Seleziona cliente..." />
            </SelectTrigger>
            <SelectContent>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors[param] && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors[param]}
            </p>
          )}
        </div>
      )
    }

    if (
      paramLower.includes("assign") ||
      paramLower === "assigneduserid" ||
      paramLower === "assignee"
    ) {
      return (
        <div key={param} className="space-y-2">
          <label className="text-sm font-medium text-foreground">Assegna a</label>
          <Select
            value={formData[param]}
            onValueChange={(value) => setFormData({ ...formData, [param]: value })}
          >
            <SelectTrigger className="bg-white/60 dark:bg-black/30 backdrop-blur-md border-white/40 dark:border-white/20">
              <SelectValue placeholder="Seleziona utente..." />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors[param] && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors[param]}
            </p>
          )}
        </div>
      )
    }

    if (paramLower === "priority") {
      return (
        <div key={param} className="space-y-2">
          <label className="text-sm font-medium text-foreground">Priorità</label>
          <Select
            value={formData[param]}
            onValueChange={(value) => setFormData({ ...formData, [param]: value })}
          >
            <SelectTrigger className="bg-white/60 dark:bg-black/30 backdrop-blur-md border-white/40 dark:border-white/20">
              <SelectValue placeholder="Seleziona priorità..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Bassa</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
          {errors[param] && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {errors[param]}
            </p>
          )}
        </div>
      )
    }

    return (
      <div key={param} className="space-y-2">
        <label className="text-sm font-medium text-foreground capitalize">
          {param.replace(/([A-Z])/g, " $1").trim()}
        </label>
        <GlassInput
          value={formData[param] || ""}
          onChange={(e) => setFormData({ ...formData, [param]: e.target.value })}
          placeholder={`Inserisci ${param}...`}
          variant="glass"
          state={errors[param] ? "error" : "default"}
          error={errors[param]}
        />
      </div>
    )
  }

  return (
    <motion.div
      initial={liquidExpand.initial}
      animate={liquidExpand.animate}
      exit={liquidExpand.exit}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <p>Completa i seguenti campi per eseguire il comando:</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {missingParams.map((param) => renderField(param))}

        <div className="flex items-center gap-2 pt-2">
          <GlassButton type="submit" variant="primary" className="flex-1">
            Esegui Comando
          </GlassButton>
          <GlassButton
            type="button"
            variant="ghost"
            onClick={() => {
              setStatus("idle")
              useCommandBarStore.getState().reset()
            }}
          >
            Annulla
          </GlassButton>
        </div>
      </form>
    </motion.div>
  )
}
