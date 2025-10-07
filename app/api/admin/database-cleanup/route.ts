import { type NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps } from "firebase/app"
import { getFirestore, collection, getDocs, doc, query, orderBy, writeBatch } from "firebase/firestore"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const firebaseConfig = {
  apiKey: "AIzaSyAEB8Vgc4C9iYLu02jdJ0AnQLNWVCmcSFE",
  authDomain: "optima-righello.firebaseapp.com",
  projectId: "optima-righello",
  storageBucket: "optima-righello.firebasestorage.app",
  messagingSenderId: "132734955127",
  appId: "1:132734955127:web:f6c1c83a5112c2f1736072",
  measurementId: "G-E76CNF7F11",
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

async function verifyAuthToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const cookieToken = request.cookies.get("firebase-auth-token")?.value

    let token: string | null = null

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split("Bearer ")[1]
    } else if (cookieToken) {
      token = cookieToken
    }

    if (!token) {
      return null
    }

    const decodedToken = await verifyFirebaseToken(token)
    
    if (!decodedToken || !decodedToken.uid) {
      return null
    }

    return decodedToken
  } catch (error) {
    console.error("Error verifying auth token:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "DEFAULT")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  const authUser = await verifyAuthToken(request)
  if (!authUser) {
    return NextResponse.json(
      { error: "Non autenticato" },
      { status: 401 }
    )
  }

  const userData = await getUserData(authUser.uid)
  if (!userData) {
    return NextResponse.json(
      { error: "Dati utente non trovati" },
      { status: 404 }
    )
  }

  if (userData.role !== "super-admin") {
    return NextResponse.json(
      { error: "Accesso negato. Richiesti privilegi super-admin." },
      { status: 403 }
    )
  }

  try {
    const { operation } = await request.json()

    switch (operation) {
      case "fix-token-structure":
        return await fixTokenStructure()
      case "fix-users-data":
        return await fixUsersData()
      case "fix-tasks-structure":
        return await fixTasksStructure()
      case "remove-duplicates":
        return await removeDuplicates()
      case "full-cleanup":
        return await fullCleanup()
      default:
        return NextResponse.json({
          success: false,
          message: "Operazione non riconosciuta",
        })
    }
  } catch (error) {
    console.error("Database cleanup error:", error)
    return NextResponse.json({
      success: false,
      message: `Errore durante la pulizia: ${error instanceof Error ? error.message : "Errore sconosciuto"}`,
    })
  }
}

async function fixTokenStructure() {
  let usersUpdated = 0
  let aiUsageRecordsProcessed = 0

  // 1. Fix users collection - ensure proper token fields
  const usersSnapshot = await getDocs(collection(db, "users"))
  const batch = writeBatch(db)

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data()
    const updates: any = {}

    // Ensure token fields exist and are properly structured
    if (userData.aiTokensLimit === undefined) {
      updates.aiTokensLimit = userData.role === "client" ? 10000 : 1000000
    }

    if (userData.aiTokensUsed === undefined) {
      updates.aiTokensUsed = 0
    }

    // Remove fields that should be in ai_usage collection
    const fieldsToRemove = ["tokensInit", "currentPlan", "resetDate"]
    fieldsToRemove.forEach((field) => {
      if (userData[field] !== undefined) {
        updates[field] = null // Firestore way to delete field
      }
    })

    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, "users", userDoc.id), updates)
      usersUpdated++
    }
  }

  await batch.commit()

  // 2. Clean up ai_usage collection - remove user summary records
  const aiUsageSnapshot = await getDocs(collection(db, "ai_usage"))
  const cleanupBatch = writeBatch(db)

  for (const usageDoc of aiUsageSnapshot.docs) {
    const usageData = usageDoc.data()

    // Remove records that look like user summaries (have tokensInit, currentPlan, etc.)
    if (usageData.tokensInit || usageData.currentPlan || usageData.resetDate) {
      cleanupBatch.delete(doc(db, "ai_usage", usageDoc.id))
      aiUsageRecordsProcessed++
    }
  }

  await cleanupBatch.commit()

  return NextResponse.json({
    success: true,
    message: "Struttura token corretta con successo",
    details: { usersUpdated, aiUsageRecordsProcessed },
  })
}

