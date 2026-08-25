export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCloudflareDb, createId } from "@/lib/cloudflare-db"

/**
 * Ingest dei messaggi raccolti dalla segreteria telefonica.
 *
 * Chiamato server-to-server dal Worker `righello-segreteria-webhook`, che riceve
 * il post-call webhook di ElevenLabs, ne verifica la firma HMAC e inoltra qui i
 * campi gia' strutturati. Non c'e' un utente autenticato dietro questa chiamata:
 * l'autorizzazione e' un segreto condiviso, e l'organizzazione e' configurata.
 *
 * Scrive su D1 — `clients`, `tasks`, `members` — che e' lo store da cui l'app
 * legge davvero. Le collection Firestore con gli stessi nomi sono il vecchio
 * modello: scriverci significa creare record che nessuno vedra' mai.
 */

const MAX_BODY_BYTES = 32 * 1024

const leadSchema = z.object({
  conversationId: z.string().min(1).max(128),
  calledAt: z.string().datetime().optional(),
  callerNumber: z.string().max(32).optional(),
  durationSecs: z.number().int().nonnegative().max(86400).optional(),
  nome: z.string().max(120).optional(),
  azienda: z.string().max(200).optional(),
  motivo: z.string().max(2000).optional(),
  telefono: z.string().max(40).optional(),
  email: z.string().max(200).optional(),
  urgenza: z.enum(["alta", "normale", "bassa"]).optional(),
  categoria: z
    .enum([
      "nuovo_lavoro",
      "cliente_esistente",
      "fornitore",
      "amministrazione",
      "vendita_a_freddo",
      "altro",
    ])
    .optional(),
  messaggio: z.string().max(4000).optional(),
  riepilogo: z.string().max(4000).optional(),
})

type Lead = z.infer<typeof leadSchema>

/** Confronto a tempo costante: un confronto con === perde il segreto un byte alla volta. */
function secretMatches(provided: string, expected: string): boolean {
  const a = new TextEncoder().encode(provided)
  const b = new TextEncoder().encode(expected)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

/** Normalizza un numero italiano per poterlo confrontare: solo cifre, prefisso esplicito. */
function normalizePhone(raw?: string): string | null {
  if (!raw) return null
  const digits = raw.replace(/[^\d+]/g, "")
  if (!digits) return null
  if (digits.startsWith("+")) return digits
  if (digits.startsWith("00")) return `+${digits.slice(2)}`
  if (digits.length === 10 && digits.startsWith("3")) return `+39${digits}`
  if (digits.startsWith("39") && digits.length >= 11) return `+${digits}`
  return digits
}

function cleanEmail(raw?: string): string | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase()
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? v : null
}

function priorityFrom(urgenza?: string): "high" | "medium" | "low" {
  if (urgenza === "alta") return "high"
  if (urgenza === "bassa") return "low"
  return "medium"
}

/**
 * L'organizzazione si risolve da un'email di configurazione, non da un id.
 * Un `org_...` scritto a mano in un file di configurazione si sbaglia senza
 * accorgersene, e i lead finiscono in un'organizzazione che non esiste.
 */
async function resolveOrgId(db: any, env: Record<string, string | undefined>) {
  if (env.SEGRETERIA_ORG_ID) return env.SEGRETERIA_ORG_ID
  const ownerEmail = cleanEmail(env.SEGRETERIA_OWNER_EMAIL)
  if (!ownerEmail) return null
  const row = await db
    .prepare(`SELECT organization_id FROM members WHERE lower(email) = ? LIMIT 1`)
    .bind(ownerEmail)
    .first()
  return row?.organization_id ?? null
}

/** Chi richiama, per categoria. Rispecchia l'instradamento del prompt della segreteria. */
function assigneeEmailFor(categoria: string | undefined, env: Record<string, string | undefined>) {
  switch (categoria) {
    case "nuovo_lavoro":
    case "cliente_esistente":
      return env.SEGRETERIA_ASSIGNEE_COMMERCIALE || env.SEGRETERIA_ASSIGNEE_EMAIL
    default:
      return env.SEGRETERIA_ASSIGNEE_EMAIL
  }
}

