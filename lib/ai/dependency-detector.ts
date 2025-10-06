export interface TaskDependencyResult {
  taskId: string
  isBlocking: boolean
  blockedBy: string[]
  impactScore: number
  suggestedDependencies: Array<{
    taskId: string
    taskTitle: string
    reason: string
    confidence: number
  }>
}

export function analyzeExplicitDependencies(
  tasks: Array<{
    id: string
    title: string
    linkedTaskId?: string | null
  }>
): Map<string, { blockedBy: string[]; blocksCount: number }> {
  const dependencyMap = new Map<string, { blockedBy: string[]; blocksCount: number }>()
  
  tasks.forEach(task => {
    dependencyMap.set(task.id, { blockedBy: [], blocksCount: 0 })
  })
  
  tasks.forEach(task => {
    if (task.linkedTaskId) {
      const current = dependencyMap.get(task.id)!
      current.blockedBy.push(task.linkedTaskId)
      
      const linkedTask = dependencyMap.get(task.linkedTaskId)
      if (linkedTask) {
        linkedTask.blocksCount++
      }
    }
  })
  
  return dependencyMap
}

export async function detectImplicitDependencies(
  tasks: Array<{
    id: string
    title: string
    description?: string
  }>
): Promise<Array<{ fromTaskId: string; toTaskId: string; reason: string; confidence: number }>> {
  if (tasks.length === 0) return []
  
  try {
    const apiKey = process.env.OPENAI_API_KEY
    
    if (!apiKey || apiKey.trim() === '') {
      console.error('❌ OPENAI_API_KEY not configured')
      return []
    }

    const systemPrompt = `You are a task dependency analyzer. Given a list of tasks, identify potential dependencies between them based on their titles and descriptions.

A task A depends on task B if:
- Task A mentions completing B first
- Task A requires deliverables from B
- Task A references B's outcome or approval
- Task A is a follow-up to B

Return ONLY a JSON array with this structure:
[
  {
    "fromTaskId": "task that depends",
    "toTaskId": "task that is dependency",
    "reason": "Brief reason (max 50 chars)",
    "confidence": 0.8
  }
]

If no dependencies found, return empty array [].`

    const tasksContext = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description || '',
    }))
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Analyze these tasks:\n\n${JSON.stringify(tasksContext, null, 2)}` 
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ GPT-4 dependency detection error:', errorData)
      return []
    }

    const data = await response.json()
    
    if (!data.choices || data.choices.length === 0) {
      console.error('❌ No response from GPT-4')
      return []
    }

    const content = data.choices[0].message?.content?.trim() || '[]'
    
    let jsonContent = content
    if (content.includes('```')) {
      const match = content.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/)
      jsonContent = match ? match[1] : content
    }
    
    const dependencies = JSON.parse(jsonContent)
    return Array.isArray(dependencies) ? dependencies : []
    
  } catch (error) {
    console.error('❌ GPT-4 dependency detection error:', error)
    return []
  }
}

export async function analyzeTaskDependencies(
  tasks: Array<{
    id: string
    title: string
    description?: string
    linkedTaskId?: string | null
  }>
): Promise<TaskDependencyResult[]> {
  const explicitDeps = analyzeExplicitDependencies(tasks)
  
  const implicitDeps = await detectImplicitDependencies(tasks)
  
  const results: TaskDependencyResult[] = []
  
  tasks.forEach(task => {
    const explicit = explicitDeps.get(task.id)!
    const blockedBy = [...explicit.blockedBy]
    
    const implicitBlocking = implicitDeps
      .filter(dep => dep.fromTaskId === task.id)
      .map(dep => dep.toTaskId)
    
    blockedBy.push(...implicitBlocking)
    
    const suggestedDependencies = implicitDeps
      .filter(dep => dep.fromTaskId === task.id)
      .map(dep => {
        const depTask = tasks.find(t => t.id === dep.toTaskId)
        return {
          taskId: dep.toTaskId,
          taskTitle: depTask?.title || 'Unknown',
          reason: dep.reason,
          confidence: dep.confidence,
        }
      })
    
    const impactScore = explicit.blocksCount
    
    results.push({
      taskId: task.id,
      isBlocking: impactScore > 0,
      blockedBy: [...new Set(blockedBy)],
      impactScore,
      suggestedDependencies,
    })
  })
  
  return results
}
