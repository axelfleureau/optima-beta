export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "@/lib/firebase-admin-firestore"

/**
 * Ingest dei messaggi raccolti dalla segreteria telefonica.
 *
 * Chiamato server-to-server dal Worker `righello-segreteria-webhook`, che riceve
 * il post-call webhook di ElevenLabs, ne verifica la firma HMAC e inoltra qui i
 * campi gia' strutturati. Non c'e' un utente autenticato dietro questa chiamata:
 * l'autorizzazione e' un segreto condiviso, e il tenant e' configurato, non dedotto.
 *
 * L'idempotenza e' sulla conversation_id di ElevenLabs: ElevenLabs ritenta i
 * webhook falliti, e una segreteria che crea due volte lo stesso cliente e' peggio
 * di una che non lo crea affatto.
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

/**
 * Risolve il tenant da un'email di configurazione invece che da un id opaco.
 * Il tenantId di Optima e' `tenant_<uid>`: non e' un valore che si possa scrivere
 * a mano in un file di configurazione senza sbagliarlo, mentre un'email si'.
 */
let tenantCache: { value: string; expiresAt: number } | null = null

async function resolveTenantId(env: Record<string, string | undefined>): Promise<string | null> {
  if (env.SEGRETERIA_TENANT_ID) return env.SEGRETERIA_TENANT_ID
  const ownerEmail = env.SEGRETERIA_OWNER_EMAIL
  if (!ownerEmail) return null

  if (tenantCache && tenantCache.expiresAt > Date.now()) return tenantCache.value

  const snap = await adminDb
    .collection("users")
    .where("email", "==", ownerEmail.toLowerCase())
    .limit(1)
    .get()
  if (snap.empty) return null

  const data = snap.docs[0].data() || {}
  const tenantId = data.tenantId || snap.docs[0].id
  if (!tenantId) return null

  tenantCache = { value: tenantId, expiresAt: Date.now() + 10 * 60 * 1000 }
  return tenantId
}

async function findUserIdByEmail(email: string, tenantId: string): Promise<string | null> {
  try {
    const snap = await adminDb
      .collection("users")
      .where("email", "==", email.toLowerCase())
      .limit(5)
      .get()
    if (snap.empty) return null
    const match =
      snap.docs.find((d: any) => (d.data()?.tenantId || d.id) === tenantId) || snap.docs[0]
    return match?.id || null
  } catch (error) {
    // Un assegnatario non risolto non deve far fallire l'ingest: il task resta da smistare.
    console.warn("segreteria/lead: risoluzione assegnatario fallita")
    return null
  }
}

async function findExistingClient(lead: Lead, tenantId: string) {
  const email = cleanEmail(lead.email)
  if (email) {
    const byEmail = await adminDb
      .collection("clients")
      .where("email", "==", email)
      .where("tenantId", "==", tenantId)
      .limit(1)
      .get()
    if (!byEmail.empty) return byEmail.docs[0]
  }

  const phone = normalizePhone(lead.telefono || lead.callerNumber)
  if (phone) {
    const byPhone = await adminDb
      .collection("clients")
      .where("phone", "==", phone)
      .where("tenantId", "==", tenantId)
      .limit(1)
      .get()
    if (!byPhone.empty) return byPhone.docs[0]
  }

  return null
}

function describe(lead: Lead): string {
  const righe = [
    lead.motivo ? `Motivo: ${lead.motivo}` : null,
    lead.messaggio ? `\nMessaggio raccolto:\n${lead.messaggio}` : null,
    lead.riepilogo ? `\nRiepilogo della chiamata:\n${lead.riepilogo}` : null,
    "",
    `Origine: segreteria telefonica · conversazione ${lead.conversationId}`,
    lead.callerNumber ? `Numero chiamante: ${lead.callerNumber}` : null,
    lead.calledAt ? `Ricevuta: ${lead.calledAt}` : null,
  ].filter(Boolean)
  return righe.join("\n")
}

