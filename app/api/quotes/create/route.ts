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

const quoteVoiceSchema = z.object({
  descrizione: z.string().min(1, 'Descrizione richiesta'),
  quantita: z.number().positive().default(1),
  prezzoUnitario: z.number().nonnegative().default(0),
  totale: z.number().nonnegative().optional(),
  categoria: z.enum(['base', 'optional', 'recurring']).optional(),
  tipo: z.enum(['one_time', 'monthly', 'annual']).optional()
})

const brandMaterialiSchema = z.object({
  brandCoinvolti: z.array(z.string()).optional(),
  brandPrincipale: z.string().optional(),
  statoLogo: z.enum(['available', 'to_request', 'not_defined']).optional(),
  noteLogo: z.string().optional(),
  materialiDisponibili: z.string().optional(),
  riferimenti: z.string().optional(),
  materialiDaRichiedere: z.array(z.string()).optional(),
  domandeAperte: z.array(z.string()).optional()
}).optional()

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
  total: z.number().positive('Importo deve essere positivo').optional(),
  subtotale: z.number().nonnegative().optional(),
  iva: z.number().nonnegative().optional(),
  percentualeIva: z.number().nonnegative().optional(),
  brandMateriali: brandMaterialiSchema,
  obiettivi: z.array(z.string()).optional().default([]),
  attivita: z.array(z.string()).optional().default([]),
  voci: z.array(quoteVoiceSchema).optional().default([]),
  terminiCondizioni: z.string().optional(),
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

const stripUndefinedDeep = (value: unknown): unknown => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (value instanceof Date) return value
  if (typeof value === "object" && value !== null && Object.getPrototypeOf(value) !== Object.prototype && !Array.isArray(value)) {
    return value
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined)
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce((acc, [key, item]) => {
      const cleaned = stripUndefinedDeep(item)
      if (cleaned !== undefined) {
        acc[key] = cleaned
      }
      return acc
    }, {} as Record<string, unknown>)
  }
  return value
}

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
      subtotale,
      iva,
      percentualeIva,
      brandMateriali,
      obiettivi,
      attivita,
      voci,
      terminiCondizioni,
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

    const normalizedBrandMateriali = brandMateriali ? {
      brandCoinvolti: brandMateriali.brandCoinvolti || [],
      brandPrincipale: brandMateriali.brandPrincipale,
      statoLogo: brandMateriali.statoLogo,
      noteLogo: brandMateriali.noteLogo,
      materialiDisponibili: brandMateriali.materialiDisponibili,
      riferimenti: brandMateriali.riferimenti,
      materialiDaRichiedere: brandMateriali.materialiDaRichiedere || [],
      domandeAperte: brandMateriali.domandeAperte || []
    } : undefined

    const calculatedSubtotal = subtotale ?? items.reduce((sum, item) => sum + item.total, 0)
    const vatRate = percentualeIva ?? 22
    const calculatedVat = iva ?? Math.round(calculatedSubtotal * (vatRate / 100) * 100) / 100
    const calculatedTotal = total ?? Math.round((calculatedSubtotal + calculatedVat) * 100) / 100
    const normalizedVoci = voci.length > 0
      ? voci.map((voce) => ({
          ...voce,
          totale: voce.totale ?? Math.round(voce.quantita * voce.prezzoUnitario * 100) / 100
        }))
      : items.map((item) => ({
          descrizione: item.description || item.name,
          quantita: item.quantity,
          prezzoUnitario: item.unitPrice,
          totale: item.total,
          categoria: 'base' as const,
          tipo: 'one_time' as const
        }))
    
    // Build quote object based on client mode
    const baseQuote = {
      title,
      description: description || "",
      clientName: resolvedClientName,
      status: status || "draft",
      currency: currency || "EUR",
      items,
      total: calculatedTotal,
      subtotale: calculatedSubtotal,
      iva: calculatedVat,
      percentualeIva: vatRate,
      brandMateriali: normalizedBrandMateriali,
      obiettivi,
      attivita,
      voci: normalizedVoci,
      terminiCondizioni,
      validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days default
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
    const quoteForFirestore = stripUndefinedDeep({
      ...newQuote,
      createdAt: Timestamp.fromDate(newQuote.createdAt),
      updatedAt: Timestamp.fromDate(newQuote.updatedAt),
      validUntil: Timestamp.fromDate(newQuote.validUntil),
    }) as Record<string, unknown>

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
