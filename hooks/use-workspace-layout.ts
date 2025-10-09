import { useState, useEffect } from "react"
import { useClients } from "@/hooks/use-clients"

export function useWorkspaceLayout() {
  const { clients } = useClients()
  const [selectedClientId, setSelectedClientId] = useState<string>("")
  const [showAllClients, setShowAllClients] = useState(false)
  const [showTenantWorkspace, setShowTenantWorkspace] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    if (clients.length > 0 && !selectedClientId && !showTenantWorkspace && !showAllClients) {
      setSelectedClientId(clients[0].id)
    }
  }, [clients, selectedClientId, showTenantWorkspace, showAllClients])

  const handleTenantWorkspaceClick = () => {
    setShowTenantWorkspace(true)
    setShowAllClients(false)
    setSelectedClientId("")
  }

  const handleAllClientsClick = () => {
    setShowAllClients(true)
    setShowTenantWorkspace(false)
    setSelectedClientId("")
  }

  const handleClientWorkspaceClick = (clientId: string) => {
    setShowTenantWorkspace(false)
    setShowAllClients(false)
    setSelectedClientId(clientId)
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
