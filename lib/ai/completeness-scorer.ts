export interface TaskCompletenessResult {
  score: number
  missingFields: string[]
  details: {
    hasTitle: boolean
    hasDescription: boolean
    hasDescriptionMinLength: boolean
    hasDeadline: boolean
    hasAssignee: boolean
    hasClient: boolean
  }
}

export function calculateTaskCompleteness(task: {
  title?: string
  description?: string
  deadline?: Date | string | null
  assignedUserId?: string | null
  clientId?: string | null
}): TaskCompletenessResult {
  const details = {
    hasTitle: !!task.title && task.title.trim().length > 0,
    hasDescription: !!task.description && task.description.trim().length > 0,
    hasDescriptionMinLength: !!task.description && task.description.trim().length >= 50,
    hasDeadline: !!task.deadline,
    hasAssignee: !!task.assignedUserId,
    hasClient: !!task.clientId,
  }
  
  const missingFields: string[] = []
  
  if (!details.hasTitle) missingFields.push('title')
  if (!details.hasDescription) missingFields.push('description')
  if (details.hasDescription && !details.hasDescriptionMinLength) missingFields.push('description_min_length')
  if (!details.hasDeadline) missingFields.push('deadline')
  if (!details.hasAssignee) missingFields.push('assignedUserId')
  if (!details.hasClient) missingFields.push('clientId')
  
  const weights = {
    title: 15,
    description: 20,
    descriptionMinLength: 15,
    deadline: 20,
    assignee: 15,
    client: 15,
  }
  
  let score = 0
  if (details.hasTitle) score += weights.title
  if (details.hasDescription) score += weights.description
  if (details.hasDescriptionMinLength) score += weights.descriptionMinLength
  if (details.hasDeadline) score += weights.deadline
  if (details.hasAssignee) score += weights.assignee
  if (details.hasClient) score += weights.client
  
  return {
    score,
    missingFields,
    details,
  }
}

export interface WorkspaceCompletenessAnalysis {
  totalTasks: number
  averageScore: number
  incompleteTasks: Array<{
    id: string
    title: string
    score: number
    missingFields: string[]
  }>
  completeTasksCount: number
}

export function analyzeWorkspaceCompleteness(
  tasks: Array<{
    id: string
    title?: string
    description?: string
    deadline?: Date | string | null
    assignedUserId?: string | null
    clientId?: string | null
  }>
): WorkspaceCompletenessAnalysis {
  const results = tasks.map(task => ({
    id: task.id,
    title: task.title || 'Untitled',
    ...calculateTaskCompleteness(task),
  }))
  
  const totalScore = results.reduce((sum, r) => sum + r.score, 0)
  const averageScore = tasks.length > 0 ? Math.round(totalScore / tasks.length) : 0
  
  const incompleteTasks = results
    .filter(r => r.score < 90)
    .map(r => ({
      id: r.id,
      title: r.title,
      score: r.score,
      missingFields: r.missingFields,
    }))
    .sort((a, b) => a.score - b.score)
  
  const completeTasksCount = results.filter(r => r.score >= 90).length
  
  return {
    totalTasks: tasks.length,
    averageScore,
    incompleteTasks,
    completeTasksCount,
  }
}
