import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ valid: false, error: "No token provided" }, { status: 401 })
    }

    // Verifica il token JWT Firebase
    const decodedToken = await verifyFirebaseToken(token)
    
    // Ottieni i dati dell'utente per verificare il ruolo e lo stato
    const userData = await getUserData(decodedToken.uid)
    
    if (!userData) {
      return NextResponse.json({ valid: false, error: "User not found" }, { status: 404 })
    }
    
    // Verifica che l'account non sia sospeso
    if (userData.isSuspended) {
      return NextResponse.json({ valid: false, error: "Account suspended" }, { status: 403 })
    }

    return NextResponse.json({ 
      valid: true, 
      user: {
        uid: decodedToken.uid,
        role: userData.role || "user",
        tenantId: userData.tenantId || "",
        email: userData.email || decodedToken.email
      }
    })

  } catch (error) {
    console.error("Token verification error:", error)
    return NextResponse.json({ valid: false, error: "Invalid token" }, { status: 401 })
  }
}