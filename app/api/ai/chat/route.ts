export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { generateText } from "ai"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"
import { OPENAI_CHAT_MODEL, OPENAI_FAST_MODEL } from "@/lib/ai/models"
import { createRuntimeOpenAI } from "@/lib/ai/openai-runtime"
import { buildOperationalContextSnapshot } from "@/lib/operational-context"
import { listAgenticGraphNodes, upsertAgenticGraphNode, type AgenticGraphConfidence } from "@/lib/agentic-graph"
import { AGENT_ADMIN_ROLES } from "@/lib/agent-jobs"
import { ensureWorkspacePrincipal, type WorkspacePrincipal } from "@/lib/workspace-db"

type StoredMemory = {
  key: string
  value: string
  source: string
}

type ChatGenerationMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

const SYSTEM_PROMPT = `Sei l'assistente AI operativo di Óptima, il sistema interno di Righello per progetti, clienti, task, persone, preventivi, presenza e controllo aziendale.

Comportamento:
- Rispondi sempre in italiano, in modo diretto, pragmatico e operativo.
- Usa i dati di contesto forniti come snapshot read-only della piattaforma.
- Non inventare numeri, stati, clienti, scadenze o persone: se un dato non è presente nel contesto, dillo chiaramente.
- Evidenzia rischi, blocchi, priorità e prossime azioni concrete.
- Quando l'utente chiede analisi aziendale, ragiona su carico, ritardi, capacità, ownership, finestre temporali e responsabilità.
- Quando l'utente chiede contenuti, mantieni qualità da studio creativo Righello: preciso, premium, non generico.
- Integrazioni media disponibili in Óptima: Magnific Nano Banana Pro per immagini e Kling 2.6 Pro per video. Se l'utente chiede generazione visual/video, aiuta a scrivere un prompt pronto per il pannello Media Studio.
- Se proponi integrazioni, distingui tra integrazione già disponibile in Óptima e integrazione consigliata da costruire.
- Quando il contesto include GRAPH MEMORY, usala come memoria aziendale a grafo: cita source/confidence quando serve e non trasformare nodi ambigui in verità operative.
- Se l'utente chiede di salvare conoscenza nel grafo, spiegagli il formato operativo: "salva nel grafo: tipo=client; titolo=...; sommario=...; tag=..." oppure usa la pagina Agenti > Stack.`

function estimateTokens(input: string) {
  return Math.ceil(input.length / 4)
}

function compact(value: unknown, limit = 600) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit)
}

function cleanGeneratedText(value: unknown, limit = 6000) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, limit)
}

function formatDate(value: unknown) {
  if (!value) return "senza scadenza"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function safeRole(role: unknown): "system" | "user" | "assistant" {
  return role === "assistant" ? "assistant" : role === "system" ? "system" : "user"
}

async function safeAll(db: any, sql: string, params: unknown[] = []) {
  try {
    const statement = db.prepare(sql)
    const result = await statement.bind(...params).all()
    return result.results || []
  } catch (error) {
    console.warn("AI context query skipped:", error)
    return []
  }
}

function formatCurrencyCents(value: unknown, currency = "EUR") {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0) / 100)
}

function buildLikeWhere(columns: string[], terms: string[]) {
  const clauses: string[] = []
  const params: string[] = []

  for (const term of terms) {
    for (const column of columns) {
      clauses.push(`lower(COALESCE(${column}, '')) LIKE ?`)
      params.push(`%${term}%`)
    }
  }

  return {
    where: clauses.join(" OR "),
    params,
  }
}

function sqlPlaceholders(values: unknown[]) {
  return values.map(() => "?").join(", ")
}

function extractBusinessLookupTerms(message: string) {
  const stop = new Set([
    "quanto",
    "quanta",
    "quanti",
    "quante",
    "pagato",
    "pagata",
    "pagati",
    "pagate",
    "speso",
    "spesa",
    "costo",
    "costa",
    "costato",
    "fattura",
    "fatture",
    "preventivo",
    "preventivi",
    "cliente",
    "clienti",
    "sito",
    "app",
    "lavoro",
    "progetto",
    "progetti",
    "dimmi",
    "sapere",
    "vorrei",
  ])

  return Array.from(
    new Set(
      compact(message, 420)
        .toLowerCase()
        .replace(/[^a-z0-9àèéìòù\s-]/gi, " ")
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 4 && !stop.has(term)),
    ),
  ).slice(0, 5)
}

function hasFinancialIntent(message: string) {
  return /\b(pagat[oaie]?|spes[oa]?|cost[oa]|preventiv[oi]?|fattur[ae]?|incassat[oaie]?|saldo|acconto|budget)\b/i.test(message)
}

function buildNoDataBusinessFallback(message: string, factsText: string) {
  const financial = hasFinancialIntent(message)
  if (!financial || !factsText) {
    return [
      "Ho salvato la richiesta e ho interrogato il contesto operativo disponibile.",
      "Non ho trovato un dato abbastanza solido per rispondere in modo affidabile. Posso trasformare questa richiesta in un job agentico revisionabile per fare una verifica piu profonda su repo, documenti e fonti collegate.",
    ].join("\n\n")
  }

  return [
    "Non trovo in Optima un importo pagato o incassato collegato a questa richiesta.",
    "",
    factsText,
    "",
    "Quindi non posso rispondere con una cifra senza inventarla. Per renderlo operativo bisogna collegare a Optima almeno una di queste fonti: preventivo accettato, fattura/pagamento, consuntivo ore fatturabile o documento amministrativo del cliente.",
  ].join("\n")
}