async function fixUsersData() {
  let usersUpdated = 0
  const usersSnapshot = await getDocs(collection(db, "users"))
  const batch = writeBatch(db)

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data()
    const updates: any = {}

    // Ensure role exists
    if (!userData.role) {
      updates.role = userData.parentTenantId ? "client" : "admin"
    }

    // Ensure plan exists
    if (!userData.plan) {
      updates.plan = userData.role === "client" ? "client" : "180"
    }

    // Ensure AI tokens fields exist
    if (userData.aiTokensUsed === undefined) {
      updates.aiTokensUsed = 0
    }

    if (!userData.aiTokensLimit) {
      updates.aiTokensLimit = userData.role === "client" ? 10000 : 1000000
    }

    // Ensure timestamps exist
    if (!userData.updatedAt) {
      updates.updatedAt = userData.createdAt || new Date()
    }

    // Ensure status exists
    if (!userData.status) {
      updates.status = "active"
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, "users", userDoc.id), updates)
      usersUpdated++
    }
  }

  await batch.commit()

  return NextResponse.json({
    success: true,
    message: "Dati utenti corretti con successo",
    details: { usersUpdated },
  })
}

async function fixTasksStructure() {
  let tasksUpdated = 0
  const tasksSnapshot = await getDocs(collection(db, "tasks"))
  const batch = writeBatch(db)

  for (const taskDoc of tasksSnapshot.docs) {
    const taskData = taskDoc.data()
    const updates: any = {}

    // Ensure all required fields exist
    if (!taskData.columnId) {
      updates.columnId = "to-do"
    }

    if (!taskData.priority) {
      updates.priority = "medium"
    }

    if (!taskData.tags) {
      updates.tags = []
    }

    if (!taskData.attachments) {
      updates.attachments = []
    }

    if (taskData.comments === undefined) {
      updates.comments = 0
    }

    if (!taskData.updatedAt) {
      updates.updatedAt = taskData.createdAt || new Date()
    }

    if (!taskData.status) {
      updates.status = taskData.columnId === "done" ? "completed" : "active"
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, "tasks", taskDoc.id), updates)
      tasksUpdated++
    }
  }

  await batch.commit()

  return NextResponse.json({
    success: true,
    message: "Struttura task corretta con successo",
    details: { tasksUpdated },
  })
}

async function removeDuplicates() {
  let duplicatesRemoved = 0

  // Remove duplicate ai_usage records (same userId, feature, and close timestamps)
  const aiUsageSnapshot = await getDocs(query(collection(db, "ai_usage"), orderBy("createdAt", "desc")))

  const seen = new Set<string>()
  const batch = writeBatch(db)

  for (const usageDoc of aiUsageSnapshot.docs) {
    const data = usageDoc.data()
    const key = `${data.userId}-${data.feature}-${Math.floor(data.createdAt?.toDate?.()?.getTime() / 60000) || 0}`

    if (seen.has(key)) {
      batch.delete(doc(db, "ai_usage", usageDoc.id))
      duplicatesRemoved++
    } else {
      seen.add(key)
    }
  }

  await batch.commit()

  return NextResponse.json({
    success: true,
    message: "Duplicati rimossi con successo",
    details: { duplicatesRemoved },
  })
}

async function fullCleanup() {
  const results = []

  // Execute all cleanup operations in sequence
  const operations = [
    { name: "Token Structure", fn: fixTokenStructure },
    { name: "Users Data", fn: fixUsersData },
    { name: "Tasks Structure", fn: fixTasksStructure },
    { name: "Remove Duplicates", fn: removeDuplicates },
  ]

  let totalUpdates = 0

  for (const operation of operations) {
    try {
      const result = await operation.fn()
      const resultData = await result.json()
      results.push(`${operation.name}: ${resultData.message}`)

      if (resultData.details) {
        totalUpdates += Object.values(resultData.details).reduce(
          (sum: number, val) => sum + (typeof val === "number" ? val : 0),
          0,
        )
      }
    } catch (error) {
      results.push(`${operation.name}: Errore - ${error instanceof Error ? error.message : "Errore sconosciuto"}`)
    }
  }

  return NextResponse.json({
    success: true,
    message: `Pulizia completa terminata. ${totalUpdates} record aggiornati/processati.`,
    details: {
      operations: results.length,
      totalUpdates,
    },
  })
}
