// Script per pulire e organizzare i dati dei token nel database
import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch, deleteDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAEB8Vgc4C9iYLu02jdJ0AnQLNWVCmcSFE",
  authDomain: "optima-righello.firebaseapp.com",
  projectId: "optima-righello",
  storageBucket: "optima-righello.firebasestorage.app",
  messagingSenderId: "132734955127",
  appId: "1:132734955127:web:f6c1c83a5112c2f1736072",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function cleanupTokenData() {
  console.log("🧹 Cleaning up token data structure...")

  try {
    // 1. Pulisci la collezione users - mantieni solo i dati essenziali sui token
    console.log("📝 Cleaning users collection...")
    const usersSnapshot = await getDocs(collection(db, "users"))
    const usersBatch = writeBatch(db)
    let usersUpdated = 0

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const updates: any = {}

      // Assicurati che gli admin abbiano i campi token corretti
      if (userData.role === "admin" || userData.role === "super-admin") {
        // Mantieni solo aiTokensUsed e aiTokensLimit
        if (typeof userData.aiTokensUsed !== 'number') {
          updates.aiTokensUsed = userData.tokensUsed || 0
        }
        if (typeof userData.aiTokensLimit !== 'number') {
          updates.aiTokensLimit = userData.tokensInit || userData.tokensLimit || 1000000
        }

        // Rimuovi campi obsoleti se esistono
        const fieldsToRemove = ['tokensUsed', 'tokensInit', 'tokensLimit', 'currentPlan', 'resetDate']
        fieldsToRemove.forEach(field => {
          if (userData[field] !== undefined) {
            updates[field] = null // Firestore rimuove i campi null
          }
        })
      } else {
        // Per user e client, rimuovi tutti i campi token (usano quelli dell'admin)
        const tokenFields = ['aiTokensUsed', 'aiTokensLimit', 'tokensUsed', 'tokensInit', 'tokensLimit', 'currentPlan', 'resetDate']
        tokenFields.forEach(field => {
          if (userData[field] !== undefined) {
            updates[field] = null
          }
        })
      }

      if (Object.keys(updates).length > 0) {
        usersBatch.update(doc(db, "users", userDoc.id), {
          ...updates,
          updatedAt: new Date(),
        })
        usersUpdated++
      }
    }

    if (usersUpdated > 0) {
      await usersBatch.commit()
      console.log(`✅ Updated ${usersUpdated} user documents`)
    }

    // 2. Pulisci la collezione ai_usage - mantieni solo i log di utilizzo
    console.log("📝 Cleaning ai_usage collection...")
    const aiUsageSnapshot = await getDocs(collection(db, "ai_usage"))
    const aiUsageBatch = writeBatch(db)
    let aiUsageUpdated = 0
    let aiUsageDeleted = 0

    for (const usageDoc of aiUsageSnapshot.docs) {
      const usageData = usageDoc.data()

      // Se il documento contiene dati che dovrebbero essere in users, eliminalo
      if (usageData.tokensInit || usageData.tokensLimit || usageData.currentPlan) {
        aiUsageBatch.delete(doc(db, "ai_usage", usageDoc.id))
        aiUsageDeleted++
        continue
      }

      // Assicurati che i documenti di utilizzo abbiano la struttura corretta
      const updates: any = {}
      
      if (!usageData.adminId && usageData.userId) {
        // Se manca adminId, prova a dedurlo dall'userId
        updates.adminId = usageData.userId // Temporaneo, dovrebbe essere corretto dal token-service
      }

      if (!usageData.feature && usageData.promptType) {
        updates.feature = usageData.promptType
      }

      if (!usageData.tokensUsed && usageData.tokens) {
        updates.tokensUsed = usageData.tokens
      }

      // Rimuovi campi obsoleti
      const fieldsToRemove = ['tokens', 'promptType', 'prompt']
      fieldsToRemove.forEach(field => {
        if (usageData[field] !== undefined) {
          updates[field] = null
        }
      })

      if (Object.keys(updates).length > 0) {
        aiUsageBatch.update(doc(db, "ai_usage", usageDoc.id), updates)
        aiUsageUpdated++
      }
    }

    if (aiUsageUpdated > 0 || aiUsageDeleted > 0) {
      await aiUsageBatch.commit()
      console.log(`✅ Updated ${aiUsageUpdated} and deleted ${aiUsageDeleted} ai_usage documents`)
    }

    // 3. Verifica la coerenza dei dati
    console.log("🔍 Verifying data consistency...")
    
    const adminUsers = await getDocs(collection(db, "users"))
    for (const adminDoc of adminUsers.docs) {
      const adminData = adminDoc.data()
      
      if (adminData.role === "admin" || adminData.role === "super-admin") {
        // Calcola il totale dei token utilizzati dalla collezione ai_usage
        const adminUsageSnapshot = await getDocs(collection(db, "ai_usage"))
        let calculatedTokens = 0
        
        adminUsageSnapshot.forEach(usageDoc => {
          const usageData = usageDoc.data()
          if (usageData.adminId === adminDoc.id) {
            calculatedTokens += usageData.tokensUsed || 0
          }
        })

        const currentTokens = adminData.aiTokensUsed || 0
        
        console.log(`Admin ${adminDoc.id}: DB tokens: ${currentTokens}, Calculated: ${calculatedTokens}`)
        
        // Se c'è una grande discrepanza, aggiorna
        if (Math.abs(currentTokens - calculatedTokens) > 100) {
          await updateDoc(doc(db, "users", adminDoc.id), {
            aiTokensUsed: calculatedTokens,
            updatedAt: new Date()
          })
          console.log(`🔧 Fixed token count for admin ${adminDoc.id}: ${currentTokens} → ${calculatedTokens}`)
        }
      }
    }

    console.log("🎉 Token data cleanup completed successfully!")

  } catch (error) {
    console.error("💥 Error during cleanup:", error)
  }
}

// Esegui la pulizia
cleanupTokenData()