export async function POST(request: NextRequest) {
  const env = process.env as Record<string, string | undefined>

  const expectedSecret = env.SEGRETERIA_INGEST_SECRET
  if (!expectedSecret || (!env.SEGRETERIA_TENANT_ID && !env.SEGRETERIA_OWNER_EMAIL)) {
    console.error(
      "segreteria/lead: serve SEGRETERIA_INGEST_SECRET e uno fra SEGRETERIA_TENANT_ID e SEGRETERIA_OWNER_EMAIL",
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

  if (!adminDb) {
    return NextResponse.json({ error: "Database non configurato" }, { status: 503 })
  }

  let tenantId: string | null
  try {
    tenantId = await resolveTenantId(env)
  } catch (error: any) {
    console.error(`segreteria/lead: risoluzione tenant fallita: ${error?.message ?? error}`)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
  if (!tenantId) {
    console.error("segreteria/lead: tenant non risolto")
    return NextResponse.json({ error: "Tenant non risolto" }, { status: 503 })
  }

  const auditRef = adminDb.collection("segreteria_leads").doc(lead.conversationId)

  try {
    const existing = await auditRef.get()
    if (existing.exists) {
      const d = existing.data() || {}
      return NextResponse.json({
        success: true,
        duplicate: true,
        clientId: d.clientId ?? null,
        taskId: d.taskId ?? null,
        skipped: d.skipped ?? null,
      })
    }

    // Le vendite a freddo si registrano ma non entrano nel CRM: un lead che non e'
    // un lead sporca la pipeline e fa perdere tempo a chi la guarda.
    if (lead.categoria === "vendita_a_freddo") {
      await auditRef.set({
        conversationId: lead.conversationId,
        tenantId,
        skipped: "vendita_a_freddo",
        callerNumber: lead.callerNumber ?? null,
        receivedAt: FieldValue.serverTimestamp(),
      })
      return NextResponse.json({ success: true, skipped: "vendita_a_freddo" })
    }

    const email = cleanEmail(lead.email)
    const phone = normalizePhone(lead.telefono || lead.callerNumber)
    const displayName = lead.nome?.trim() || lead.azienda?.trim() || phone || "Contatto da segreteria"

    const existingClient = await findExistingClient(lead, tenantId)
    let clientId: string
    let clientCreated = false

    if (existingClient) {
      clientId = existingClient.id
    } else {
      const clientRef = await adminDb.collection("clients").add({
        name: displayName,
        email: email,
        phone: phone,
        company: lead.azienda?.trim() || null,
        industry: null,
        contactEmail: null,
        contactPhone: phone,
        address: null,
        status: "lead",
        source: "segreteria_telefonica",
        tenantId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        totalValue: 0,
        projectsCount: 0,
      })
      clientId = clientRef.id
      clientCreated = true
    }

    const assigneeEmail = assigneeEmailFor(lead.categoria, env)
    const assignedTo = assigneeEmail ? await findUserIdByEmail(assigneeEmail, tenantId) : null

    const titolo = `Richiamare ${displayName}${lead.azienda ? ` — ${lead.azienda}` : ""}`
    const taskRef = await adminDb.collection("tasks").add({
      title: titolo.slice(0, 140),
      description: describe(lead),
      clientId,
      tenantId,
      status: "to-do",
      columnId: "to-do",
      priority: priorityFrom(lead.urgenza),
      assignedTo,
      dueDate: new Date(),
      createdAt: new Date(),
      createdBy: "segreteria",
      userId: assignedTo,
      metadata: {
        source: "segreteria_telefonica",
        conversationId: lead.conversationId,
        categoria: lead.categoria ?? null,
        urgenza: lead.urgenza ?? null,
        callerNumber: lead.callerNumber ?? null,
        durationSecs: lead.durationSecs ?? null,
      },
    })

    await auditRef.set({
      conversationId: lead.conversationId,
      tenantId,
      clientId,
      taskId: taskRef.id,
      clientCreated,
      assignedTo,
      categoria: lead.categoria ?? null,
      urgenza: lead.urgenza ?? null,
      callerNumber: lead.callerNumber ?? null,
      receivedAt: FieldValue.serverTimestamp(),
    })

    console.log(
      `segreteria/lead ok · conv=${lead.conversationId} client=${clientId} task=${taskRef.id} nuovo=${clientCreated}`,
    )

    return NextResponse.json({
      success: true,
      duplicate: false,
      clientId,
      clientCreated,
      taskId: taskRef.id,
      assignedTo,
    })
  } catch (error: any) {
    // 500: il Worker ritentera'. L'idempotenza sulla conversationId rende il retry sicuro.
    console.error(`segreteria/lead errore · conv=${lead.conversationId}: ${error?.message ?? error}`)
    return NextResponse.json({ error: "Errore interno" }, { status: 500 })
  }
}
