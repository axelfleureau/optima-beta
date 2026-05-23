"use client"

import { useCallback, useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import type { Project } from "@/lib/types"

type ProjectInput = {
  name: string
  clientId?: string | null
  status?: Project["status"]
  memberIds?: string[]
  startsAt?: string | Date | null
  dueAt?: string | Date | null
  budgetCents?: number
}

async function parseProjectResponse(response: Response) {
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.error || "Operazione progetto non riuscita")
  }

  return payload
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
    startsAt: project.startsAt ? new Date(project.startsAt as any) : null,
    dueAt: project.dueAt ? new Date(project.dueAt as any) : null,
    createdAt: project.createdAt ? new Date(project.createdAt as any) : new Date(),
    updatedAt: project.updatedAt ? new Date(project.updatedAt as any) : new Date(),
    members: project.members || [],
    memberIds: project.memberIds || project.members?.map((member) => member.id) || [],
  }
}

export function useProjects() {
  const { user, userData, loading: authLoading } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshProjects = useCallback(async () => {
    if (authLoading) return

    if (!user || !userData?.tenantId) {
      setProjects([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/projects", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      })
      const payload = await parseProjectResponse(response)
      setProjects((payload.projects || []).map(normalizeProject))
    } catch (err) {
      console.error("Error loading projects:", err)
      setError(err instanceof Error ? err.message : "Errore nel caricamento dei progetti")
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [authLoading, user, userData?.tenantId])

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  const createProject = async (project: ProjectInput) => {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(project),
      })

      const payload = await parseProjectResponse(response)
      const createdProject = normalizeProject(payload.project)
      setProjects((current) => [createdProject, ...current])
      return createdProject
    } catch (err) {
      console.error("Error creating project:", err)
      setError(err instanceof Error ? err.message : "Errore durante la creazione del progetto")
      throw err
    }
  }

  const updateProject = async (projectId: string, updates: Partial<ProjectInput>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(updates),
      })

      const payload = await parseProjectResponse(response)
      const updatedProject = normalizeProject(payload.project)
      setProjects((current) => current.map((project) => (project.id === projectId ? updatedProject : project)))
      return updatedProject
    } catch (err) {
      console.error("Error updating project:", err)
      setError(err instanceof Error ? err.message : "Errore durante l'aggiornamento del progetto")
      throw err
    }
  }

  return { projects, loading, error, refreshProjects, createProject, updateProject }
}
