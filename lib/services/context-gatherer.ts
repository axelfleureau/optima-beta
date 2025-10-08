import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc } from 'firebase/firestore'

export interface ExtendedContext {
  tenant?: {
    name?: string
    sector?: string
    style?: string
  }
  recentActivity?: Array<{
    name: string
    type: string
    completedAt?: Date
  }>
  existingAssets?: Array<{
    url: string
    format: string
  }>
}

export async function gatherExtendedContext(
  tenantId: string,
  taskId?: string
): Promise<ExtendedContext> {
  try {
    const context: ExtendedContext = {}

    const tenantDoc = await getDoc(doc(db, 'users', tenantId))
    if (tenantDoc.exists()) {
      const tenantData = tenantDoc.data()
      context.tenant = {
        name: tenantData.companyName,
        sector: tenantData.sector,
        style: tenantData.brandStyle
      }
    }

    const recentTasksQuery = query(
      collection(db, 'tasks'),
      where('tenantId', '==', tenantId),
      where('status', '==', 'done'),
      orderBy('updatedAt', 'desc'),
      limit(5)
    )
    const recentTasksSnapshot = await getDocs(recentTasksQuery)
    context.recentActivity = recentTasksSnapshot.docs.map(doc => ({
      name: doc.data().title,
      type: doc.data().projectType || 'task',
      completedAt: doc.data().updatedAt?.toDate()
    }))

    if (taskId) {
      const taskDoc = await getDoc(doc(db, 'tasks', taskId))
      if (taskDoc.exists()) {
        const taskData = taskDoc.data()
        context.existingAssets = (taskData.generatedAssets || []).map((asset: any) => ({
          url: asset.url,
          format: asset.format
        }))
      }
    }

    return context
  } catch (error) {
    console.error('Error gathering extended context:', error)
    return {}
  }
}
