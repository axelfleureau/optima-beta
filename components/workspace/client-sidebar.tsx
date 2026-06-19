"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Users,
  UserPlus,
  Building,
  Globe,
  TrendingUp,
  Target,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import type { Client, Task } from "@/lib/types"
import { getInternalWorkspaceClientIds, isInternalWorkspaceClient, isInternalWorkspaceTask } from "./internal-workspace"

interface ClientSidebarProps {
  clients: Client[]
  allTasks: Task[]
  selectedClientId: string
  showAllClients: boolean
  showTenantWorkspace: boolean
  collapsed: boolean
  onSelectClient: (clientId: string) => void
  onSelectAllClients: () => void
  onSelectTenantWorkspace: () => void
  onToggleCollapse: () => void
  onAddClient: () => void
  isMobile?: boolean
}

const COMPLETED_COLUMNS = new Set(["done", "completed"])
const ACTIVE_COLUMNS = new Set([
  "to-do",
  "todo",
  "urgenze",
  "in-corso",
  "in-progress",
  "active",
  "validation",
  "review",
  "backlog",
  "planning",
])

function getTaskColumnId(task: Task) {
  return task.columnId || task.status
}

function countTasks(tasks: Task[]) {
  const completed = tasks.filter((task) => COMPLETED_COLUMNS.has(getTaskColumnId(task))).length
  const active = tasks.filter((task) => ACTIVE_COLUMNS.has(getTaskColumnId(task))).length

  return { active, completed }
}

