export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyFirebaseToken, getUserData, adminDb } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp } from "firebase/firestore"
import { validateQuoteClientMode } from "@/types/quote"

const quoteItemSchema = z.object({
  name: z.string().min(1, 'Nome richiesto'),
  description: z.string().optional(),
  quantity: z.number().int().positive('Quantità deve essere positiva'),
  unitPrice: z.number().positive('Prezzo deve essere positivo'),
  total: z.number().positive()
})

// DUAL CLIENT MODE: Support both platform clients (clientId) and external clients (name+email)
const createQuoteSchema = z.object({
  title: z.string().min(1, 'Titolo richiesto').max(200),
  description: z.string().optional(),
  
  // Platform Client fields
  clientId: z.string().optional(),
  
  // External Client fields
  externalClientName: z.string().optional(),
  externalClientEmail: z.string().email('Email non valida').optional(),
  
  // Common fields
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  status: z.enum(['draft', 'sent', 'approved', 'rejected']).optional(),
  currency: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, 'Almeno un item richiesto'),
  total: z.number().positive('Importo deve essere positivo'),
  validUntil: z.string().optional()
}).refine(
  (data) => {
    // Must have EITHER clientId OR (externalClientName + externalClientEmail)
    const hasPlatformClient = !!data.clientId
    const hasExternalClient = !!(data.externalClientName && data.externalClientEmail)
    return hasPlatformClient || hasExternalClient
  },
  {
    message: "Quote must have either clientId (platform client) or externalClientName + externalClientEmail (external client)"
  }
).refine(
  (data) => {
    // Cannot have BOTH modes
    const hasPlatformClient = !!data.clientId
    const hasExternalClient = !!(data.externalClientName && data.externalClientEmail)
    return !(hasPlatformClient && hasExternalClient)
  },
  {
    message: "Quote cannot have both clientId and external client data. Choose one client mode."
  }
)

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
    const { 
      title, 
      description, 
      clientId, 
      externalClientName,
      externalClientEmail,
      clientName, 
      clientEmail,
      status, 
      currency, 
      items, 
      total, 
      validUntil 
    } = validatedData

    // SECURITY: Use only server-verified tenantId and userId, ignore any client-sent identifiers
    const now = new Date()
    
    // Fetch platform client data if clientId is provided
    let resolvedClientName = clientName || externalClientName || ""
    let resolvedClientEmail = clientEmail || externalClientEmail || ""

    if (clientId) {
      try {
        const clientDoc = await adminDb!.collection('clients').doc(clientId).get()
        if (clientDoc.exists) {
          const clientData = clientDoc.data()
          resolvedClientName = clientData?.name || clientData?.companyName || resolvedClientName || "N/A"
          resolvedClientEmail = clientData?.email || resolvedClientEmail || ""
        } else {
          console.warn(`⚠️ Platform client ${clientId} not found in Firestore, using fallback name`)
          resolvedClientName = resolvedClientName || "Cliente Piattaforma"
        }
      } catch (error) {
        console.error(`❌ Failed to fetch platform client ${clientId}:`, error)
        resolvedClientName = resolvedClientName || "Cliente Piattaforma"
      }
    }
    
    // Build quote object based on client mode
    const baseQuote = {
      title,
      description: description || "",
      clientName: resolvedClientName,
      status: status || "draft",
      currency: currency || "EUR",
      items,
      total,
      validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      tenantId, // Server-verified only
      createdBy: userId, // Server-verified only
      createdAt: now,
      updatedAt: now,
    }

    // Add client mode specific fields
    const newQuote = clientId 
      ? {
          ...baseQuote,
          clientId,
          clientEmail: resolvedClientEmail
        }
      : {
          ...baseQuote,
          externalClientName,
          externalClientEmail,
          clientEmail: externalClientEmail
        }

    // Final validation using helper
    const validation = validateQuoteClientMode(newQuote)
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    console.log("🔒 Creating quote with server-verified tenant:", tenantId, 
                clientId ? `(Platform Client: ${clientId})` : `(External Client: ${externalClientName})`)

    // Convert Date fields to Firestore Timestamp before saving
    const quoteForFirestore = {
      ...newQuote,
      createdAt: Timestamp.fromDate(newQuote.createdAt),
      updatedAt: Timestamp.fromDate(newQuote.updatedAt),
      validUntil: Timestamp.fromDate(newQuote.validUntil),
    }

    const docRef = await addDoc(collection(db, "quotes"), quoteForFirestore)

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