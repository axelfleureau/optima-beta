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
        clientName: body.clientName,
        clientEmail: body.clientEmail,
        clientCompany: body.clientCompany,
        additionalNotes: body.additionalRequirements || body.additionalNotes
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

  } catch (error) {
    console.error("❌ Quote generation API error:", error)
    return NextResponse.json(
      { 
        error: "Failed to generate quote",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}