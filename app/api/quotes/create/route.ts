import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp } from "firebase/firestore"

const quoteItemSchema = z.object({
  name: z.string().min(1, 'Nome richiesto'),
  description: z.string().optional(),
  quantity: z.number().int().positive('Quantità deve essere positiva'),
  unitPrice: z.number().positive('Prezzo deve essere positivo'),
  total: z.number().positive()
})

const createQuoteSchema = z.object({
  title: z.string().min(1, 'Titolo richiesto').max(200),
  description: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  status: z.enum(['draft', 'sent', 'approved', 'rejected']).optional(),
  currency: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, 'Almeno un item richiesto'),
  total: z.number().positive('Importo deve essere positivo'),
  validUntil: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    // Get Firebase auth token from cookies
    const authToken = request.cookies.get("firebase-auth-token")?.value

    if (!authToken) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    // Verify Firebase token and get authenticated user
    const decodedToken = await verifyFirebaseToken(authToken)
    const userData = await getUserData(decodedToken.uid)

    if (!userData) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    if (userData.isSuspended) {
      return NextResponse.json(
        { error: "Account suspended" },
        { status: 403 }
      )
    }

    const userId = decodedToken.uid
    const tenantId = userData.tenantId

    if (!tenantId) {
      return NextResponse.json(
        { error: "User tenant not found" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validatedData = createQuoteSchema.parse(body)
    const { title, description, clientId, clientName, status, currency, items, total, validUntil } = validatedData

    // SECURITY: Use only server-verified tenantId and userId, ignore any client-sent identifiers
    const now = Timestamp.now()
    const newQuote = {
      title,
      description: description || "",
      clientId: clientId || "",
      clientName: clientName || "",
      status: status || "draft",
      currency: currency || "EUR",
      items,
      total,
      validUntil: validUntil ? Timestamp.fromDate(new Date(validUntil)) : Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days default
      tenantId, // Server-verified only
      createdBy: userId, // Server-verified only
      createdAt: now,
      updatedAt: now,
    }

    console.log("🔒 Creating quote with server-verified tenant:", tenantId)

    const docRef = await addDoc(collection(db, "quotes"), newQuote)

    return NextResponse.json({
      success: true,
      id: docRef.id
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dati non validi', 
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    console.error("❌ Quote creation API error:", error)
    return NextResponse.json(
      { 
        error: "Errore durante la creazione del preventivo",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}