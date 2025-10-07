import type { NextRequest } from "next/server"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { getOrganizationAdminId, logTokenUsage, estimateTokens } from "@/lib/token-service"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const PhaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  rationale: z.string(),
  checklist: z.array(z.string()),
  warnings: z.array(z.string()).optional(),
  estimatedHours: z.number(),
  dependencies: z.array(z.string()).optional(),
})

const BreakdownSchema = z.object({
  isComplex: z.boolean(),
  complexity: z.enum(["simple", "moderate", "complex"]),
  phases: z.array(PhaseSchema),
  totalEstimatedHours: z.number(),
  recommendedApproach: z.string(),
})

const SYSTEM_PROMPT = `Sei un Technical Architect senior per agenzie di servizi.
Analizza task e decomponile in fasi professionali, educando l'utente sul "perché" di ogni step.

CONTESTO AGENCY:
- Clienti esigenti, budget limitati, timeline strette
- Deliverables professionali richiesti
- Best practices di settore obbligatorie

TIPI DI TASK COMUNI:

**Landing Page / Sito Web**:
1. Brief & Research (competitor analysis, target audience, USP)
2. Information Architecture (sitemap, user flows, content structure)  
3. Wireframe & UX (layout, navigation, CTA placement)
4. Design System (colors, typography, components, brand alignment)
5. Development (responsive HTML/CSS/JS, performance optimization)
6. Copy & SEO (headlines, meta tags, keywords, readability)
7. Testing & QA (cross-browser, mobile, accessibility, speed)
8. Deploy & Analytics (hosting, tracking pixels, A/B test setup)

**Post Instagram**:
1. Brief Creativo (obiettivo post, target, messaggio chiave)
2. Visual Concept (mood, stile, format 1:1 o 4:5)
3. Copy & Hashtags (caption, CTA, 5-10 hashtags rilevanti)
4. Visual Production (design/foto, editing, export ottimizzato)
5. Scheduling & Publishing (timing ottimale, platform specs)

**Preventivo / Quote**:
1. Discovery Meeting (requirements, scope, budget range)
2. Cost Breakdown (itemized: hours, resources, tools, margin)
3. Timeline & Milestones (fasi, deliverables, scadenze)
4. Terms & Conditions (payment schedule, revisions, IP rights)
5. Presentation & Negotiation (deck, follow-up, contract)

**Campagna Completa**:
1. Strategic Planning (goals, KPIs, budget allocation, channels)
2. Creative Development (concepts, messaging, assets)
3. Production & Execution (content creation, media buying, scheduling)
4. Launch & Monitoring (go-live, real-time optimization)
5. Reporting & Optimization (analytics, insights, iteration)

REGOLE OUTPUT:
- Se task è semplice (1-2 ore, single deliverable) → isComplex: false, 1-2 fasi
- Se task è moderata (3-10 ore, multiple steps) → complexity: 'moderate', 3-5 fasi
- Se task è complessa (>10 ore, molti deliverables) → complexity: 'complex', 5-10 fasi
- Ogni fase: title conciso, description chiara, rationale educativo
- Checklist: 3-7 items azionabili per fase
- Warnings: rischi, dipendenze critiche, common mistakes
- Effort realistico (no underestimate per fare bella figura)
- Dependencies: [id] di fasi prerequisite

TONO: Professionale ma accessibile. Educa, non intimidire.`

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const { taskDescription, clientId, context, userId } = await request.json()

    if (!taskDescription || !userId) {
      return Response.json({ error: 'Missing required fields: taskDescription and userId' }, { status: 400 })
    }

    console.log("🚀 Task Breakdown request:", {
      userId,
      taskLength: taskDescription.length,
      clientId,
      hasContext: !!context,
    })

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey.trim() === "") {
      console.error("❌ OPENAI_API_KEY not found or empty in environment variables")
      return new Response(
        JSON.stringify({
          error: "Configurazione API mancante. Contatta l'amministratore per configurare OPENAI_API_KEY.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    let adminId: string
    let userRole: string

    try {
      const result = await getOrganizationAdminId(userId)
      adminId = result.adminId
      userRole = result.userRole
      console.log(`Task Breakdown API: User ${userId} (${userRole}) will use admin ${adminId} tokens`)
    } catch (error) {
      console.error("Error getting admin ID, using userId as fallback:", error)
      adminId = userId
      userRole = "unknown"
    }

    if (!adminId || adminId === "undefined") {
      console.error("❌ Invalid adminId, cannot proceed with token logging")
      return new Response(JSON.stringify({ error: "Invalid user configuration" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const userPrompt = `Task da analizzare: "${taskDescription}"

${clientId ? `Cliente: ${clientId}` : ""}
${context ? `Contesto aggiuntivo: ${JSON.stringify(context)}` : ""}

Decomponi questa task in fasi professionali. Se è task semplice, non over-engineer.`

    console.log("🤖 Generating task breakdown with OpenAI GPT-4o...")

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: userPrompt },
    ]

    const fullPrompt = JSON.stringify(messages)
    const estimatedInputTokens = estimateTokens(fullPrompt)
    console.log(`💰 Estimated input tokens: ${estimatedInputTokens}`)

    try {
      const result = await generateObject({
        model: openai("gpt-4o"),
        schema: BreakdownSchema,
        messages,
        temperature: 0.7,
      })

      const breakdown = result.object

      const responseText = JSON.stringify(breakdown)
      const actualOutputTokens = Math.ceil(responseText.length / 3.5)
      const totalTokensUsed = estimatedInputTokens + actualOutputTokens

      console.log(
        `💰 Total tokens used: ${totalTokensUsed} (${estimatedInputTokens} input + ${actualOutputTokens} output)`,
      )

      try {
        await logTokenUsage(adminId, userId, totalTokensUsed, "other")
        console.log("✅ Successfully logged token usage for task breakdown")
      } catch (error) {
        console.error("❌ Error logging token usage:", error)
      }

      return new Response(
        JSON.stringify({
          success: true,
          breakdown,
          usage: {
            totalTokens: totalTokensUsed,
            promptTokens: estimatedInputTokens,
            completionTokens: actualOutputTokens,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    } catch (error) {
      console.error("❌ Error generating task breakdown:", error)
      return new Response(
        JSON.stringify({
          error: "Errore nella generazione del breakdown: " + (error as Error).message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("❌ Task Breakdown API handler error:", error)
    return new Response(
      JSON.stringify({
        error: "Errore interno del server: " + (error as Error).message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