function buildImmediateOperationalFallback(message: string, contextSources: string[], businessFallback?: string) {
  if (businessFallback) return businessFallback

  const normalized = compact(message, 320).toLowerCase()
  const sources = contextSources.length ? contextSources.join(", ") : "contesto base Optima"

  if (/\b(ora|adesso).*\b(sa|sapere|sai)\b|\blo sa\b/.test(normalized)) {
    return [
      "Sì: la richiesta è salvata e viene gestita con il contesto operativo disponibile in Optima.",
      `Fonti viste in questa sessione: ${sources}.`,
      "Se manca un dato specifico, non lo invento: lo trasformo in import, job agentico o nodo verificabile del grafo.",
    ].join("\n")
  }

  if (/\b(dovresti|devi|fai tu|mica io|tutto tu)\b/.test(normalized)) {
    return [
      "Hai ragione: il flusso deve lavorare per te, non chiederti di inseguire la risposta.",
      "Ho salvato la richiesta nella conversazione. Quando l'azione richiede ricerca, import o modifica dati, Optima deve trasformarla in job revisionabile; quando il dato è già nel contesto, deve rispondere subito.",
      `Contesto disponibile ora: ${sources}.`,
    ].join("\n")
  }

  return [
    "Ho preso in carico la richiesta e l'ho salvata nella conversazione.",
    "In questo passaggio il modello non ha restituito testo utile, quindi non invento una risposta. Uso il contesto disponibile per rispondere subito quando il dato è presente; altrimenti la richiesta va trasformata automaticamente in job agentico revisionabile.",
    `Contesto disponibile: ${sources}.`,
  ].join("\n")
}

function uniqueModels(values: string[]) {
  return Array.from(new Set(values.map((value) => compact(value, 80)).filter(Boolean)))
}

async function generateOperationalAnswer(openai: Awaited<ReturnType<typeof createRuntimeOpenAI>>, messages: ChatGenerationMessage[]) {
  const candidates = uniqueModels([OPENAI_CHAT_MODEL, OPENAI_FAST_MODEL, "gpt-4.1-mini", "gpt-4o-mini"])
  const promptMessages = [
    ...messages,
    {
      role: "system" as const,
      content:
        "Rispondi con testo utile. Se il dato manca, indica esattamente quale fonte manca e quale azione operativa creare. Non chiedere all'utente di rileggere, rigenerare o riprovare.",
    },
  ]
  const errors: string[] = []

  for (const model of candidates) {
    try {
      const result = await generateText({
        model: openai.responses(model),
        messages: promptMessages,
        maxTokens: 1100,
      })
      const text = cleanGeneratedText(result.text)
      if (text) return { text, model: `${model} · responses` }
      errors.push(`${model}/responses: empty`)
    } catch (error) {
      errors.push(`${model}/responses: ${error instanceof Error ? error.message : String(error)}`)
      console.warn("OpenAI Responses chat generation failed:", { model, error })
    }

    try {
      const result = await generateText({
        model: openai.chat(model),
        messages: promptMessages,
        maxTokens: 1100,
      })
      const text = cleanGeneratedText(result.text)
      if (text) return { text, model: `${model} · chat` }
      errors.push(`${model}/chat: empty`)
    } catch (error) {
      errors.push(`${model}/chat: ${error instanceof Error ? error.message : String(error)}`)
      console.warn("OpenAI Chat chat generation failed:", { model, error })
    }
  }

  console.error("AI chat returned no useful model output after all fallbacks:", errors.slice(0, 8))
  return { text: "", model: candidates[0] || OPENAI_CHAT_MODEL }
}