async function findAssignee(db: any, email: string | undefined, orgId: string) {
  const clean = cleanEmail(email)
  if (!clean) return null
  const row = await db
    .prepare(
      `SELECT id, first_name, last_name FROM members
       WHERE lower(email) = ? AND organization_id = ? AND status = 'active' LIMIT 1`,
    )
    .bind(clean, orgId)
    .first()
  if (!row) return null
  const nome = [row.first_name, row.last_name].filter(Boolean).join(" ").trim()
  return { id: row.id as string, name: nome || (clean as string) }
}

async function findExistingClient(db: any, lead: Lead, orgId: string) {
  const email = cleanEmail(lead.email)
  if (email) {
    const row = await db
      .prepare(
        `SELECT id, name FROM clients WHERE organization_id = ? AND lower(email) = ? LIMIT 1`,
      )
      .bind(orgId, email)
      .first()
    if (row) return row
  }

  const phone = normalizePhone(lead.telefono || lead.callerNumber)
  if (phone) {
    const row = await db
      .prepare(`SELECT id, name FROM clients WHERE organization_id = ? AND phone = ? LIMIT 1`)
      .bind(orgId, phone)
      .first()
    if (row) return row
  }

  return null
}

function describe(lead: Lead): string {
  return [
    lead.motivo ? `Motivo: ${lead.motivo}` : null,
    lead.messaggio ? `\nMessaggio raccolto:\n${lead.messaggio}` : null,
    lead.riepilogo ? `\nRiepilogo della chiamata:\n${lead.riepilogo}` : null,
    "",
    `Origine: segreteria telefonica · conversazione ${lead.conversationId}`,
    lead.callerNumber ? `Numero chiamante: ${lead.callerNumber}` : null,
    lead.calledAt ? `Ricevuta: ${lead.calledAt}` : null,
  ]
    .filter(Boolean)
    .join("\n")
}

