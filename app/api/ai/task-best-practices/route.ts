import type { NextRequest } from "next/server"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import { getOrganizationAdminId, logTokenUsage, estimateTokens } from "@/lib/token-service"

const BestPracticesSchema = z.object({
  taskType: z.string(),
  checklist: z.array(z.string()),
  tips: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
    }),
  ),
  warnings: z.array(z.string()),
  resources: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().optional(),
        description: z.string(),
      }),
    )
    .optional(),
})

const TASK_TYPE_MAP: Record<string, string> = {
  post_instagram: "POST_INSTAGRAM",
  instagram: "POST_INSTAGRAM",
  preventivo: "PREVENTIVO",
  quote: "PREVENTIVO",
  landing_page: "LANDING_PAGE",
  sito_web: "LANDING_PAGE",
  website: "LANDING_PAGE",
  campagna: "CAMPAGNA_MARKETING",
  campaign: "CAMPAGNA_MARKETING",
  content: "CONTENT_CREATION",
}

function normalizeTaskType(taskType: string): string {
  const normalized = taskType.toLowerCase().replace(/\s+/g, "_")
  return TASK_TYPE_MAP[normalized] || "CONTENT_CREATION"
}

const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24

const SYSTEM_PROMPT = `Sei un consulente senior per agenzie di servizi.
Fornisci best practices professionali specifiche per tipo di task.

TASK TYPES & BEST PRACTICES:

**POST INSTAGRAM**:
- Hashtags: 5-10 rilevanti (mix popolare + nicchia), no spam
- CTA: Call-to-action chiara (commenta, salva, condividi, link in bio)
- Formato: 1:1 (feed), 4:5 (vertical), 9:16 (stories/reels)
- Timing: Post 11-13 o 18-21 (peak engagement)
- Caption: Max 2200 char, prima frase cattura attenzione, storytelling
- Warnings: Evita shadowban (no hashtag bannati), max 30 hashtags

**PREVENTIVO / QUOTE**:
- Breakdown: Costi itemizzati (ore, risorse, tools, margin trasparente)
- Scadenza: 30-45 giorni validità preventivo
- Termini: Payment schedule (50% anticipo, 50% completamento), milestones
- Legalese: T&C template (IP rights, revisions incluse, cancellation policy)
- Warnings: Buffer 20% su timeline, clausola extra revisions a costo

**LANDING PAGE / SITO WEB**:
- Above the fold: Hero chiaro, value proposition entro 5 sec
- CTA: Primaria visible (contrasto colore), secondaria subtle
- Performance: <3s load time, Lighthouse 90+, mobile-first
- SEO: Meta tags, H1 unique, schema markup, sitemap
- Conversion: Trust signals (testimonials, social proof, security badges)
- Warnings: Test cross-browser, GDPR cookie banner, accessibility AA

**CAMPAGNA MARKETING**:
- Goals: SMART objectives (Specific, Measurable, Achievable, Relevant, Time-bound)
- KPIs: Definiti pre-launch (CTR, conversion rate, CAC, ROAS)
- Budget: 80/20 allocation (80% proven channels, 20% test)
- Timeline: Buffer 20% per imprevisti, milestone tracking
- Reporting: Weekly KPI dashboard, monthly strategic review
- Warnings: A/B test sempre, no over-optimization pre-data

**CONTENT CREATION (generico)**:
- Brief: Target audience, tone of voice, key message, deliverables
- Research: Competitor analysis, trend monitoring, audience insights
- Quality: Spelling/grammar check, brand guidelines compliance
- Approval: Stakeholder review process, revision rounds max 3
- Warnings: Copyright clearance assets, attribution fonti

TONO: Pratico e azionabile. Best practices concrete, no teoria astratta.`

export async function POST(request: NextRequest) {
  try {
    const { taskType, taskDescription, userId } = await request.json()

    if (!taskType || !userId) {
      return Response.json({ error: "Missing required fields: taskType and userId" }, { status: 400 })
    }

    const normalizedType = normalizeTaskType(taskType)

    console.log("🚀 Best Practices request:", {
      userId,
      taskType,
      normalizedType,
      hasDescription: !!taskDescription,
    })

    const descriptionHash = taskDescription
      ? taskDescription.toLowerCase().slice(0, 50).replace(/\s+/g, "_")
      : "generic"
    const cacheKey = `best-practices:${normalizedType.toLowerCase()}:${descriptionHash}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log("✅ Returning cached best practices for:", normalizedType)
      return Response.json({ success: true, ...cached.data, fromCache: true })
    }

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
      console.log(`Best Practices API: User ${userId} (${userRole}) will use admin ${adminId} tokens`)
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

    const userPrompt = `Task Type: ${normalizedType}
${taskDescription ? `Description: ${taskDescription}` : ""}

Fornisci checklist, tips professionali, warnings e resources per questo tipo di task.`

    console.log("🤖 Generating best practices with OpenAI GPT-4o...")

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
        schema: BestPracticesSchema,
        messages,
        temperature: 0.7,
      })

      const bestPractices = result.object

      const responseText = JSON.stringify(bestPractices)
      const actualOutputTokens = Math.ceil(responseText.length / 3.5)
      const totalTokensUsed = estimatedInputTokens + actualOutputTokens

      console.log(
        `💰 Total tokens used: ${totalTokensUsed} (${estimatedInputTokens} input + ${actualOutputTokens} output)`,
      )

      try {
        await logTokenUsage(adminId, userId, totalTokensUsed, "other")
        console.log("✅ Successfully logged token usage for best practices")
      } catch (error) {
        console.error("❌ Error logging token usage:", error)
      }

      const responseData = {
        bestPractices: {
          ...bestPractices,
          taskType: normalizedType,
        },
        fromCache: false,
      }

      cache.set(cacheKey, { data: responseData, timestamp: Date.now() })
      console.log("✅ Cached best practices for:", normalizedType)

      return new Response(
        JSON.stringify({
          success: true,
          ...responseData,
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
      console.error("❌ Error generating best practices:", error)
      return new Response(
        JSON.stringify({
          error: "Errore nella generazione delle best practices: " + (error as Error).message,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error) {
    console.error("❌ Best Practices API handler error:", error)
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
