import { initializeApp, getApps } from "firebase/app"
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyAEB8Vgc4C9iYLu02jdJ0AnQLNWVCmcSFE",
  authDomain: "optima-righello.firebaseapp.com",
  projectId: "optima-righello",
  storageBucket: "optima-righello.firebasestorage.app",
  messagingSenderId: "132734955127",
  appId: "1:132734955127:web:f6c1c83a5112c2f1736072",
  measurementId: "G-E76CNF7F11",
}

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

async function fixDatabaseStructure() {
  console.log("🔧 Starting database structure fix...")

  try {
    // 1. Fix tasks collection
    console.log("📝 Fixing tasks collection...")
    const tasksSnapshot = await getDocs(collection(db, "tasks"))

    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data()
      const updates: any = {}

      // Ensure all required fields exist
      if (!taskData.columnId) {
        updates.columnId = "to-do" // default column
      }

      if (!taskData.priority) {
        updates.priority = "medium" // default priority
      }

      if (!taskData.tags) {
        updates.tags = []
      }

      if (!taskData.attachments) {
        updates.attachments = []
      }

      if (!taskData.comments) {
        updates.comments = 0
      }

      if (!taskData.updatedAt) {
        updates.updatedAt = taskData.createdAt || new Date()
      }

      // Fix clientTenantId -> clientId if exists
      if (taskData.clientTenantId && !taskData.clientId) {
        updates.clientId = taskData.clientTenantId
        // Note: In a real migration, you'd need to map clientTenantId to actual client document IDs
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "tasks", taskDoc.id), updates)
        console.log(`✅ Updated task ${taskDoc.id}`)
      }
    }

    // 2. Fix users collection
    console.log("👤 Fixing users collection...")
    const usersSnapshot = await getDocs(collection(db, "users"))

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

      if (!userData.updatedAt) {
        updates.updatedAt = userData.createdAt || new Date()
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "users", userDoc.id), updates)
        console.log(`✅ Updated user ${userDoc.id}`)
      }
    }

    // 3. Fix clients collection
    console.log("🏢 Fixing clients collection...")
    const clientsSnapshot = await getDocs(collection(db, "clients"))

    for (const clientDoc of clientsSnapshot.docs) {
      const clientData = clientDoc.data()
      const updates: any = {}

      // Ensure status exists
      if (!clientData.status) {
        updates.status = "active"
      }

      // Ensure color exists
      if (!clientData.color) {
        const colors = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-yellow-500"]
        updates.color = colors[Math.floor(Math.random() * colors.length)]
      }

      if (!clientData.updatedAt) {
        updates.updatedAt = clientData.createdAt || new Date()
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, "clients", clientDoc.id), updates)
        console.log(`✅ Updated client ${clientDoc.id}`)
      }
    }

    console.log("✅ Database structure fix completed successfully!")
  } catch (error) {
    console.error("❌ Error fixing database structure:", error)
    throw error
  }
}

// Run the fix
if (typeof window === "undefined") {
  fixDatabaseStructure()
}

export { fixDatabaseStructure }
