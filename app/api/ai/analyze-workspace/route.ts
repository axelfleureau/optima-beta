import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { DecodedIdToken } from 'firebase-admin/auth'
import { analyzeWorkspaceCompleteness } from '@/lib/ai/completeness-scorer'
import { analyzeTaskDependencies } from '@/lib/ai/dependency-detector'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split('Bearer ')[1]
    let decodedToken: DecodedIdToken
    try {
      if (!adminAuth) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
      }
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const userId = decodedToken.uid
    const tenantId = (decodedToken as any).tenant_id || userId
    
    if (!adminDb) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const tasksSnapshot = await adminDb
      .collection('tasks')
      .where('tenantId', '==', tenantId)
      .get()
    
    const tasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title || '',
      description: doc.data().description || '',
      deadline: doc.data().deadline?.toDate ? doc.data().deadline.toDate() : (doc.data().dueDate?.toDate ? doc.data().dueDate.toDate() : null),
      assignedUserId: doc.data().assignedUserId || doc.data().assignedTo || null,
      clientId: doc.data().clientId || null,
      linkedTaskId: doc.data().linkedTaskId || null,
    }))
    
    if (tasks.length === 0) {
      return NextResponse.json({
        success: true,
        insights: {
          completeness: {
            totalTasks: 0,
            averageScore: 0,
            incompleteTasks: [],
            completeTasksCount: 0,
          },
          dependencies: [],
          suggestions: [],
        },
      })
    }
    
    const completenessAnalysis = analyzeWorkspaceCompleteness(tasks)
    
    const dependencyAnalysis = await analyzeTaskDependencies(tasks)
    
    const suggestions = []
    
    if (completenessAnalysis.incompleteTasks.length > 0) {
      const topIncomplete = completenessAnalysis.incompleteTasks.slice(0, 5)
      suggestions.push({
        type: 'incomplete_tasks',
        priority: 'high',
        title: `${completenessAnalysis.incompleteTasks.length} task con dati mancanti`,
        description: `Completa i dati per: ${topIncomplete.map(t => t.title).join(', ')}`,
        actionable: true,
        tasks: topIncomplete.map(t => ({ id: t.id, title: t.title, score: t.score })),
      })
    }
    
    const blockingTasks = dependencyAnalysis.filter(d => d.isBlocking && d.impactScore > 0)
    if (blockingTasks.length > 0) {
      suggestions.push({
        type: 'blocking_tasks',
        priority: 'medium',
        title: `${blockingTasks.length} task bloccanti trovate`,
        description: `Prioritizza il completamento di queste task`,
        actionable: true,
        tasks: blockingTasks
          .sort((a, b) => b.impactScore - a.impactScore)
          .slice(0, 5)
          .map(d => {
            const task = tasks.find(t => t.id === d.taskId)
            return {
              id: d.taskId,
              title: task?.title || 'Unknown',
              impactScore: d.impactScore,
            }
          }),
      })
    }
    
    const implicitDeps = dependencyAnalysis
      .filter(d => d.suggestedDependencies.length > 0)
      .slice(0, 3)
    
    if (implicitDeps.length > 0) {
      suggestions.push({
        type: 'suggested_dependencies',
        priority: 'low',
        title: 'Dipendenze suggerite dall\'AI',
        description: 'Considera di collegare queste task',
        actionable: false,
        dependencies: implicitDeps.flatMap(d => 
          d.suggestedDependencies.map(s => ({
            fromTaskId: d.taskId,
            toTaskId: s.taskId,
            toTaskTitle: s.taskTitle,
            reason: s.reason,
            confidence: s.confidence,
          }))
        ),
      })
    }
    
    return NextResponse.json({
      success: true,
      insights: {
        completeness: completenessAnalysis,
        dependencies: dependencyAnalysis,
        suggestions,
      },
    })
    
  } catch (error) {
    console.error('Workspace analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
