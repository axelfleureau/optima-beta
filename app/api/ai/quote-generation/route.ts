export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import {
  enrichQuoteWithClientData,
  generateQuoteFromEnrichedData,
  generateQuoteFromText,
  type EnrichedPromptData,
  type QuoteGenerationData,
} from "@/lib/ai-quote-service"
import { getCloudflareDb } from "@/lib/cloudflare-db"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"
import type { Client } from "@/lib/types"
import { ensureWorkspacePrincipal } from "@/lib/workspace-db"

function parseDate(value: unknown): Date {
  if (typeof value === "string" && value) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  return new Date()
}

async function loadWorkspaceClients(db: any, organizationId: string): Promise<Client[]> {
  const rows = await db
    .prepare(
      `
      SELECT
        id,
        name,
        email,
        company,
        status,
        created_at,
        updated_at,
        code,
        type,
        source,
        contact_name,
        phone,
        pec,
        vat_number,
        fiscal_code,
        sdi_code,
        address,
        city,
        postal_code,
        work_type,
        notes,
        onedrive_folder,
        onedrive_remote_path,
        notion_url
      FROM clients
      WHERE organization_id = ?
      ORDER BY updated_at DESC, created_at DESC
      LIMIT 500
      `
    )
    .bind(organizationId)
    .all()

  return ((rows.results as any[]) || []).map((row) => ({
    id: String(row.id),
    name: String(row.name || row.company || "Cliente"),
    email: String(row.email || ""),
    phone: row.phone || undefined,
    company: row.company || undefined,
    tenantId: organizationId,
    industry: row.work_type || row.type || undefined,
    code: row.code || undefined,
    type: row.type || undefined,
    source: row.source || undefined,
    contactName: row.contact_name || undefined,
    pec: row.pec || undefined,
    vatNumber: row.vat_number || undefined,
    fiscalCode: row.fiscal_code || undefined,
    sdiCode: row.sdi_code || undefined,
    address: row.address || undefined,
    city: row.city || undefined,
    postalCode: row.postal_code || undefined,
    workType: row.work_type || undefined,
    notes: row.notes || undefined,
    oneDriveFolder: row.onedrive_folder || undefined,
    oneDriveRemotePath: row.onedrive_remote_path || undefined,
    notionUrl: row.notion_url || undefined,
    status: row.status || "active",
    createdAt: parseDate(row.created_at),
    updatedAt: parseDate(row.updated_at),
  }))
}

function toEnrichedPromptData(body: any): EnrichedPromptData {
  return {
    projectType: body.projectType,
    projectTypeLabel: body.projectTypeLabel,
    sector: body.sector,
    sectorLabel: body.sectorLabel,
    description: body.projectDescription || body.description,
    budgetRange: body.budgetRange || { min: 3000, max: 10000 },
    complexity:
      body.complexity === "basic" || body.complexity === "advanced"
        ? body.complexity
        : "standard",
    timeline: body.timeline || "8-12 settimane",
    clientMode: body.clientMode === "platform" ? "platform" : "external",
    clientId: body.clientId,
    clientName: body.clientName,
    clientEmail: body.clientEmail,
    clientCompany: body.clientCompany,
    additionalNotes: body.additionalRequirements || body.additionalNotes,
    brandNames: Array.isArray(body.brandNames) ? body.brandNames : [],
    primaryBrandName: body.primaryBrandName,
    logoStatus:
      body.logoStatus === "available" || body.logoStatus === "not_defined"
        ? body.logoStatus
        : "to_request",
    logoNotes: body.logoNotes,
    brandAssets: body.brandAssets,
    referenceMaterials: body.referenceMaterials,
    missingMaterials: Array.isArray(body.missingMaterials) ? body.missingMaterials : [],
    discoveryQuestions: Array.isArray(body.discoveryQuestions) ? body.discoveryQuestions : [],
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = await rateLimit(request, "AI")
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult.reset)
    }

    const user = await requireClerkUser()
    const db = await getCloudflareDb()

    if (!user) {
      return Response.json({ error: "Sessione non valida o scaduta" }, { status: 401 })
    }

    if (!db) {
      return Response.json({ error: "Database Cloudflare non disponibile" }, { status: 500 })
    }

    const principal = await ensureWorkspacePrincipal(db, user)
    const body = await request.json().catch(() => null)

    if (!body || typeof body !== "object") {
      return Response.json({ error: "Payload preventivo non valido" }, { status: 400 })
    }

    let generatedQuote

    if (body.projectType && body.sector) {
      generatedQuote = await generateQuoteFromEnrichedData(toEnrichedPromptData(body), user.id)
    } else {
      const {
        projectDescription,
        clientName,
        clientEmail,
        clientCompany,
        budget,
        deadline,
        additionalRequirements,
      } = body

      if (!projectDescription) {
        return Response.json({ error: "Missing required field: projectDescription" }, { status: 400 })
      }

      const quoteData: QuoteGenerationData = {
        projectDescription,
        clientName,
        clientEmail,
        clientCompany,
        budget,
        deadline,
        additionalRequirements,
      }

      generatedQuote = await generateQuoteFromText(quoteData, user.id)
    }

    const existingClients = await loadWorkspaceClients(db, principal.organizationId)
    const enrichedQuote = await enrichQuoteWithClientData(generatedQuote, existingClients)

    return Response.json({
      success: true,
      data: enrichedQuote,
    })
  } catch (error: any) {
    console.error("Quote generation API error:", {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      cause: error?.cause,
    })

    const message = error?.message || ""
    const errorMessage =
      message.includes("fetch failed") || message.includes("network")
        ? "Errore di connessione con il servizio AI. Riprova tra qualche istante."
        : message.includes("timeout") || error?.name === "AbortError"
          ? "La generazione del preventivo ha richiesto troppo tempo. Riprova tra qualche istante."
          : "Errore durante la generazione del preventivo. Riprova tra qualche istante."

    return Response.json(
      {
        error: errorMessage,
        details: message || "Errore interno",
      },
      { status: 500 }
    )
  }
}