export function ClientSidebar({
  clients,
  allTasks,
  selectedClientId,
  showAllClients,
  showTenantWorkspace,
  collapsed,
  onSelectClient,
  onSelectAllClients,
  onSelectTenantWorkspace,
  onToggleCollapse,
  onAddClient,
  isMobile = false,
}: ClientSidebarProps) {
  const { userData } = useAuth()
  const [clientSearchTerm, setClientSearchTerm] = useState("")

  const visibleClients = clients.filter((client) => !isInternalWorkspaceClient(client, userData?.companyName))
  const internalClientIds = getInternalWorkspaceClientIds(clients, userData?.companyName)
  const filteredClients = visibleClients.filter((client) =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()),
  )

  const getClientTaskCount = (client: Client) => {
    const clientTasks = allTasks.filter((task) => task.clientId === client.id)
    const localCount = countTasks(clientTasks)
    const apiCount = {
      active: Number(client.activeTasksCount || 0),
      completed: Number(client.completedTasksCount || 0),
    }

    if (localCount.active + localCount.completed > 0) {
      return localCount
    }

    return apiCount
  }

  const getAllClientsTaskCount = () => {
    const allClientTasks = allTasks.filter(
      (task) => !isInternalWorkspaceTask(task, internalClientIds, userData?.companyName),
    )
    const localCount = countTasks(allClientTasks)
    const apiCount = visibleClients.reduce(
      (acc, client) => ({
        active: acc.active + Number(client.activeTasksCount || 0),
        completed: acc.completed + Number(client.completedTasksCount || 0),
      }),
      { active: 0, completed: 0 },
    )

    if (localCount.active + localCount.completed > 0) {
      return localCount
    }

    return apiCount
  }

  if (collapsed) {
    return (
      <div className="flex h-full min-h-0 w-16 shrink-0 flex-col items-center border-r border-slate-200/50 bg-white/80 py-4 shadow-xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full border border-slate-200/50 bg-white/90 shadow-lg backdrop-blur-xl transition-all duration-150 hover:shadow-xl dark:border-slate-700/50 dark:bg-slate-900/80"
          onClick={onToggleCollapse}
          aria-label="Mostra lista clienti"
          title="Mostra lista clienti"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
        <div className="mt-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/50 bg-white/60 text-slate-500 dark:border-slate-700/50 dark:bg-slate-900/50 dark:text-slate-400">
          <Users className="h-5 w-5" />
        </div>
        <div className="mt-3 [writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
          Clienti
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 w-80 flex-col overflow-hidden border-r border-slate-200/50 bg-white/80 shadow-xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/80">
      <div className="p-4 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-slate-600 dark:text-slate-400" />
            <div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100">Clienti</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{visibleClients.length} totali</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-pink-100 dark:hover:bg-pink-900/20"
              onClick={onAddClient}
            >
              <UserPlus className="h-4 w-4 text-pink-600" />
            </Button>
            {!isMobile && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-700"
                onClick={onToggleCollapse}
                aria-label="Nascondi lista clienti"
                title="Nascondi lista clienti"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Cerca clienti..."
            className="pl-10 bg-white/60 dark:bg-slate-700/60 backdrop-blur-sm border-slate-200/50 dark:border-slate-600/50"
            value={clientSearchTerm}
            onChange={(e) => setClientSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 [-webkit-overflow-scrolling:touch] [touch-action:pan-y]">
        <div className="space-y-3">
          <button
            onClick={onSelectAllClients}
            className={`w-full text-left p-4 rounded-xl transition-all duration-150 ${
              showAllClients
                ? "bg-white/95 dark:bg-slate-700/95 shadow-lg border-2 border-slate-300 dark:border-slate-500"
                : "bg-white/60 dark:bg-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <Globe className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">Tutti i Clienti</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-blue-500" />
                  <span className="text-slate-600 dark:text-slate-400">{getAllClientsTaskCount().active} attive</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="h-3 w-3 text-green-500" />
                  <span className="text-slate-600 dark:text-slate-400">
                    {getAllClientsTaskCount().completed} completate
                  </span>
                </div>
              </div>
            </div>
          </button>

          {filteredClients.map((client) => {
            const taskCount = getClientTaskCount(client)
            return (
              <button
                key={client.id}
                onClick={() => onSelectClient(client.id)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-150 ${
                  selectedClientId === client.id && !showTenantWorkspace && !showAllClients
                    ? "bg-white/95 dark:bg-slate-700/95 shadow-lg border-2 border-slate-300 dark:border-slate-500"
                    : "bg-white/60 dark:bg-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${client.color} shadow-md flex items-center justify-center`}>
                    <span className="text-white text-xs font-bold">{client.name.charAt(0)}</span>
                  </div>
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{client.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-blue-500" />
                      <span className="text-slate-600 dark:text-slate-400">{taskCount.active} attive</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-green-500" />
                      <span className="text-slate-600 dark:text-slate-400">{taskCount.completed} completate</span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}

          {filteredClients.length === 0 && clientSearchTerm && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                Nessun cliente trovato per "{clientSearchTerm}"
              </p>
            </div>
          )}

          {visibleClients.length === 0 && !clientSearchTerm && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Nessun cliente trovato</p>
              <Button
                size="sm"
                className="bg-righello-pink hover:bg-righello-pink-dark text-white shadow-corporate-medium hover:shadow-corporate-strong transition-all duration-150"
                onClick={onAddClient}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Aggiungi primo cliente
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-slate-100/50 to-slate-200/50 dark:from-slate-800/50 dark:to-slate-700/50">
        <button
          onClick={onSelectTenantWorkspace}
          className={`w-full text-left p-4 rounded-xl transition-all duration-150 ${
            showTenantWorkspace
              ? "bg-white/95 dark:bg-slate-700/95 shadow-lg border-2 border-slate-300 dark:border-slate-500"
              : "bg-white/60 dark:bg-slate-700/60 hover:bg-white/80 dark:hover:bg-slate-700/80 border border-slate-200/50 dark:border-slate-600/50 hover:shadow-md"
          }`}
        >
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <div>
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {userData?.companyName || "Team Interno"}
              </span>
              <div className="text-xs text-slate-500 dark:text-slate-400">Workspace interno</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
