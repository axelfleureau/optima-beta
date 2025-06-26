import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAEB8Vgc4C9iYLu02jdJ0AnQLNWVCmcSFE",
  authDomain: "optima-righello.firebaseapp.com",
  projectId: "optima-righello",
  storageBucket: "optima-righello.firebasestorage.app",
  messagingSenderId: "132734955127",
  appId: "1:132734955127:web:f6c1c83a5112c2f1736072",
  measurementId: "G-E76CNF7F11",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

export { auth, db, storage }
