import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Task } from '@/lib/types'

export async function findTaskByName(
  taskName: string, 
  tenantId: string
): Promise<string | null> {
  try {
    const tasksRef = collection(db, 'tasks')
    const q = query(tasksRef, where('tenantId', '==', tenantId))
    const snapshot = await getDocs(q)
    
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Task[]
    
    const normalizedSearchTerm = taskName.toLowerCase().trim()
    
    const bestMatch = tasks.find(task => 
      task.title?.toLowerCase().includes(normalizedSearchTerm) ||
      task.description?.toLowerCase().includes(normalizedSearchTerm)
    )
    
    return bestMatch?.id || null
  } catch (error) {
    console.error('Error finding task by name:', error)
    return null
  }
}

export async function getTaskById(taskId: string): Promise<Task | null> {
  try {
    const { doc, getDoc } = await import('firebase/firestore')
    const taskRef = doc(db, 'tasks', taskId)
    const taskSnap = await getDoc(taskRef)
    
    if (taskSnap.exists()) {
      return { id: taskSnap.id, ...taskSnap.data() } as Task
    }
    
    return null
  } catch (error) {
    console.error('Error getting task by id:', error)
    return null
  }
}
