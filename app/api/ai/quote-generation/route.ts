export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { 
  generateQuoteFromText, 
  generateQuoteFromEnrichedData,
  enrichQuoteWithClientData, 
  type QuoteGenerationData 
} from "@/lib/ai-quote-service"
import type { EnrichedPromptData } from "@/components/quotes/prompt-enrichment-dialog"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"
import type { Client } from "@/lib/types"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

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
    
    // SECURITY: Only use server-verified userId and tenantId, ignore any client-sent identifiers

    console.log("🚀 Starting quote generation for tenant:", tenantId)
    
    let generatedQuote
    
    // Check if this is EnrichedPromptData (new deterministic flow) or old format
    if (body.projectType && body.sector) {
      // NEW DETERMINISTIC FLOW - EnrichedPromptData
      console.log("✅ Using NEW deterministic template-based flow")
      
      const enrichedData: EnrichedPromptData = {
        projectType: body.projectType,
        projectTypeLabel: body.projectTypeLabel,
        sector: body.sector,
        sectorLabel: body.sectorLabel,
        description: body.projectDescription || body.description,
        budgetRange: body.budgetRange || { min: 3000, max: 10000 },
        complexity: body.complexity || 'standard',
        timeline: body.timeline || '8-12 settimane',
        clientMode: body.clientMode || 'external',
        clientId: body.clientId,
        clientName: body.clientName,
        clientEmail: body.clientEmail,
        clientCompany: body.clientCompany,
        additionalNotes: body.additionalRequirements || body.additionalNotes,
        brandNames: Array.isArray(body.brandNames) ? body.brandNames : [],
        primaryBrandName: body.primaryBrandName,
        logoStatus: body.logoStatus,
        logoNotes: body.logoNotes,
        brandAssets: body.brandAssets,
        referenceMaterials: body.referenceMaterials,
        missingMaterials: Array.isArray(body.missingMaterials) ? body.missingMaterials : [],
        discoveryQuestions: Array.isArray(body.discoveryQuestions) ? body.discoveryQuestions : []
      }
      
      // Generate quote with deterministic template-based pricing
      generatedQuote = await generateQuoteFromEnrichedData(enrichedData, userId)
      
    } else {
      // OLD FLOW - QuoteGenerationData (backward compatibility)
      console.log("⚠️ Using OLD AI-based pricing flow (legacy)")
      
      const { projectDescription, clientName, clientEmail, clientCompany, budget, deadline, additionalRequirements } = body
      
      if (!projectDescription) {
        return NextResponse.json(
          { error: "Missing required field: projectDescription" },
          { status: 400 }
        )
      }

      const quoteData: QuoteGenerationData = {
        projectDescription,
        clientName,
        clientEmail, 
        clientCompany,
        budget,
        deadline,
        additionalRequirements
      }
      
      // Generate quote with old AI-based pricing
      generatedQuote = await generateQuoteFromText(quoteData, userId)
    }

    // Fetch existing clients to enrich data
    const clientsQuery = query(
      collection(db, "clients"),
      where("tenantId", "==", tenantId)
    )
    const clientsSnapshot = await getDocs(clientsQuery)
    const existingClients: Client[] = clientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Client))

    // Enrich quote with existing client data
    const enrichedQuote = await enrichQuoteWithClientData(generatedQuote, existingClients)

    return NextResponse.json({
      success: true,
      data: enrichedQuote
    })

  } catch (error: any) {
    console.error("❌ Quote generation API error:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause
    })
    
    const errorMessage = error?.message?.includes('fetch failed') || error?.message?.includes('network')
      ? "Errore di connessione con il servizio AI. Controlla la tua connessione e riprova."
      : error?.message?.includes('timeout') || error?.name === 'AbortError'
      ? "La generazione del preventivo ha richiesto troppo tempo. Riprova tra qualche istante."
      : "Errore durante la generazione del preventivo. Riprova tra qualche istante."
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}