export async function POST(request: NextRequest) {
  const env = process.env as Record<string, string | undefined>

  const expectedSecret = env.SEGRETERIA_INGEST_SECRET
  if (!expectedSecret || (!env.SEGRETERIA_ORG_ID && !env.SEGRETERIA_OWNER_EMAIL)) {
    console.error(
      "segreteria/lead: serve SEGRETERIA_INGEST_SECRET e uno fra SEGRETERIA_ORG_ID e SEGRETERIA_OWNER_EMAIL",
    )
    return NextResponse.json({ error: "Endpoint non configurato" }, { status: 503 })
  }

  const header = request.headers.get("authorization") || ""
  const provided = header.startsWith("Bearer ") ? header.slice(7) : ""
  if (!provided || !secretMatches(provided, expectedSecret)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
  }

  const raw = await request.text()
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload troppo grande" }, { status: 413 })
  }

  let lead: Lead
  try {
    lead = leadSchema.parse(JSON.parse(raw))
  } catch (error: any) {
    // 400: il Worker non deve ritentare un payload malformato.
    return NextResponse.json(
      { error: "Payload non valido", details: error?.issues ?? String(error?.message ?? error) },
      { status: 400 },
    )
  }

  const db = await getCloudflareDb()
  if (!db) {
    return NextResponse.json({ error: "Database non disponibile" }, { status: 503 })
  }

  try {
    const orgId = await resolveOrgId(db, env)
    if (!orgId) {
      console.error("segreteria/lead: organizzazione non risolta")
      return NextResponse.json({ error: "Organizzazione non risolta" }, { status: 503 })
    }

    const gia = await db
      .prepare(
        `SELECT client_id, task_id, skipped FROM segreteria_leads WHERE conversation_id = ? LIMIT 1`,
      )
      .bind(lead.conversationId)
      .first()
    if (gia) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        clientId: gia.client_id ?? null,
        taskId: gia.task_id ?? null,
        skipped: gia.skipped ?? null,
      })
    }

    // Le vendite a freddo si registrano ma non entrano nel CRM: un lead che non e'
    // un lead sporca la pipeline e fa perdere tempo a chi la guarda.
    if (lead.categoria === "vendita_a_freddo") {
      await db
        .prepare(
          `INSERT INTO segreteria_leads
             (conversation_id, organization_id, skipped, categoria, urgenza, caller_number)
           VALUES (?, ?, 'vendita_a_freddo', ?, ?, ?)`,
        )
        .bind(
          lead.conversationId,
          orgId,
          lead.categoria ?? null,
          lead.urgenza ?? null,
          lead.callerNumber ?? null,
        )
        .run()
      return NextResponse.json({ success: true, skipped: "vendita_a_freddo" })
    }

    const email = cleanEmail(lead.email)
    const phone = normalizePhone(lead.telefono || lead.callerNumber)
    const displayName =
      lead.azienda?.trim() || lead.nome?.trim() || phone || "Contatto da segreteria"

    const esistente = await findExistingClient(db, lead, orgId)
    let clientId: string
    let clientName: string
    let clientCreated = false

    if (esistente) {
      clientId = esistente.id as string
      clientName = (esistente.name as string) || displayName
    } else {
      clientId = createId("client")
      clientName = displayName
      await db
        .prepare(
          `INSERT INTO clients
             (id, organization_id, name, email, company, status, source, contact_name, phone, notes)
           VALUES (?, ?, ?, ?, ?, 'lead', 'segreteria', ?, ?, ?)`,
        )
        .bind(
          clientId,
          orgId,
          clientName,
          email,
          lead.azienda?.trim() || null,
          lead.nome?.trim() || null,
          phone,
          lead.motivo ? `Primo contatto dalla segreteria telefonica: ${lead.motivo}` : null,
        )
        .run()
      clientCreated = true
    }

    const assignee = await findAssignee(db, assigneeEmailFor(lead.categoria, env), orgId)

    const taskId = createId("task")
    const titolo = `Richiamare ${lead.nome?.trim() || clientName}${
      lead.azienda?.trim() && lead.nome?.trim() ? ` — ${lead.azienda.trim()}` : ""
    }`
    await db
      .prepare(
        `INSERT INTO tasks
           (id, organization_id, title, description, status, column_id, priority,
            client_id, client_name, assignee_member_id, assignee_name, type, due_at)
         VALUES (?, ?, ?, ?, 'to-do', 'to-do', ?, ?, ?, ?, ?, 'segreteria', ?)`,
      )
      .bind(
        taskId,
        orgId,
        titolo.slice(0, 140),
        describe(lead),
        priorityFrom(lead.urgenza),
        clientId,
        clientName,
        assignee?.id ?? null,
        assignee?.name ?? null,
        new Date().toISOString(),
      )
      .run()

    await db
      .prepare(
        `INSERT INTO segreteria_leads
           (conversation_id, organization_id, client_id, task_id, client_created,
            categoria, urgenza, caller_number)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        lead.conversationId,
        orgId,
        clientId,
        taskId,
        clientCreated ? 1 : 0,
        lead.categoria ?? null,
        lead.urgenza ?? null,
        lead.callerNumber ?? null,
      )
      .run()

    console.log(
      `segreteria/lead ok · conv=${lead.conversationId} client=${clientId} task=${taskId} nuovo=${clientCreated} assegnato=${assignee?.id ?? "-"}`,
    )

    return NextResponse.json({
      success: true,
      duplicate: false,
      clientId,
      clientCreated,
      taskId,
      assignedTo: assignee?.id ?? null,
      assigneeName: assignee?.name ?? null,
    })
  } catch (error: any) {
    // 500: il Worker ritentera'. L'idempotenza sulla conversationId rende il retry sicuro.
    console.error(`segreteria/lead errore · conv=${lead.conversationId}: ${error?.message ?? error}`)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
