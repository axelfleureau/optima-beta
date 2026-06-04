export const dynamic = "force-dynamic"

import type { NextRequest } from "next/server"
import { streamText } from "ai"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { requireClerkUser } from "@/lib/server-clerk"
import { OPENAI_CHAT_MODEL } from "@/lib/ai/models"
import { createRuntimeOpenAI } from "@/lib/ai/openai-runtime"
import { ensureWorkspacePrincipal, type WorkspacePrincipal } from "@/lib/workspace-db"

type StoredMemory = {
  key: string
  value: string
  source: string
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
- Se proponi integrazioni, distingui tra integrazione già disponibile in Óptima e integrazione consigliata da costruire.`

function estimateTokens(input: string) {
  return Math.ceil(input.length / 4)
}

function compact(value: unknown, limit = 600) {
  return String(value || "")
    .replace(/\s+/g, " ")
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
    const operationalContext = await buildOperationalContext(db, principal)

    await saveMessage(db, currentSessionId, principal.organizationId, principal.memberId, "user", message)
    await saveExtractedMemories(db, principal.organizationId, principal.memberId, message)

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      {
        role: "system" as const,
        content: [
          sessionMemory ? `MEMORIA RIASSUNTIVA DELLA CONVERSAZIONE:\n${sessionMemory}` : "",
          storedMemories.length
            ? `MEMORIE UTENTE/ORGANIZZAZIONE:\n${storedMemories.map((memory) => `- ${memory.key}: ${memory.value}`).join("\n")}`
            : "",
          operationalContext.text,
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
    const result = streamText({
      model: openai(OPENAI_CHAT_MODEL),
      messages,
      maxTokens: 1000,
      temperature: 0.7,
    })

    let fullText = ""

    const stream = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ sessionId: currentSessionId, model: OPENAI_CHAT_MODEL, contextSources: operationalContext.sources })}\n\n`,
            ),
          )

          for await (const delta of result.textStream) {
            if (delta) {
              fullText += delta
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: delta })}\n\n`))
            }
          }

          await saveMessage(db, currentSessionId, principal.organizationId, principal.memberId, "assistant", fullText)
          await updateSessionMemory(
            db,
            currentSessionId,
            principal.organizationId,
            principal.memberId,
            sessionMemory,
            message,
            fullText,
            operationalContext.sources,
          )

          if (db) {
            const outputTokens = Math.ceil(fullText.length / 3.5)
            try {
              await db
                .prepare(
                  `INSERT INTO ai_usage (id, organization_id, member_id, feature, model, input_tokens, output_tokens)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`,
                )
                .bind(createId("ai"), principal.organizationId, principal.memberId, "chat", OPENAI_CHAT_MODEL, estimatedInputTokens, outputTokens)
                .run()
            } catch (error) {
              console.error("Error logging chat usage:", error)
            }
          }

          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()
        } catch (error) {
          const err = error as Error
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ error: "Errore durante la generazione della risposta: " + err.message })}\n\n`,
            ),
          )
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
