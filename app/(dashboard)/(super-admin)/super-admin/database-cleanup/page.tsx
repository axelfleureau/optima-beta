"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CheckCircle, AlertTriangle, Database, Trash2, RefreshCw, Users, Zap } from "lucide-react"
import { toast } from "sonner"

interface CleanupResult {
  success: boolean
  message: string
  details?: {
    usersUpdated?: number
    aiUsageRecordsProcessed?: number
    tasksUpdated?: number
    clientsUpdated?: number
    duplicatesRemoved?: number
  }
}

export default function DatabaseCleanupPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<CleanupResult[]>([])

  const executeCleanup = async (operation: string) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/admin/database-cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ operation }),
      })

      const result: CleanupResult = await response.json()

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }

      setResults((prev) => [result, ...prev])
    } catch (error) {
      const errorResult: CleanupResult = {
        success: false,
        message: `Errore durante l'operazione: ${error instanceof Error ? error.message : "Errore sconosciuto"}`,
      }
      setResults((prev) => [errorResult, ...prev])
      toast.error("Errore durante l'operazione")
    } finally {
      setIsLoading(false)
    }
  }

  const cleanupOperations = [
    {
      id: "fix-token-structure",
      title: "Correggi Struttura Token",
      description: "Separa i dati dei token tra users e ai_usage, rimuove duplicati",
      icon: Zap,
      variant: "default" as const,
    },
    {
      id: "fix-users-data",
      title: "Correggi Dati Utenti",
      description: "Aggiunge campi mancanti agli utenti (role, plan, token limits)",
      icon: Users,
      variant: "default" as const,
    },
    {
      id: "fix-tasks-structure",
      title: "Correggi Struttura Task",
      description: "Aggiunge campi mancanti ai task (priority, tags, attachments)",
      icon: CheckCircle,
      variant: "default" as const,
    },
    {
      id: "remove-duplicates",
      title: "Rimuovi Duplicati",
      description: "Rimuove record duplicati da tutte le collezioni",
      icon: Trash2,
      variant: "destructive" as const,
    },
    {
      id: "full-cleanup",
      title: "Pulizia Completa",
      description: "Esegue tutte le operazioni di pulizia in sequenza",
      icon: RefreshCw,
      variant: "default" as const,
    },
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Database className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Pulizia e Correzione Database</h1>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Attenzione:</strong> Queste operazioni modificano direttamente il database. Assicurati di aver fatto
          un backup prima di procedere. Alcune operazioni potrebbero richiedere diversi minuti.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cleanupOperations.map((operation) => {
          const Icon = operation.icon
          return (
            <Card key={operation.id} className="relative">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <CardTitle className="text-lg">{operation.title}</CardTitle>
                </div>
                <CardDescription>{operation.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => executeCleanup(operation.id)}
                  disabled={isLoading}
                  variant={operation.variant}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Elaborazione...
                    </>
                  ) : (
                    "Esegui"
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {results.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Risultati Operazioni</h2>
            <div className="space-y-3">
              {results.map((result, index) => (
                <Card key={index} className={result.success ? "border-green-200" : "border-red-200"}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={result.success ? "default" : "destructive"}>
                            {result.success ? "Successo" : "Errore"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{new Date().toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm">{result.message}</p>
                        {result.details && (
                          <div className="mt-2 text-xs text-muted-foreground space-y-1">
                            {result.details.usersUpdated && (
                              <div>• Utenti aggiornati: {result.details.usersUpdated}</div>
                            )}
                            {result.details.aiUsageRecordsProcessed && (
                              <div>• Record AI processati: {result.details.aiUsageRecordsProcessed}</div>
                            )}
                            {result.details.tasksUpdated && <div>• Task aggiornati: {result.details.tasksUpdated}</div>}
                            {result.details.clientsUpdated && (
                              <div>• Clienti aggiornati: {result.details.clientsUpdated}</div>
                            )}
                            {result.details.duplicatesRemoved && (
                              <div>• Duplicati rimossi: {result.details.duplicatesRemoved}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
