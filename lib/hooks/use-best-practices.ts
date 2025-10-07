import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"

interface BestPractice {
  taskType: string
  checklist: string[]
  tips: { title: string; description: string }[]
  warnings: string[]
  resources?: { title: string; url?: string; description: string }[]
}

export function useBestPractices(taskType: string | null, taskDescription?: string) {
  const [practices, setPractices] = useState<BestPractice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!taskType || !user) return

    const fetchPractices = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch("/api/ai/task-best-practices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskType,
            taskDescription,
            userId: user.uid,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch best practices")
        }

        const data = await response.json()

        if (!data.success || !data.bestPractices) {
          throw new Error("Invalid response structure")
        }

        setPractices(data.bestPractices)
      } catch (err: any) {
        console.error("Best practices fetch error:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPractices()
  }, [taskType, taskDescription, user])

  return { practices, loading, error }
}
