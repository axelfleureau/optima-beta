import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AUTH")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const token = request.cookies.get("firebase-auth-token")?.value

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Verifica il token JWT Firebase
    const decodedToken = await verifyFirebaseToken(token)
    
    // Ottieni i dati dell'utente da Firestore
    const userData = await getUserData(decodedToken.uid)
    
    if (!userData) {
      // Token valido ma utente non trovato nel database
      return NextResponse.json({ user: null }, { status: 200 })
    }
    
    // Verifica che l'account non sia sospeso
    if (userData.isSuspended) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Restituisci i dati della sessione utente
    return NextResponse.json({ 
      user: {
        uid: decodedToken.uid,
        email: userData.email || decodedToken.email,
        displayName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || "user",
        tenantId: userData.tenantId || "",
        isSuspended: userData.isSuspended || false,
        companyName: userData.companyName
      }
    })

  } catch (error) {
    console.error("Session verification error:", error)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}