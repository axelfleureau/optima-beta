import { generateAIResponse, estimateTokens } from "./ai-service"
import type { Task, TaskOptimizationRequest, TaskOptimizationResponse, AIOptimizationCostEstimate } from "./types"

// System prompt for task optimization
const TASK_OPTIMIZATION_PROMPT = `Sei un esperto project manager e consulente di produttività. 
Il tuo compito è analizzare una lista di task e riordinarle in base a criteri di ottimizzazione specifici.

Considera sempre:
- Dipendenze tra task (operazioni bloccanti)
- Priorità e urgenza
- Scadenze
- Effort stimato vs impatto
- Flusso di lavoro ottimale
- Riduzione dei colli di bottiglia

Rispondi SEMPRE in formato JSON valido con questa struttura:
{
  "optimizedTasks": [array di task riordinati con nuovo ordine],
  "reasoning": "Spiegazione dettagliata del ragionamento utilizzato per il riordino"
}

Non aggiungere testo prima o dopo il JSON.`

// Function to estimate cost for task optimization
export function estimateOptimizationCost(tasks: Task[], optimizationType: string): AIOptimizationCostEstimate {
  // Create a simplified version of tasks for estimation
  const taskSummary = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    dueDate: task.dueDate,
    dependencies: task.dependencies || [],
    estimatedHours: task.estimatedHours,
  }))

  const prompt = createOptimizationPrompt(taskSummary, optimizationType)
  const estimatedTokens = estimateTokens(prompt) + 500 // Add buffer for response

  return {
    estimatedTokens,
    estimatedCost: `${Math.ceil(estimatedTokens / 1000)}K token`,
    taskCount: tasks.length,
    optimizationType,
  }
}

// Function to create optimization prompt
function createOptimizationPrompt(tasks: any[], optimizationType: string): string {
  const optimizationInstructions = {
    blocking_operations: `
    Priorità: OPERAZIONI BLOCCANTI
    - Identifica task che bloccano altre attività
    - Metti per prime le task che sbloccano il maggior numero di altre task
    - Considera le dipendenze tra task
    - Ottimizza per ridurre i tempi di attesa del team`,

    priority_based: `
    Priorità: IMPORTANZA E URGENZA
    - Usa la matrice di Eisenhower (Urgente/Importante)
    - Considera le scadenze e l'impatto sul business
    - Bilancia effort vs valore generato
    - Ottimizza per massimizzare il ROI`,

    deadline_focused: `
    Priorità: SCADENZE E TEMPISTICHE
    - Ordina per scadenze più vicine
    - Considera il tempo necessario per completare ogni task
    - Identifica il percorso critico
    - Ottimizza per rispettare tutte le deadline`,
  }

  return `${optimizationInstructions[optimizationType as keyof typeof optimizationInstructions]}

Task da ottimizzare:
${JSON.stringify(tasks, null, 2)}

Riordina le task secondo i criteri specificati e fornisci una spiegazione dettagliata.`
}

// Main function to optimize tasks using AI
export async function optimizeTasksWithAI(
  request: TaskOptimizationRequest,
  userId: string,
): Promise<TaskOptimizationResponse> {
  try {
    // Create simplified task data for AI processing
    const simplifiedTasks = request.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      dependencies: task.dependencies || [],
      estimatedHours: task.estimatedHours,
      clientName: task.clientName,
      tags: task.tags || [],
    }))

    const prompt = createOptimizationPrompt(simplifiedTasks, request.optimizationType)

    // Get AI response
    const aiResponse = await generateAIResponse(prompt, userId, TASK_OPTIMIZATION_PROMPT)

    // Parse AI response
    let parsedResponse
    try {
      // Clean the response text to extract JSON
      const jsonMatch = aiResponse.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No JSON found in AI response")
      }

      parsedResponse = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError)
      throw new Error("Errore nel parsing della risposta AI. Riprova.")
    }

    // Validate response structure
    if (!parsedResponse.optimizedTasks || !Array.isArray(parsedResponse.optimizedTasks)) {
      throw new Error("Risposta AI non valida: mancano le task ottimizzate")
    }

    // Map optimized task IDs back to full task objects with new order
    const optimizedTasks = parsedResponse.optimizedTasks
      .map((optimizedTask: any, index: number) => {
        const originalTask = request.tasks.find((t) => t.id === optimizedTask.id)
        if (!originalTask) {
          console.warn(`Task with ID ${optimizedTask.id} not found in original tasks`)
          return null
        }

        return {
          ...originalTask,
          score: index + 1, // Add score based on optimized order
        }
      })
      .filter(Boolean) as Task[]

    return {
      optimizedTasks,
      reasoning: parsedResponse.reasoning || "Ottimizzazione completata",
      estimatedTokens: estimateTokens(prompt),
      actualTokens: aiResponse.usage.totalTokens,
    }
  } catch (error) {
    console.error("Error optimizing tasks with AI:", error)
    throw error
  }
}

// Function to apply optimization results to tasks
export function applyOptimizationResults(
  originalTasks: Task[],
  optimizationResponse: TaskOptimizationResponse,
): Task[] {
  const optimizedTasksMap = new Map(optimizationResponse.optimizedTasks.map((task) => [task.id, task]))

  return originalTasks
    .map((task) => {
      const optimizedTask = optimizedTasksMap.get(task.id)
      if (optimizedTask) {
        return {
          ...task,
          score: optimizedTask.score,
        }
      }
      return task
    })
    .sort((a, b) => (a.score || 999) - (b.score || 999))
}