function enqueueSse(controller: ReadableStreamDefaultController, payload: unknown) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`))
}

function enqueueTextInChunks(controller: ReadableStreamDefaultController, text: string) {
  const chunkSize = 900
  for (let index = 0; index < text.length; index += chunkSize) {
    enqueueSse(controller, { content: text.slice(index, index + chunkSize) })
  }
}

async function buildQuestionScopedBusinessFacts(db: any, principal: WorkspacePrincipal, message: string) {
  if (!db) return { text: "", sources: [] as string[], fallbackText: "" }

  const terms = extractBusinessLookupTerms(message)
  if (!terms.length) return { text: "", sources: [] as string[], fallbackText: "" }

  const isManager = ["super-admin", "admin", "direzione", "capo-reparto"].includes(principal.role)
  const sources = new Set<string>()
  const clientLike = buildLikeWhere(["c.name", "c.company", "c.email", "c.notes"], terms)
  const clients = await safeAll(
    db,
    `SELECT c.id, c.name, c.company, c.status, c.email, c.notes
     FROM clients c
     WHERE c.organization_id = ?
       AND (${clientLike.where})
     ORDER BY c.updated_at DESC
     LIMIT 6`,
    [principal.organizationId, ...clientLike.params],
  )
  if (clients.length) sources.add("clients")

  const clientIds = clients.map((client: any) => String(client.id)).filter(Boolean)
  const projectLike = buildLikeWhere(["p.name"], terms)
  const projectConditions = [projectLike.where]
  const projectParams: unknown[] = [principal.organizationId, ...projectLike.params]
  if (clientIds.length) {
    projectConditions.push(`p.client_id IN (${sqlPlaceholders(clientIds)})`)
    projectParams.push(...clientIds)
  }
  const projects = await safeAll(
    db,
    `SELECT p.id, p.name, p.status, p.budget_cents, p.client_id, c.name AS client_name, p.updated_at
     FROM projects p
     LEFT JOIN clients c ON c.id = p.client_id AND c.organization_id = p.organization_id
     WHERE p.organization_id = ?
       AND (${projectConditions.join(" OR ")})
     ORDER BY p.updated_at DESC
     LIMIT 8`,
    projectParams,
  )
  if (projects.length) sources.add("projects")

  const projectIds = projects.map((project: any) => String(project.id)).filter(Boolean)
  const quoteLike = buildLikeWhere(["q.title", "q.client_name", "q.description"], terms)
  const quoteConditions = [quoteLike.where]
  const quoteParams: unknown[] = [principal.organizationId, isManager ? 1 : 0, principal.memberId, ...quoteLike.params]
  if (clientIds.length) {
    quoteConditions.push(`q.client_id IN (${sqlPlaceholders(clientIds)})`)
    quoteParams.push(...clientIds)
  }
  const quotes = await safeAll(
    db,
    `SELECT q.id, q.title, q.status, q.currency, q.total_cents, q.client_id, q.client_name, q.description, q.updated_at
     FROM quotes q
     WHERE q.organization_id = ?
       AND (
         ? = 1
         OR EXISTS (
           SELECT 1
           FROM tasks vt
           LEFT JOIN projects vtp ON vtp.id = vt.project_id AND vtp.organization_id = vt.organization_id
           WHERE vt.organization_id = q.organization_id
             AND vt.assignee_member_id = ?
             AND (vt.client_id = q.client_id OR vtp.client_id = q.client_id)
         )
       )
       AND (${quoteConditions.join(" OR ")})
     ORDER BY q.updated_at DESC
     LIMIT 8`,
    quoteParams,
  )
  if (quotes.length) sources.add("quotes")

  const externalLike = buildLikeWhere(["er.title", "er.summary", "er.normalized_json"], terms)
  const externalConditions = [externalLike.where]
  const externalParams: unknown[] = [principal.organizationId, isManager ? 1 : 0, principal.memberId, ...externalLike.params]
  if (clientIds.length) {
    externalConditions.push(`er.client_id IN (${sqlPlaceholders(clientIds)})`)
    externalParams.push(...clientIds)
  }
  if (projectIds.length) {
    externalConditions.push(`er.project_id IN (${sqlPlaceholders(projectIds)})`)
    externalParams.push(...projectIds)
  }
  const externalRecords = await safeAll(
    db,
    `SELECT er.id, er.record_type, er.title, er.summary, er.amount_cents, er.currency,
            er.confidence, er.provider, er.external_url, er.quote_id, er.client_id, c.name AS client_name
     FROM external_data_records er
     LEFT JOIN clients c ON c.id = er.client_id AND c.organization_id = er.organization_id
     WHERE er.organization_id = ?
       AND (
         ? = 1
         OR EXISTS (
           SELECT 1
           FROM tasks vt
           LEFT JOIN projects vtp ON vtp.id = vt.project_id AND vtp.organization_id = vt.organization_id
           WHERE vt.organization_id = er.organization_id
             AND vt.assignee_member_id = ?
             AND (vt.client_id = er.client_id OR vtp.client_id = er.client_id)
         )
       )
       AND (${externalConditions.join(" OR ")})
     ORDER BY er.updated_at DESC
     LIMIT 10`,
    externalParams,
  )
  if (externalRecords.length) sources.add("external_data_records")

  const interactionLike = buildLikeWhere(["ci.title", "ci.summary"], terms)
  const interactionConditions = [interactionLike.where]
  const interactionParams: unknown[] = [principal.organizationId, isManager ? 1 : 0, principal.memberId, ...interactionLike.params]
  if (clientIds.length) {
    interactionConditions.push(`ci.client_id IN (${sqlPlaceholders(clientIds)})`)
    interactionParams.push(...clientIds)
  }
  if (projectIds.length) {
    interactionConditions.push(`ci.project_id IN (${sqlPlaceholders(projectIds)})`)
    interactionParams.push(...projectIds)
  }
  const interactions = await safeAll(
    db,
    `SELECT ci.id, ci.title, ci.summary, ci.interaction_type, ci.status, ci.occurred_at,
            ci.source_type, ci.source_url, c.name AS client_name, p.name AS project_name
     FROM client_interactions ci
     LEFT JOIN clients c ON c.id = ci.client_id AND c.organization_id = ci.organization_id
     LEFT JOIN projects p ON p.id = ci.project_id AND p.organization_id = ci.organization_id
     WHERE ci.organization_id = ?
       AND (
         ? = 1
         OR EXISTS (
           SELECT 1
           FROM tasks vt
           LEFT JOIN projects vtp ON vtp.id = vt.project_id AND vtp.organization_id = vt.organization_id
           WHERE vt.organization_id = ci.organization_id
             AND vt.assignee_member_id = ?
             AND (vt.client_id = ci.client_id OR vtp.client_id = ci.client_id)
         )
       )
       AND (${interactionConditions.join(" OR ")})
     ORDER BY ci.occurred_at DESC, ci.updated_at DESC
     LIMIT 8`,
    interactionParams,
  )
  if (interactions.length) sources.add("client_interactions")

  const taskLike = buildLikeWhere(["t.title", "t.description", "t.rich_description", "t.client_name"], terms)
  const taskConditions = [taskLike.where]
  const taskParams: unknown[] = [principal.organizationId, isManager ? 1 : 0, principal.memberId, ...taskLike.params]
  if (clientIds.length) {
    taskConditions.push(`t.client_id IN (${sqlPlaceholders(clientIds)})`)
    taskParams.push(...clientIds)
  }
  if (projectIds.length) {
    taskConditions.push(`t.project_id IN (${sqlPlaceholders(projectIds)})`)
    taskParams.push(...projectIds)
  }
  const tasks = await safeAll(
    db,
    `SELECT t.id, t.title, t.status, t.column_id, t.actual_minutes, t.estimated_minutes, t.client_name, p.name AS project_name, t.updated_at
     FROM tasks t
     LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
     WHERE t.organization_id = ?
       AND (? = 1 OR t.assignee_member_id = ?)
       AND (${taskConditions.join(" OR ")})
     ORDER BY t.updated_at DESC
     LIMIT 12`,
    taskParams,
  )
  if (tasks.length) sources.add("tasks")

  const timeConditions: string[] = []
  const timeParams: unknown[] = [principal.organizationId, isManager ? 1 : 0, principal.memberId]
  if (clientIds.length) {
    timeConditions.push(`te.client_id IN (${sqlPlaceholders(clientIds)})`)
    timeParams.push(...clientIds)
  }
  if (projectIds.length) {
    timeConditions.push(`te.project_id IN (${sqlPlaceholders(projectIds)})`)
    timeParams.push(...projectIds)
  }
  const timeEntries = timeConditions.length
    ? await safeAll(
        db,
        `SELECT COUNT(*) AS entry_count,
                SUM(te.minutes) AS total_minutes,
                SUM(CASE WHEN te.billable = 1 THEN te.minutes ELSE 0 END) AS billable_minutes,
                MAX(te.entry_date) AS last_entry_date
         FROM time_entries te
         WHERE te.organization_id = ?
           AND (? = 1 OR te.member_id = ?)
           AND (${timeConditions.join(" OR ")})`,
        timeParams,
      )
    : []
  if (Number(timeEntries[0]?.entry_count || 0) > 0) sources.add("time_entries")

  if (!clients.length && !projects.length && !quotes.length && !tasks.length && Number(timeEntries[0]?.entry_count || 0) === 0) {
    return { text: "", sources: [] as string[], fallbackText: "" }
  }

  const lines = [
    "LOOKUP MIRATO SULLA DOMANDA",
    `Termini riconosciuti: ${terms.join(", ")}`,
    "Usa questi dati come fonte prioritaria per la risposta. Se manca un importo pagato/incassato, dichiaralo esplicitamente.",
  ]

  if (clients.length) {
    lines.push(
      "",
      "Clienti trovati:",
      ...clients.map(
        (client: any) =>
          `- ${compact(client.name, 90)} | azienda ${compact(client.company || "-", 90)} | stato ${compact(client.status, 30)} | note ${compact(client.notes || "-", 180)}`,
      ),
    )
  }

  if (projects.length) {
    lines.push(
      "",
      "Progetti trovati:",
      ...projects.map(
        (project: any) =>
          `- ${compact(project.name, 100)} | cliente ${compact(project.client_name || "-", 90)} | stato ${compact(project.status, 40)} | budget ${formatCurrencyCents(project.budget_cents, "EUR")} | aggiornato ${formatDate(project.updated_at)}`,
      ),
    )
  }

  if (quotes.length) {
    lines.push(
      "",
      "Preventivi trovati:",
      ...quotes.map(
        (quote: any) =>
          `- ${compact(quote.title, 110)} | cliente ${compact(quote.client_name || "-", 90)} | stato ${compact(quote.status, 40)} | totale ${formatCurrencyCents(quote.total_cents, String(quote.currency || "EUR"))} | aggiornato ${formatDate(quote.updated_at)} | descrizione ${compact(quote.description || "-", 160)}`,
      ),
    )
  } else if (hasFinancialIntent(message)) {
    lines.push("", "Preventivi trovati: nessuno collegato ai termini/clienti rilevati.")
  }

  if (externalRecords.length) {
    lines.push(
      "",
      "Fonti importate trovate:",
      ...externalRecords.map((record: any) => {
        const amount = record.amount_cents ? ` | importo ${formatCurrencyCents(record.amount_cents, record.currency || "EUR")}` : ""
        const client = record.client_name ? ` | cliente ${compact(record.client_name, 80)}` : ""
        return `- ${compact(record.title, 120)} | tipo ${compact(record.record_type, 30)}${client}${amount} | fonte ${compact(record.provider, 30)} | confidence ${compact(record.confidence, 30)} | ${compact(record.summary || "-", 180)}`
      }),
    )
  } else if (hasFinancialIntent(message)) {
    lines.push("", "Fonti importate trovate: nessuna fonte esterna collegata ai termini rilevati.")
  }

  if (interactions.length) {
    lines.push(
      "",
      "Call/incontri/note cliente:",
      ...interactions.map(
        (interaction: any) =>
          `- ${compact(interaction.title, 120)} | tipo ${compact(interaction.interaction_type, 30)} | cliente ${compact(interaction.client_name || "-", 80)} | progetto ${compact(interaction.project_name || "-", 80)} | data ${formatDate(interaction.occurred_at)} | ${compact(interaction.summary || "-", 160)}`,
      ),
    )
  }

  const entryCount = Number(timeEntries[0]?.entry_count || 0)
  if (entryCount > 0) {
    const totalMinutes = Number(timeEntries[0]?.total_minutes || 0)
    const billableMinutes = Number(timeEntries[0]?.billable_minutes || 0)
    lines.push(
      "",
      `Consuntivi trovati: ${entryCount} righe, ${Math.round(totalMinutes / 60)}h totali, ${Math.round(billableMinutes / 60)}h fatturabili, ultimo ${formatDate(timeEntries[0]?.last_entry_date)}.`,
    )
  } else if (hasFinancialIntent(message)) {
    lines.push("", "Consuntivi trovati: nessuna time entry collegata ai termini/clienti rilevati.")
  }

  if (tasks.length) {
    lines.push(
      "",
      "Task rilevanti:",
      ...tasks.slice(0, 6).map(
        (task: any) =>
          `- ${compact(task.title, 120)} | stato ${compact(task.column_id || task.status, 40)} | cliente ${compact(task.client_name || "-", 80)} | progetto ${compact(task.project_name || "-", 80)} | consuntivo task ${Math.round(Number(task.actual_minutes || 0) / 60)}h`,
      ),
    )
  }

  const factsText = lines.join("\n").slice(0, 5000)
  return {
    text: factsText,
    sources: Array.from(sources),
    fallbackText: buildNoDataBusinessFallback(message, factsText),
  }
}

async function getConversationHistory(db: any, sessionId: string, organizationId: string, memberId: string) {
  if (!db || !sessionId) return []

  try {
    const result = await db
      .prepare(
        `SELECT role, content
         FROM chat_messages
         WHERE session_id = ? AND organization_id = ? AND member_id = ?
         ORDER BY created_at DESC
         LIMIT 18`,
      )
      .bind(sessionId, organizationId, memberId)
      .all()

    return (result.results || [])
      .reverse()
      .map((message: any) => ({
        role: safeRole(message.role),
        content: compact(message.content, 1400),
      }))
      .filter((message: any) => message.role === "user" || message.role === "assistant")
  } catch (error) {
    console.error("Error loading D1 chat history:", error)
    return []
  }
}

async function getSessionMemory(db: any, sessionId: string, organizationId: string, memberId: string) {
  if (!db || !sessionId || sessionId.startsWith("temp_")) return ""

  try {
    const row = await db
      .prepare(
        `SELECT memory_summary
         FROM chat_sessions
         WHERE id = ? AND organization_id = ? AND member_id = ?
         LIMIT 1`,
      )
      .bind(sessionId, organizationId, memberId)
      .first()

    return compact(row?.memory_summary, 3500)
  } catch {
    return ""
  }
}

async function getStoredMemories(db: any, organizationId: string, memberId: string): Promise<StoredMemory[]> {
  if (!db) return []

  try {
    const result = await db
      .prepare(
        `SELECT memory_key, memory_value, source, updated_at
         FROM assistant_memories
         WHERE organization_id = ?
           AND (member_id = ? OR scope = 'organization')
         ORDER BY updated_at DESC
         LIMIT 12`,
      )
      .bind(organizationId, memberId)
      .all()

    return (result.results || []).map((row: any) => ({
      key: compact(row.memory_key, 80),
      value: compact(row.memory_value, 280),
      source: compact(row.source, 40),
    }))
  } catch {
    return []
  }
}

function extractMemoriesFromMessage(message: string) {
  const normalized = compact(message, 900)
  if (!normalized) return []

  const triggers = [
    "ricorda",
    "ricordati",
    "tieni a mente",
    "preferisco",
    "preferiamo",
    "noi usiamo",
    "da ora",
    "importante",
    "righello",
  ]

  if (!triggers.some((trigger) => normalized.toLowerCase().includes(trigger))) {
    return []
  }

  return [
    {
      key: normalized.slice(0, 70),
      value: normalized,
    },
  ]
}

async function saveExtractedMemories(db: any, organizationId: string, memberId: string, message: string) {
  const memories = extractMemoriesFromMessage(message)
  if (!db || memories.length === 0) return

  try {
    const now = new Date().toISOString()
    await db.batch(
      memories.map((memory) =>
        db
          .prepare(
            `INSERT INTO assistant_memories
             (id, organization_id, member_id, scope, memory_key, memory_value, source, confidence, created_at, updated_at)
             VALUES (?, ?, ?, 'user', ?, ?, 'chat', 75, ?, ?)`,
          )
          .bind(createId("memai"), organizationId, memberId, memory.key, memory.value, now, now),
      ),
    )
  } catch (error) {
    console.warn("Assistant memory save skipped:", error)
  }
}

function redactGraphMemoryText(value: string, limit = 1200) {
  return compact(value, limit)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, "[REDACTED_API_KEY]")
    .replace(/\b(api[_\s-]?key|token|password|secret)\s*[:=]\s*\S+/gi, "$1=[REDACTED]")
}

function parseGraphMemoryCommand(message: string) {
  const trimmed = message.trim()
  const match = trimmed.match(/^(?:salva|inserisci|aggiungi|memorizza)\s+(?:nel|nella|in)\s+(?:grafo|graph memory|memoria)(?::|\s+-\s+|\s+)([\s\S]+)$/i)
  if (!match) return null

  const rawBody = match[1].trim()
  if (!rawBody) return null

  const fields: Record<string, string> = {}
  for (const part of rawBody.split(";")) {
    const [rawKey, ...rawValue] = part.split("=")
    const key = rawKey?.trim().toLowerCase()
    const value = rawValue.join("=").trim()
    if (key && value) fields[key] = value
  }

  const fallbackTitle = rawBody.split(/[.\n]/)[0]?.trim().slice(0, 120) || "Memoria manuale"
  const title = fields.titolo || fields.title || fallbackTitle
  const summary = fields.sommario || fields.summary || fields.descrizione || fields.description || rawBody
  const nodeType = fields.tipo || fields.type || "knowledge_base"
  const sourceType = fields.sorgente || fields.source || "manual"
  const confidenceValue = fields.confidence || fields.fiducia || "manual"
  const confidence: AgenticGraphConfidence =
    confidenceValue === "extracted" || confidenceValue === "inferred" || confidenceValue === "ambiguous" || confidenceValue === "manual"
      ? confidenceValue
      : "manual"
  const tags = (fields.tag || fields.tags || "chat,manual")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12)

  return {
    nodeType: redactGraphMemoryText(nodeType, 60).replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() || "knowledge_base",
    title: redactGraphMemoryText(title, 160),
    summary: redactGraphMemoryText(summary, 1200),
    sourceType: redactGraphMemoryText(sourceType, 80).replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase() || "manual",
    sourceUrl: fields.url || fields.sourceurl || null,
    confidence,
    tags,
  }
}

function extractGraphSearchTerms(message: string) {
  const stop = new Set(["questo", "quello", "della", "delle", "degli", "grafo", "graph", "memory", "salva", "inserisci", "aggiungi", "optima"])
  return Array.from(
    new Set(
      compact(message, 320)
        .toLowerCase()
        .replace(/[^a-z0-9àèéìòù\s-]/gi, " ")
        .split(/\s+/)
        .map((term) => term.trim())
        .filter((term) => term.length >= 4 && !stop.has(term)),
    ),
  ).slice(0, 4)
}

async function buildGraphContext(db: any, principal: WorkspacePrincipal, message: string) {
  if (!db) return { text: "", sources: [] as string[] }

  const terms = extractGraphSearchTerms(message)
  const byId = new Map<string, Awaited<ReturnType<typeof listAgenticGraphNodes>>[number]>()

  for (const term of terms) {
    const nodes = await listAgenticGraphNodes(db, principal, { query: term, limit: 5 })
    for (const node of nodes) byId.set(node.id, node)
  }

  if (byId.size < 4) {
    const recent = await listAgenticGraphNodes(db, principal, { limit: 8 })
    for (const node of recent) byId.set(node.id, node)
  }

  const nodes = Array.from(byId.values()).slice(0, 10)
  if (!nodes.length) return { text: "", sources: [] }

  return {
    text: [
      "GRAPH MEMORY ÓPTIMA",
      "Questi nodi sono contesto aziendale tenant-scoped. Usa confidence/source; non inventare relazioni mancanti.",
      ...nodes.map(
        (node) =>
          `- ${node.title} | tipo ${node.nodeType} | source ${node.sourceType} | confidence ${node.confidence} | ${compact(node.summary, 260)}`,
      ),
    ].join("\n"),
    sources: ["agentic_graph"],
  }
}

function buildNextMemorySummary(previous: string, userMessage: string, assistantText: string) {
  const additions = [
    `Ultimo bisogno utente: ${compact(userMessage, 420)}`,
    `Risposta/decisione recente: ${compact(assistantText, 520)}`,
  ]
  const explicit = extractMemoriesFromMessage(userMessage).map((memory) => `Memoria esplicita: ${memory.value}`)
  return [...(previous ? [previous] : []), ...explicit, ...additions].join("\n").slice(-4200)
}

async function updateSessionMemory(
  db: any,
  sessionId: string,
  organizationId: string,
  memberId: string,
  previous: string,
  userMessage: string,
  assistantText: string,
  contextSources: string[],
) {
  if (!db || !sessionId || sessionId.startsWith("temp_")) return

  try {
    await db
      .prepare(
        `UPDATE chat_sessions
         SET memory_summary = ?,
             model = ?,
             context_sources_json = ?,
             updated_at = ?
         WHERE id = ? AND organization_id = ? AND member_id = ?`,
      )
      .bind(
        buildNextMemorySummary(previous, userMessage, assistantText),
        OPENAI_CHAT_MODEL,
        JSON.stringify(contextSources),
        new Date().toISOString(),
        sessionId,
        organizationId,
        memberId,
      )
      .run()
  } catch {
    // The memory columns are introduced by a migration. Chat should keep working even before it is applied.
  }
}

async function saveMessage(db: any, sessionId: string, organizationId: string, memberId: string, role: string, content: string) {
  if (!db || !sessionId || sessionId.startsWith("temp_")) return

  try {
    const now = new Date().toISOString()

    await db.batch([
      db
        .prepare(
          `INSERT INTO chat_messages (id, session_id, organization_id, member_id, role, content, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(createId("msg"), sessionId, organizationId, memberId, role, content, now),
      db
        .prepare(
          `UPDATE chat_sessions
           SET last_message = ?, updated_at = ?
           WHERE id = ? AND organization_id = ? AND member_id = ?`,
        )
        .bind(content.slice(0, 200), now, sessionId, organizationId, memberId),
    ])
  } catch (error) {
    console.error("Error saving D1 chat message:", error)
  }
}

