import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

let admin: any = null

try {
  // Inizializza Firebase Admin se non è già stato fatto
  if (getApps().length === 0) {
    admin = initializeApp({
      credential: cert({
        projectId: "optima-righello",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: "https://optima-righello-default-rtdb.firebaseio.com"
    })
  } else {
    admin = getApps()[0]
  }
} catch (error) {
  console.error("Firebase Admin initialization error:", error)
}

export const adminAuth = admin ? getAuth(admin) : null
export const adminDb = admin ? getFirestore(admin) : null

// Helper function to verify Firebase ID token
export async function verifyFirebaseToken(token: string) {
  if (!adminAuth) {
    throw new Error("Firebase Admin not initialized")
  }
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error("Token verification error:", error)
    throw new Error("Invalid token")
  }
}

// Helper function to get user data from Firestore
export async function getUserData(uid: string) {
  if (!adminDb) {
    throw new Error("Firebase Admin DB not initialized")
  }
  
  try {
    const userDoc = await adminDb.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      throw new Error("User not found")
    }
    return userDoc.data()
  } catch (error) {
    console.error("Error fetching user data:", error)
    throw new Error("Failed to fetch user data")
  }
}