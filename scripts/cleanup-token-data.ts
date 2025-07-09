import { initializeApp, getApps } from "firebase/app"
import { getFirestore, collection, getDocs, doc, writeBatch, query, where } from "firebase/firestore"

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

export async function cleanupTokenData() {
  console.log("🧹 Starting token data cleanup...")

  try {
    let usersUpdated = 0
    let aiUsageRecordsProcessed = 0
    let duplicatesRemoved = 0

    // 1. Clean up users collection
    console.log("👤 Processing users collection...")
    const usersSnapshot = await getDocs(collection(db, "users"))
    const usersBatch = writeBatch(db)

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const updates: any = {}

      // Ensure proper token fields structure
      if (userData.aiTokensLimit === undefined) {
        updates.aiTokensLimit = userData.role === "client" ? 10000 : 1000000
      }

      if (userData.aiTokensUsed === undefined) {
        updates.aiTokensUsed = 0
      }

      // Remove fields that belong in ai_usage collection
      const fieldsToRemove = ["tokensInit", "currentPlan", "resetDate"]
      let hasFieldsToRemove = false

      fieldsToRemove.forEach((field) => {
        if (userData[field] !== undefined) {
          hasFieldsToRemove = true
        }
      })

      if (Object.keys(updates).length > 0 || hasFieldsToRemove) {
        // For removing fields in Firestore, we need to use FieldValue.delete()
        // But since we're in a script, we'll handle this differently
        if (hasFieldsToRemove) {
          console.log(`⚠️  User ${userDoc.id} has fields that should be removed manually`)
        }

        if (Object.keys(updates).length > 0) {
          usersBatch.update(doc(db, "users", userDoc.id), updates)
          usersUpdated++
        }
      }
    }

    await usersBatch.commit()
    console.log(`✅ Updated ${usersUpdated} users`)

    // 2. Clean up ai_usage collection
    console.log("🤖 Processing ai_usage collection...")
    const aiUsageSnapshot = await getDocs(collection(db, "ai_usage"))
    const aiUsageBatch = writeBatch(db)

    const validUsageRecords = []
    const recordsToDelete = []

    for (const usageDoc of aiUsageSnapshot.docs) {
      const usageData = usageDoc.data()
      aiUsageRecordsProcessed++

      // Check if this is a user summary record (should be deleted)
      if (usageData.tokensInit || usageData.currentPlan || usageData.resetDate) {
        recordsToDelete.push(usageDoc.id)
        continue
      }

      // Check if this is a valid usage record
      if (usageData.userId && usageData.tokensUsed && usageData.createdAt) {
        validUsageRecords.push({
          id: usageDoc.id,
          ...usageData,
        })
      } else {
        // Invalid record, mark for deletion
        recordsToDelete.push(usageDoc.id)
      }
    }

    // Delete invalid records
    for (const recordId of recordsToDelete) {
      aiUsageBatch.delete(doc(db, "ai_usage", recordId))
      duplicatesRemoved++
    }

    await aiUsageBatch.commit()
    console.log(`🗑️  Removed ${duplicatesRemoved} invalid ai_usage records`)

    // 3. Remove duplicate usage records
    console.log("🔍 Removing duplicate usage records...")
    const duplicatesBatch = writeBatch(db)
    const seen = new Set<string>()
    let additionalDuplicates = 0

    // Sort valid records by timestamp to keep the most recent
    validUsageRecords.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.()?.getTime() || 0
      const bTime = b.createdAt?.toDate?.()?.getTime() || 0
      return bTime - aTime // Most recent first
    })

    for (const record of validUsageRecords) {
      // Create a key based on userId, feature, and minute-level timestamp
      const timestamp = record.createdAt?.toDate?.()?.getTime() || 0
      const minuteTimestamp = Math.floor(timestamp / 60000) // Round to minute
      const key = `${record.userId}-${record.feature}-${minuteTimestamp}`

      if (seen.has(key)) {
        duplicatesBatch.delete(doc(db, "ai_usage", record.id))
        additionalDuplicates++
      } else {
        seen.add(key)
      }
    }

    await duplicatesBatch.commit()
    console.log(`🔄 Removed ${additionalDuplicates} additional duplicate records`)

    // 4. Recalculate user token usage based on clean ai_usage records
    console.log("🔢 Recalculating user token usage...")
    const recalcBatch = writeBatch(db)
    let usersRecalculated = 0

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id

      // Get all valid usage records for this user
      const userUsageQuery = query(collection(db, "ai_usage"), where("userId", "==", userId))
      const userUsageSnapshot = await getDocs(userUsageQuery)

      let totalTokensUsed = 0
      userUsageSnapshot.forEach((doc) => {
        const data = doc.data()
        totalTokensUsed += data.tokensUsed || 0
      })

      // Update user's token count
      recalcBatch.update(doc(db, "users", userId), {
        aiTokensUsed: totalTokensUsed,
        updatedAt: new Date(),
      })
      usersRecalculated++
    }

    await recalcBatch.commit()
    console.log(`🔄 Recalculated tokens for ${usersRecalculated} users`)

    console.log("✅ Token data cleanup completed successfully!")
    console.log(`📊 Summary:
    - Users updated: ${usersUpdated}
    - AI usage records processed: ${aiUsageRecordsProcessed}
    - Invalid records removed: ${duplicatesRemoved}
    - Additional duplicates removed: ${additionalDuplicates}
    - Users recalculated: ${usersRecalculated}`)

    return {
      success: true,
      usersUpdated,
      aiUsageRecordsProcessed,
      duplicatesRemoved: duplicatesRemoved + additionalDuplicates,
      usersRecalculated,
    }
  } catch (error) {
    console.error("❌ Error during token data cleanup:", error)
    throw error
  }
}

// Run the cleanup if called directly
if (typeof window === "undefined") {
  cleanupTokenData().catch(console.error)
}
