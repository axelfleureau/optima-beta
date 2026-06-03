import { useState, useEffect } from "react"
import { useClients } from "@/hooks/use-clients"

const WORKSPACE_VIEW_STORAGE_KEY = "optima:workspace:view"

type StoredWorkspaceView =
  | { mode: "all" }
  | { mode: "tenant" }
  | { mode: "client"; clientId: string }

function readStoredWorkspaceView(): StoredWorkspaceView | null {
  if (typeof window === "undefined") return null

  try {
    const raw = window.localStorage.getItem(WORKSPACE_VIEW_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredWorkspaceView>

    if (parsed.mode === "all") return { mode: "all" }
    if (parsed.mode === "tenant") return { mode: "tenant" }
    if (parsed.mode === "client" && "clientId" in parsed && typeof parsed.clientId === "string" && parsed.clientId) {
      return { mode: "client", clientId: parsed.clientId }
    }
  } catch {
    window.localStorage.removeItem(WORKSPACE_VIEW_STORAGE_KEY)
  }

  return null
}

function persistWorkspaceView(view: StoredWorkspaceView) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(WORKSPACE_VIEW_STORAGE_KEY, JSON.stringify(view))
}

export function useWorkspaceLayout() {
  const { clients } = useClients()
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [showAllClients, setShowAllClients] = useState(true)
  const [showTenantWorkspace, setShowTenantWorkspace] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [viewRestored, setViewRestored] = useState(false)

  useEffect(() => {
    if (viewRestored) return

    const storedView = readStoredWorkspaceView()

    if (!storedView) {
      setShowAllClients(true)
      setShowTenantWorkspace(false)
      setSelectedClientId("")
      setViewRestored(true)
      return
    }

    if (storedView.mode === "all") {
      setShowAllClients(true)
      setShowTenantWorkspace(false)
      setSelectedClientId("")
      setViewRestored(true)
      return
    }

    if (storedView.mode === "tenant") {
      setShowAllClients(false)
      setShowTenantWorkspace(true)
      setSelectedClientId("")
      setViewRestored(true)
      return
    }

    if (clients.some((client) => client.id === storedView.clientId)) {
      setShowAllClients(false)
      setShowTenantWorkspace(false)
      setSelectedClientId(storedView.clientId)
    } else if (clients.length > 0) {
      setShowAllClients(true)
      setShowTenantWorkspace(false)
      setSelectedClientId("")
      persistWorkspaceView({ mode: "all" })
    }

    if (clients.length > 0 || storedView.mode !== "client") {
      setViewRestored(true)
    }
  }, [clients, viewRestored])

  const handleTenantWorkspaceClick = () => {
    setShowTenantWorkspace(true)
    setShowAllClients(false)
    setSelectedClientId("")
    persistWorkspaceView({ mode: "tenant" })
  }

  const handleAllClientsClick = () => {
    setShowAllClients(true)
    setShowTenantWorkspace(false)
    setSelectedClientId("")
    persistWorkspaceView({ mode: "all" })
  }

  const handleClientWorkspaceClick = (clientId: string) => {
    setShowTenantWorkspace(false)
    setShowAllClients(false)
    setSelectedClientId(clientId)
    persistWorkspaceView({ mode: "client", clientId })
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return {
    selectedClientId,
    showAllClients,
    showTenantWorkspace,
    sidebarCollapsed,
    handleTenantWorkspaceClick,
    handleAllClientsClick,
    handleClientWorkspaceClick,
    toggleSidebar,
  }
}
