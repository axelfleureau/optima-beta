"use client"

import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Eye, Edit, Mail, Trash2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { User } from "@/lib/types"
import { UserEditDialog } from "./user-edit-dialog"
import { UserViewDialog } from "./user-view-dialog"

interface UserActionsMenuProps {
  user: User
  onUserUpdated?: () => void
}

export function UserActionsMenu({ user, onUserUpdated }: UserActionsMenuProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/team/users/${user.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Errore nella rimozione dell'utente")
      }

      toast.success("Utente rimosso con successo")
      onUserUpdated?.()
      setShowDeleteAlert(false)

    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error(error instanceof Error ? error.message : "Errore nella rimozione dell'utente")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSendEmail = async () => {
    try {
      // TODO: Sostituire con invio email reale quando SMTP sarà configurato
      const response = await fetch("/api/team/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: user.id,
          type: "general",
          subject: "Messaggio dal team",
          message: "Ciao, ti scriviamo per aggiornarti sulle attività del team."
        })
      })

      if (response.ok) {
        toast.success("Email inviata con successo")
      } else {
        throw new Error("Errore nell'invio email")
      }
    } catch (error) {
      console.error("Error sending email:", error)
      toast.info("Funzionalità email in preparazione - Sistema SMTP in configurazione")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-gray-200/50">
          <DropdownMenuItem onClick={() => setShowViewDialog(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizza
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Modifica
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSendEmail}>
            <Mail className="mr-2 h-4 w-4" />
            Invia Email
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="text-red-600"
            onClick={() => setShowDeleteAlert(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Rimuovi
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Rimozione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rimuovere <strong>{user.firstName} {user.lastName}</strong> dal team?
              <br />
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rimozione...
                </>
              ) : (
                "Rimuovi"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <UserEditDialog
        user={user}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onUserUpdated={onUserUpdated}
      />

      {/* View Dialog */}
      <UserViewDialog
        user={user}
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
      />
    </>
  )
}