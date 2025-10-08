"use client"

import { toast } from 'sonner'

export interface AIFeedbackContext {
  workspaceName?: string
  taskName?: string
  clientName?: string
  quoteName?: string
  amount?: number
}

export function useAIFeedback() {
  const success = (action: string, context?: AIFeedbackContext) => {
    const contextStr = formatContext(context)
    toast.success(`${action} completato`, {
      description: contextStr,
      duration: 4000
    })
  }
  
  const error = (action: string, errorMsg: string, guidance?: string) => {
    toast.error(`${action} fallito`, {
      description: `${errorMsg}${guidance ? `\n\n${guidance}` : ''}`,
      duration: 6000
    })
  }
  
  const info = (message: string) => {
    toast.info(message, { duration: 3000 })
  }
  
  const loading = (message: string) => {
    return toast.loading(message)
  }
  
  const dismiss = (toastId: string | number) => {
    toast.dismiss(toastId)
  }
  
  return { success, error, info, loading, dismiss }
}

function formatContext(context?: AIFeedbackContext): string {
  if (!context) return ''
  
  const parts = []
  if (context.workspaceName) parts.push(`Workspace: ${context.workspaceName}`)
  if (context.taskName) parts.push(`Task: ${context.taskName}`)
  if (context.clientName) parts.push(`Cliente: ${context.clientName}`)
  if (context.quoteName) parts.push(`Preventivo: ${context.quoteName}`)
  if (context.amount) parts.push(`Importo: €${(context.amount/100).toFixed(2)}`)
  
  return parts.join(' • ')
}
