"use client"

import { useState, useEffect } from "react"
import { Building2, Check } from "lucide-react"
import { motion } from "framer-motion"
import { useClients } from "@/hooks/use-clients"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

interface ClientSelectorProps {
  value: string | null
  onChange: (clientId: string, clientName: string) => void
  filterHint?: string
}

export function ClientSelector({ value, onChange, filterHint }: ClientSelectorProps) {
  const { clients, loading } = useClients()
  const [search, setSearch] = useState(filterHint || "")

  // Auto-select if only one match to hint
  useEffect(() => {
    if (filterHint && clients.length > 0 && !value) {
      const matches = clients.filter(c => 
        c.name.toLowerCase().includes(filterHint.toLowerCase())
      )
      if (matches.length === 1) {
        onChange(matches[0].id, matches[0].name)
      }
    }
  }, [filterHint, clients, value, onChange])

  if (loading) {
    return (
      <div className="rounded-lg bg-white/60 dark:bg-black/30 backdrop-blur-md border border-white/40 dark:border-white/10 p-8 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          <span>Caricamento clienti...</span>
        </div>
      </div>
    )
  }

  return (
    <Command className="rounded-lg bg-white/60 dark:bg-black/30 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-glass-md">
      <CommandInput 
        placeholder="Cerca cliente..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[300px]">
        <CommandEmpty>Nessun cliente trovato</CommandEmpty>
        <CommandGroup>
          {clients.map((client) => (
            <CommandItem
              key={client.id}
              value={client.name}
              onSelect={() => onChange(client.id, client.name)}
              className="cursor-pointer"
            >
              <motion.div
                className="flex items-center gap-2 w-full"
                whileHover={{ x: 4 }}
                transition={{ duration: 0.2 }}
              >
                <div className={cn(
                  "p-2 rounded-lg transition-all",
                  value === client.id
                    ? "bg-gradient-to-br from-purple-500 to-pink-600 text-white"
                    : "bg-white/60 dark:bg-black/40"
                )}>
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{client.name}</p>
                  {client.company && (
                    <p className="text-xs text-muted-foreground">{client.company}</p>
                  )}
                </div>
                {value === client.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Check className="h-4 w-4 text-purple-500" />
                  </motion.div>
                )}
              </motion.div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
