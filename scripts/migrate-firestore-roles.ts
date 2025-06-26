// Script per migrare i dati esistenti in Firestore ai nuovi ruoli e struttura

import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from "firebase/firestore"

const firebaseConfig = {
  // Configurazione Firebase
  apiKey: "AIzaSyAEB8Vgc4C9iYLu02jdJ0AnQLNWVCmcSFE",
  authDomain: "optima-righello.firebaseapp.com",
  projectId: "optima-righello",
  storageBucket: "optima-righello.firebasestorage.app",
  messagingSenderId: "132734955127",
  appId: "1:132734955127:web:f6c1c83a5112c2f1736072",
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

async function migrateUserRoles() {
  console.log("🔄 Migrating user roles...")

  try {
    const usersSnapshot = await getDocs(collection(db, "users"))
    const batch = writeBatch(db)
    let updateCount = 0

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const updates: any = {}

      // Migra ruoli esistenti
      if (!userData.role || userData.role === "user") {
        // Se non ha ruolo o è "user", diventa "admin" (assumendo che gli utenti esistenti siano agenzie)
        updates.role = "admin"
      }

      // Aggiungi campi mancanti
      if (userData.role === "admin") {
        updates.parentTenantId = null // Gli admin non hanno parent
        updates.assignedClientIds = null // Gli admin non hanno assegnazioni specifiche
      }

      if (userData.role === "client") {
        // I client mantengono la struttura esistente
        if (!userData.parentTenantId) {
          console.warn(`Client ${userDoc.id} missing parentTenantId`)
        }
      }

      // Aggiungi flag sospensione se mancante
      if (userData.isSuspended === undefined) {
        updates.isSuspended = false
      }

      // Aggiungi limiti token se mancanti
      if (!userData.aiTokensUsed) {
        updates.aiTokensUsed = 0
      }
      if (!userData.aiTokensLimit) {
        updates.aiTokensLimit = userData.role === "admin" ? 1000000 : 50000
      }

      if (Object.keys(updates).length > 0) {
        batch.update(doc(db, "users", userDoc.id), {
          ...updates,
          updatedAt: new Date(),
        })
        updateCount++
      }
    }

    if (updateCount > 0) {
      await batch.commit()
      console.log(`✅ Updated ${updateCount} user documents`)
    } else {
      console.log("ℹ️ No user updates needed")
    }
  } catch (error) {
    console.error("❌ Error migrating user roles:", error)
  }
}

async function migrateTaskAssignments() {
  console.log("🔄 Migrating task assignments...")

  try {
    const tasksSnapshot = await getDocs(collection(db, "tasks"))
    const batch = writeBatch(db)
    let updateCount = 0

    for (const taskDoc of tasksSnapshot.docs) {
      const taskData = taskDoc.data()
      const updates: any = {}

      // Aggiungi assignedUserId se mancante
      if (!taskData.assignedUserId && taskData.assignee) {
        // Per ora, assegna al tenant owner (admin)
        updates.assignedUserId = taskData.tenantId
      }

      // Assicurati che tutti i campi array esistano
      if (!taskData.tags) {
        updates.tags = []
      }
      if (!taskData.attachments) {
        updates.attachments = []
      }
      if (!taskData.comments) {
        updates.comments = []
      }
      if (!taskData.subItems) {
        updates.subItems = []
      }

      if (Object.keys(updates).length > 0) {
        batch.update(doc(db, "tasks", taskDoc.id), {
          ...updates,
          updatedAt: new Date(),
        })
        updateCount++
      }
    }

    if (updateCount > 0) {
      await batch.commit()
      console.log(`✅ Updated ${updateCount} task documents`)
    } else {
      console.log("ℹ️ No task updates needed")
    }
  } catch (error) {
    console.error("❌ Error migrating task assignments:", error)
  }
}

async function createSuperAdmin() {
  console.log("🔄 Creating super admin user...")

  try {
    // Crea un super admin di esempio
    const superAdminId = "super-admin-righello"

    await updateDoc(doc(db, "users", superAdminId), {
      firstName: "Super",
      lastName: "Admin",
      email: "superadmin@righello.com",
      role: "super-admin",
      tenantId: superAdminId,
      parentTenantId: null,
      companyName: "Righello Platform",
      plan: "unlimited",
      isSuspended: false,
      aiTokensUsed: 0,
      aiTokensLimit: 999999999,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    console.log("✅ Super admin created/updated")
  } catch (error) {
    console.error("❌ Error creating super admin:", error)
  }
}

async function runMigration() {
  console.log("🚀 Starting Firestore migration for roles and permissions...")

  try {
    await migrateUserRoles()
    await migrateTaskAssignments()
    await createSuperAdmin()

    console.log("🎉 Migration completed successfully!")
  } catch (error) {
    console.error("💥 Migration failed:", error)
  }
}

// Esegui la migrazione
runMigration()
