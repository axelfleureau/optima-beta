'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DynamicWorkspace } from "@/components/dynamic-workspace"
import { AutoGenPreview } from "@/components/calendar/auto-gen-preview"
import { useWorkspaceNav } from '@/lib/stores/workspace-nav-store'
import { useArchitectStore } from '@/lib/stores/architect-store'
import { useAutoGenStore } from '@/lib/stores/auto-gen-store'
import { getTaskById } from '@/lib/utils/task-matcher'
import { useAuth } from '@/lib/auth-context'

export default function WorkspacePage() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { selectedTaskId, pendingAction, highlightedTaskId, clearNavigation, setHighlight } = useWorkspaceNav()
  const { openArchitect } = useArchitectStore()
  const { generateCopy, generateVisual } = useAutoGenStore()

  useEffect(() => {
    const taskId = searchParams.get('taskId')
    const action = searchParams.get('action')

    if (taskId && action) {
      scrollToTask(taskId)
      setHighlight(taskId)
      
      const executeAction = async () => {
        if (action === 'refine') {
          const task = await getTaskById(taskId)
          if (task) {
            openArchitect(task.title, task.clientId, task.clientName)
          }
        } else if (action === 'generate-copy') {
          const task = await getTaskById(taskId)
          if (task && user) {
            generateCopy(taskId, task.title, task.clientName, user.uid)
          }
        } else if (action === 'generate-visual') {
          const task = await getTaskById(taskId)
          if (task && user) {
            const token = await user.getIdToken()
            generateVisual(taskId, `${task.title}${task.clientName ? ` for ${task.clientName}` : ''}`, user.uid, token)
          }
        }

        setTimeout(() => clearNavigation(), 2500)
      }

      executeAction()
    }
  }, [searchParams, user])

  useEffect(() => {
    if (selectedTaskId && pendingAction) {
      scrollToTask(selectedTaskId)
      setHighlight(selectedTaskId)

      const executeAction = async () => {
        if (pendingAction === 'refine') {
          const task = await getTaskById(selectedTaskId)
          if (task) {
            openArchitect(task.title, task.clientId, task.clientName)
          }
        } else if (pendingAction === 'generate-copy') {
          const task = await getTaskById(selectedTaskId)
          if (task && user) {
            generateCopy(selectedTaskId, task.title, task.clientName, user.uid)
          }
        } else if (pendingAction === 'generate-visual') {
          const task = await getTaskById(selectedTaskId)
          if (task && user) {
            const token = await user.getIdToken()
            generateVisual(selectedTaskId, `${task.title}${task.clientName ? ` for ${task.clientName}` : ''}`, user.uid, token)
          }
        }

        setTimeout(() => clearNavigation(), 500)
      }

      executeAction()
    }
  }, [selectedTaskId, pendingAction, user])

  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => {
        setHighlight(null)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [highlightedTaskId, setHighlight])

  return (
    <div className="h-screen">
      <DynamicWorkspace />
      <AutoGenPreview />
    </div>
  )
}

function scrollToTask(taskId: string) {
  setTimeout(() => {
    const element = document.getElementById(`task-${taskId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, 500)
}
