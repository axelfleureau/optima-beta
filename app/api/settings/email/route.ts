export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from "next/server"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

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

export async function GET(request: NextRequest) {
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
      { error: "Utente non trovato" },
      { status: 404 }
    )
  }

  const userTenantId = userData.tenantId

  if (!userTenantId) {
    return NextResponse.json(
      { error: "Tenant ID non trovato per l'utente" },
      { status: 400 }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const requestedTenantId = searchParams.get("tenantId")

    if (requestedTenantId && requestedTenantId !== userTenantId) {
      return NextResponse.json(
        { error: "Accesso negato. Non puoi accedere alle impostazioni di altri tenant." },
        { status: 403 }
      )
    }

    const settingsDoc = await getDoc(doc(db, "email_settings", userTenantId))

    if (settingsDoc.exists()) {
      return NextResponse.json(settingsDoc.data())
    } else {
      return NextResponse.json({
        enabled: false,
        smtpHost: "",
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: "",
        smtpPass: "",
        fromEmail: "",
        fromName: "",
      })
    }
  } catch (error) {
    console.error("Error fetching email settings:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
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
      { error: "Utente non trovato" },
      { status: 404 }
    )
  }

  const userTenantId = userData.tenantId

  if (!userTenantId) {
    return NextResponse.json(
      { error: "Tenant ID non trovato per l'utente" },
      { status: 400 }
    )
  }

  try {
    const settings = await request.json()
    const { tenantId, ...emailSettings } = settings

    if (tenantId && tenantId !== userTenantId) {
      return NextResponse.json(
        { error: "Accesso negato. Non puoi modificare le impostazioni di altri tenant." },
        { status: 403 }
      )
    }

    await setDoc(doc(db, "email_settings", userTenantId), {
      ...emailSettings,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving email settings:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}
