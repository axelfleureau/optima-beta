import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit, QueryConstraint } from "firebase/firestore"
import type { RAGQueryPlan } from "./rag-query-planner"

export interface RAGDataRetrieverResponse {
  success: boolean
  data: any[]
  count: number
  collectionQueried: string
  error?: string
}

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000

function getCacheKey(queryPlan: RAGQueryPlan): string {
  return JSON.stringify({
    collection: queryPlan.collection,
    filters: queryPlan.filters,
    fields: queryPlan.fields,
    limit: queryPlan.limit,
  })
}

function getCachedData(cacheKey: string): any[] | null {
  const cached = cache.get(cacheKey)
  if (!cached) return null
  
  const now = Date.now()
  if (now - cached.timestamp > CACHE_TTL) {
    cache.delete(cacheKey)
    return null
  }
  
  return cached.data
}

function setCachedData(cacheKey: string, data: any[]): void {
  cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  })
}

export async function retrieveData(
  queryPlan: RAGQueryPlan
): Promise<RAGDataRetrieverResponse> {
  try {
    console.log('🔍 RAG Data Retriever: Executing query plan', queryPlan)
    
    const cacheKey = getCacheKey(queryPlan)
    const cachedData = getCachedData(cacheKey)
    
    if (cachedData) {
      console.log('✅ Returning cached data', cachedData.length, 'records')
      return {
        success: true,
        data: cachedData,
        count: cachedData.length,
        collectionQueried: queryPlan.collection,
      }
    }
    
    const constraints: QueryConstraint[] = []
    
    Object.entries(queryPlan.filters).forEach(([field, value]) => {
      if (value === undefined || value === null) return
      
      if (typeof value === 'string') {
        if (value.startsWith('>=')) {
          constraints.push(where(field, '>=', value.substring(2)))
        } else if (value.startsWith('<=')) {
          constraints.push(where(field, '<=', value.substring(2)))
        } else if (value.startsWith('>')) {
          constraints.push(where(field, '>', value.substring(1)))
        } else if (value.startsWith('<')) {
          if (value === '<TODAY') {
            const today = new Date().toISOString().split('T')[0]
            constraints.push(where(field, '<', today))
          } else {
            constraints.push(where(field, '<', value.substring(1)))
          }
        } else {
          constraints.push(where(field, '==', value))
        }
      } else if (Array.isArray(value)) {
        constraints.push(where(field, 'in', value))
      } else {
        constraints.push(where(field, '==', value))
      }
    })
    
    if (queryPlan.orderBy) {
      constraints.push(
        orderBy(queryPlan.orderBy.field, queryPlan.orderBy.direction)
      )
    }
    
    constraints.push(limit(queryPlan.limit || 50))
    
    const q = query(collection(db, queryPlan.collection), ...constraints)
    const snapshot = await getDocs(q)
    
    console.log(`✅ Query executed: ${snapshot.docs.length} records found`)
    
    const data = snapshot.docs.map(doc => {
      const fullData: Record<string, any> = { id: doc.id, ...doc.data() }
      
      if (queryPlan.fields && queryPlan.fields.length > 0) {
        const filtered: any = {}
        queryPlan.fields.forEach(field => {
          if (fullData[field] !== undefined) {
            if (fullData[field]?.toDate) {
              filtered[field] = fullData[field].toDate().toISOString().split('T')[0]
            } else if (fullData[field] instanceof Date) {
              filtered[field] = fullData[field].toISOString().split('T')[0]
            } else {
              filtered[field] = fullData[field]
            }
          }
        })
        return filtered
      }
      
      Object.keys(fullData).forEach(key => {
        if (fullData[key]?.toDate) {
          fullData[key] = fullData[key].toDate().toISOString().split('T')[0]
        } else if (fullData[key] instanceof Date) {
          fullData[key] = fullData[key].toISOString().split('T')[0]
        }
      })
      
      return fullData
    })
    
    setCachedData(cacheKey, data)
    
    return {
      success: true,
      data,
      count: data.length,
      collectionQueried: queryPlan.collection,
    }
  } catch (error) {
    console.error('❌ Error retrieving data:', error)
    return {
      success: false,
      data: [],
      count: 0,
      collectionQueried: queryPlan.collection,
      error: error instanceof Error ? error.message : 'Errore sconosciuto',
    }
  }
}
