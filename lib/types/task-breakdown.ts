export interface TaskPhase {
  id: string
  title: string
  description: string
  rationale: string
  checklist: string[]
  warnings?: string[]
  estimatedHours: number
  dependencies?: string[]
}

export interface TaskBreakdown {
  isComplex: boolean
  complexity: "simple" | "moderate" | "complex"
  phases: TaskPhase[]
  totalEstimatedHours: number
  recommendedApproach: string
}
