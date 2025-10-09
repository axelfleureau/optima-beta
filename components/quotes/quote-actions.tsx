"use client"

import { useState } from "react"
import { LiquidButton } from "@/components/ui/liquid-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import {
  MoreHorizontal,
  Eye,
  Edit,
  Send,
  Download,
  Copy,
  Archive,
  Trash2,
  Share2,
} from "lucide-react"
import { Quote } from "@/types/quote"

interface QuoteActionsProps {
  quote: Quote
  onView?: (quoteId: string) => void
  onEdit?: (quoteId: string) => void
  onSend?: (quoteId: string) => void
  onDownload?: (quoteId: string) => void
  onDuplicate?: (quoteId: string) => void
  onArchive?: (quoteId: string) => void
  onDelete?: (quoteId: string) => void
  onShare?: (quoteId: string) => void
}

export function QuoteActions({
  quote,
  onView,
  onEdit,
  onSend,
  onDownload,
  onDuplicate,
  onArchive,
  onDelete,
  onShare,
}: QuoteActionsProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  
  const handleDelete = () => {
    if (onDelete) {
      onDelete(quote.id)
      setShowDeleteDialog(false)
    }
  }
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <LiquidButton variant="outline" size="sm">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Azioni</span>
          </LiquidButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-gray-200/50">
          <DropdownMenuLabel>Azioni</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {onView && (
            <DropdownMenuItem onClick={() => onView(quote.id)}>
              <Eye className="mr-2 h-4 w-4" />
              Visualizza
            </DropdownMenuItem>
          )}
          
          {quote.status === 'draft' && onEdit && (
            <DropdownMenuItem onClick={() => onEdit(quote.id)}>
              <Edit className="mr-2 h-4 w-4" />
              Modifica
            </DropdownMenuItem>
          )}
          
          {quote.status === 'draft' && onSend && (
            <DropdownMenuItem onClick={() => onSend(quote.id)}>
              <Send className="mr-2 h-4 w-4" />
              Invia a Cliente
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {onDownload && (
            <DropdownMenuItem onClick={() => onDownload(quote.id)}>
              <Download className="mr-2 h-4 w-4" />
              Scarica PDF
            </DropdownMenuItem>
          )}
          
          {onShare && (
            <DropdownMenuItem onClick={() => onShare(quote.id)}>
              <Share2 className="mr-2 h-4 w-4" />
              Condividi
            </DropdownMenuItem>
          )}
          
          {onDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate(quote.id)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplica
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {onArchive && (
            <DropdownMenuItem onClick={() => onArchive(quote.id)}>
              <Archive className="mr-2 h-4 w-4" />
              Archivia
            </DropdownMenuItem>
          )}
          
          {onDelete && (
            <DropdownMenuItem
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 dark:text-red-400 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Elimina
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il preventivo "{quote.title}"?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