async function migrateLegacyChatOwnership(db: any, principal: WorkspacePrincipal, clerkUserId: string) {
  if (!db || principal.memberId === clerkUserId) return

  try {
    await db.batch([
      db
        .prepare(
          `UPDATE chat_sessions
           SET member_id = ?, organization_id = ?
           WHERE member_id = ?`,
        )
        .bind(principal.memberId, principal.organizationId, clerkUserId),
      db
        .prepare(
          `UPDATE chat_messages
           SET member_id = ?, organization_id = ?
           WHERE member_id = ?`,
        )
        .bind(principal.memberId, principal.organizationId, clerkUserId),
    ])
  } catch (error) {
    console.warn("Legacy chat ownership migration skipped:", error)
  }
}

async function createSessionIfNeeded(db: any, sessionId: string | undefined, organizationId: string, memberId: string, firstMessage: string) {
  const newSessionId = createId("chat")
  if (!db) return `temp_${Date.now()}`

  if (sessionId && !sessionId.startsWith("temp_")) {
    try {
      const existing = await db
        .prepare(
          `SELECT id
           FROM chat_sessions
           WHERE id = ? AND organization_id = ? AND member_id = ?`,
        )
        .bind(sessionId, organizationId, memberId)
        .first()

      if (existing) return sessionId
    } catch (error) {
      console.error("Error validating D1 chat session:", error)
    }
  }

  try {
    await db
      .prepare(
        `INSERT INTO chat_sessions (id, organization_id, member_id, title, last_message, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newSessionId,
        organizationId,
        memberId,
        firstMessage.slice(0, 80),
        firstMessage.slice(0, 200),
        new Date().toISOString(),
        new Date().toISOString(),
      )
      .run()
    return newSessionId
  } catch (error) {
    console.error("Error creating D1 chat session:", error)
    return `temp_${Date.now()}`
  }
}

async function buildOperationalContext(db: any, principal: WorkspacePrincipal) {
  if (!db) {
    return {
      text: "Contesto piattaforma non disponibile: binding database assente.",
      sources: [] as string[],
    }
  }

  const isManager = ["super-admin", "admin", "direzione", "capo-reparto"].includes(principal.role)
  const today = new Date().toISOString().slice(0, 10)
  const taskVisibility = isManager ? "" : "AND t.assignee_member_id = ?"
  const taskParams = isManager ? [principal.organizationId] : [principal.organizationId, principal.memberId]
  const sources: string[] = []

  const [taskSummary] = await safeAll(
    db,
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN COALESCE(t.column_id, t.status) IN ('done', 'completed', 'completato') THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN t.due_at IS NOT NULL AND date(t.due_at) < date('now') AND COALESCE(t.column_id, t.status) NOT IN ('done', 'completed', 'completato') THEN 1 ELSE 0 END) AS overdue,
       SUM(CASE WHEN t.due_at IS NOT NULL AND date(t.due_at) BETWEEN date('now') AND date('now', '+7 day') AND COALESCE(t.column_id, t.status) NOT IN ('done', 'completed', 'completato') THEN 1 ELSE 0 END) AS due_soon
     FROM tasks t
     WHERE t.organization_id = ? ${taskVisibility}`,
    taskParams,
  )
  if (taskSummary) sources.push("tasks")

  const tasks = await safeAll(
    db,
    `SELECT t.title, t.status, t.column_id, t.priority, t.due_at, t.client_name, t.assignee_name, p.name AS project_name
     FROM tasks t
     LEFT JOIN projects p ON p.id = t.project_id
     WHERE t.organization_id = ?
       ${taskVisibility}
     ORDER BY
       CASE WHEN t.due_at IS NULL THEN 1 ELSE 0 END,
       date(t.due_at) ASC,
       t.updated_at DESC
     LIMIT 10`,
    taskParams,
  )

  const projectVisibility = isManager
    ? "p.organization_id = ?"
    : "p.organization_id = ? AND EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.member_id = ?)"
  const projectParams = isManager ? [principal.organizationId] : [principal.organizationId, principal.memberId]
  const projects = await safeAll(
    db,
    `SELECT p.name, p.status, p.due_at, p.budget_cents, c.name AS client_name,
       COUNT(t.id) AS task_count,
       SUM(CASE WHEN COALESCE(t.column_id, t.status) IN ('done', 'completed', 'completato') THEN 1 ELSE 0 END) AS completed_tasks
     FROM projects p
     LEFT JOIN clients c ON c.id = p.client_id
     LEFT JOIN tasks t ON t.project_id = p.id
     WHERE ${projectVisibility}
     GROUP BY p.id
     ORDER BY p.updated_at DESC
     LIMIT 8`,
    projectParams,
  )
  if (projects.length) sources.push("projects")

  const clients = isManager
    ? await safeAll(
        db,
        `SELECT c.name, c.status, c.company, COUNT(t.id) AS task_count
         FROM clients c
         LEFT JOIN tasks t ON t.client_id = c.id
         WHERE c.organization_id = ?
         GROUP BY c.id
         ORDER BY c.updated_at DESC
         LIMIT 8`,
        [principal.organizationId],
      )
    : []
  if (clients.length) sources.push("clients")

  const people = isManager
    ? await safeAll(
        db,
        `SELECT m.first_name, m.last_name, m.email, m.role, wd.check_in_at, wd.check_out_at, wd.status
         FROM members m
         LEFT JOIN work_days wd ON wd.member_id = m.id AND wd.organization_id = m.organization_id AND wd.entry_date = ?
         WHERE m.organization_id = ? AND COALESCE(m.status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
         ORDER BY m.role ASC, m.first_name ASC, m.email ASC
         LIMIT 16`,
        [today, principal.organizationId],
      )
    : []
  if (people.length) sources.push("members", "presence")

  const lines = [
    "SNAPSHOT OPERATIVO ÓPTIMA",
    `Data snapshot: ${today}`,
    `Visibilità utente: ${isManager ? "manager/team" : "personale"}`,
    "",
    `Task: ${Number(taskSummary?.total || 0)} totali, ${Number(taskSummary?.completed || 0)} completati, ${Number(taskSummary?.overdue || 0)} in ritardo, ${Number(taskSummary?.due_soon || 0)} entro 7 giorni.`,
    ...tasks.map(
      (task: any) =>
        `- Task: ${compact(task.title, 120)} | stato ${compact(task.column_id || task.status, 40)} | priorità ${compact(task.priority, 30)} | scadenza ${formatDate(task.due_at)} | cliente ${compact(task.client_name || "-", 80)} | progetto ${compact(task.project_name || "-", 80)} | assegnato ${compact(task.assignee_name || "-", 80)}`,
    ),
    "",
    "Progetti rilevanti:",
    ...projects.map(
      (project: any) =>
        `- ${compact(project.name, 100)} | cliente ${compact(project.client_name || "-", 80)} | stato ${compact(project.status, 40)} | scadenza ${formatDate(project.due_at)} | task ${Number(project.completed_tasks || 0)}/${Number(project.task_count || 0)} | budget €${(Number(project.budget_cents || 0) / 100).toLocaleString("it-IT")}`,
    ),
  ]

  if (clients.length) {
    lines.push(
      "",
      "Clienti recenti:",
      ...clients.map(
        (client: any) =>
          `- ${compact(client.name, 90)} | azienda ${compact(client.company || "-", 80)} | stato ${compact(client.status, 30)} | task ${Number(client.task_count || 0)}`,
      ),
    )
  }

  if (people.length) {
    lines.push(
      "",
      "Presenza team oggi:",
      ...people.map((person: any) => {
        const name = compact([person.first_name, person.last_name].filter(Boolean).join(" ") || person.email, 100)
        const status = person.status === "absent" ? "assente" : person.check_in_at && !person.check_out_at ? "presente" : person.check_out_at ? "uscito" : "non segnato"
        return `- ${name} | ruolo ${compact(person.role, 40)} | ${status}`
      }),
    )
  }

  return {
    text: lines.join("\n").slice(0, 6000),
    sources: Array.from(new Set(sources)),
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    const user = await requireClerkUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { message, sessionId } = await request.json()

    if (!message) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getCloudflareDb()
    if (!db) {
      return Response.json({ error: "Database Cloudflare non disponibile." }, { status: 500 })
    }

    const principal = await ensureWorkspacePrincipal(db, user)
    await migrateLegacyChatOwnership(db, principal, user.id)

    const currentSessionId = await createSessionIfNeeded(db, sessionId, principal.organizationId, principal.memberId, message)
    const conversationHistory = await getConversationHistory(db, currentSessionId, principal.organizationId, principal.memberId)
    const sessionMemory = await getSessionMemory(db, currentSessionId, principal.organizationId, principal.memberId)
    const storedMemories = await getStoredMemories(db, principal.organizationId, principal.memberId)
    const operationalContext = await buildOperationalContextSnapshot(db, principal)
    const graphContext = await buildGraphContext(db, principal, message)
    const businessFacts = await buildQuestionScopedBusinessFacts(db, principal, message)

    await saveMessage(db, currentSessionId, principal.organizationId, principal.memberId, "user", message)
    await saveExtractedMemories(db, principal.organizationId, principal.memberId, message)

    const graphMemoryCommand = parseGraphMemoryCommand(message)
    if (graphMemoryCommand) {
      const encoder = new TextEncoder()
      let assistantText = ""

      if (!AGENT_ADMIN_ROLES.has(principal.role)) {
        assistantText = "Non posso scrivere nella graph memory da questo account. Serve un ruolo direzione/admin. Posso comunque aiutarti a preparare il testo da far approvare."
      } else {
        const node = await upsertAgenticGraphNode(db, principal, {
          nodeType: graphMemoryCommand.nodeType,
          title: graphMemoryCommand.title,
          summary: graphMemoryCommand.summary,
          sourceType: graphMemoryCommand.sourceType,
          sourceUrl: graphMemoryCommand.sourceUrl,
          confidence: graphMemoryCommand.confidence,
          tags: graphMemoryCommand.tags,
          properties: {
            insertedFrom: "ai-assistant-chat-command",
            conversationId: currentSessionId,
            manualReview: true,
          },
        })

        assistantText = [
          `Ho salvato il nodo nella graph memory: **${node?.title || graphMemoryCommand.title}**.`,
          `Tipo: ${node?.nodeType || graphMemoryCommand.nodeType}. Source: ${node?.sourceType || graphMemoryCommand.sourceType}. Confidence: ${node?.confidence || graphMemoryCommand.confidence}.`,
          "L'ho marcato come inserimento manuale/review: le relazioni con clienti, task, repo o skill vanno aggiunte dal dettaglio nodo o tramite un job agentico.",
        ].join("\n")
      }

      await saveMessage(db, currentSessionId, principal.organizationId, principal.memberId, "assistant", assistantText)
      await updateSessionMemory(
        db,
        currentSessionId,
        principal.organizationId,
        principal.memberId,
        sessionMemory,
        message,
        assistantText,
        ["agentic_graph", "chat"],
      )

      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ sessionId: currentSessionId, model: "graph-memory-command", contextSources: ["agentic_graph", "chat"] })}\n\n`,
            ),
          )
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: assistantText })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()
        },
      })

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      })
    }

    const contextSources = Array.from(new Set([...operationalContext.sources, ...graphContext.sources, ...businessFacts.sources]))

    const messages: ChatGenerationMessage[] = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      {
        role: "system" as const,
        content: [
          sessionMemory ? `MEMORIA RIASSUNTIVA DELLA CONVERSAZIONE:\n${sessionMemory}` : "",
          storedMemories.length
            ? `MEMORIE UTENTE/ORGANIZZAZIONE:\n${storedMemories.map((memory) => `- ${memory.key}: ${memory.value}`).join("\n")}`
            : "",
          operationalContext.text,
          businessFacts.text,
          graphContext.text,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
      ...conversationHistory,
      { role: "user" as const, content: message },
    ]

    const fullPrompt = JSON.stringify(messages)
    const estimatedInputTokens = estimateTokens(fullPrompt)
    const openai = await createRuntimeOpenAI()
    let fullText = ""
    let usedModel = OPENAI_CHAT_MODEL

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generated = await generateOperationalAnswer(openai, messages)
          usedModel = generated.model
          fullText = cleanGeneratedText(generated.text) || businessFacts.fallbackText || buildImmediateOperationalFallback(message, contextSources)

          enqueueSse(controller, { sessionId: currentSessionId, model: usedModel, contextSources })
          enqueueTextInChunks(controller, fullText)

          await saveMessage(db, currentSessionId, principal.organizationId, principal.memberId, "assistant", fullText)
          await updateSessionMemory(
            db,
            currentSessionId,
            principal.organizationId,
            principal.memberId,
            sessionMemory,
            message,
            fullText,
            contextSources,
          )

          if (db) {
            const outputTokens = Math.ceil(fullText.length / 3.5)
            try {
              await db
                .prepare(
                  `INSERT INTO ai_usage (id, organization_id, member_id, feature, model, input_tokens, output_tokens)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                )
                .bind(createId("ai"), principal.organizationId, principal.memberId, "chat", usedModel, estimatedInputTokens, outputTokens)
                .run()
            } catch (error) {
              console.error("Error logging chat usage:", error)
            }
          }

          enqueueSse(controller, { done: true })
          controller.close()
        } catch (error) {
          const err = error as Error
          enqueueSse(controller, { error: "Errore durante la generazione della risposta: " + err.message })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    const err = error as Error
    console.error("AI Chat POST handler error:", error)
    return Response.json({ error: "Errore interno del server: " + err.message }, { status: 500 })
  }
}
