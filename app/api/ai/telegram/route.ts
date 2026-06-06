export const dynamic = "force-dynamic"

import { generateText } from "ai"
import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { OPENAI_CHAT_MODEL } from "@/lib/ai/models"
import { createRuntimeOpenAI } from "@/lib/ai/openai-runtime"
import { buildOperationalContextSnapshot } from "@/lib/operational-context"
import type { WorkspacePrincipal } from "@/lib/workspace-db"

const SYSTEM_PROMPT = `Sei l'assistente operativo Telegram di Optima per Righello.

Comportamento:
- Rispondi in italiano, in modo breve, operativo e concreto.
- Usa il contesto Optima come fonte read-only: task, clienti, progetti, team, rapportini, repository e job.
- Non inventare dati mancanti: se non vedi un dato nello snapshot, dillo.
- Se una richiesta richiede azione reale o privilegi, proponi il prossimo passo e rimanda al control plane Optima.
- Telegram e un canale conversazionale: non eseguire deploy, pagamenti o modifiche distruttive da chat.` 

type TelegramUser = {
  id?: number
  username?: string
  first_name?: string
  last_name?: string
}

type TelegramMessage = {
  message_id?: number
  text?: string
  chat?: { id?: number | string; type?: string }
  from?: TelegramUser
}

type TelegramUpdate = {
  update_id?: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
}

function compact(value: unknown, limit = 900) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit)
}

function envList(name: string) {
  return String(process.env[name] || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

function parseMemberEmailMap() {
  const raw = process.env.TELEGRAM_MEMBER_EMAIL_MAP
  if (!raw) return new Map<string, string>()
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return new Map<string, string>()
    return new Map(Object.entries(parsed).map(([key, value]) => [key.toLowerCase(), String(value)]))
  } catch {
    return new Map<string, string>()
  }
}

function isAllowedTelegramSender(message: TelegramMessage) {
  const allowedChatIds = envList("TELEGRAM_ALLOWED_CHAT_IDS")
  const allowedUsernames = envList("TELEGRAM_ALLOWED_USERNAMES")
  if (!allowedChatIds.length && !allowedUsernames.length) return false

  const chatId = String(message.chat?.id || "").toLowerCase()
  const username = String(message.from?.username || "").toLowerCase()

  return Boolean((chatId && allowedChatIds.includes(chatId)) || (username && allowedUsernames.includes(username)))
}

async function findTelegramPrincipal(db: any, message: TelegramMessage): Promise<WorkspacePrincipal | null> {
  const username = String(message.from?.username || "").toLowerCase()
  const chatId = String(message.chat?.id || "").toLowerCase()
  const emailMap = parseMemberEmailMap()
  const email =
    emailMap.get(username) ||
    emailMap.get(`@${username}`) ||
    emailMap.get(chatId) ||
    process.env.TELEGRAM_DEFAULT_MEMBER_EMAIL ||
    ""

  if (!email.trim()) return null

  const row = await db
    .prepare(
      `SELECT id, organization_id, role, email
       FROM members
       WHERE lower(email) = lower(?)
         AND COALESCE(status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
       ORDER BY
         CASE role
           WHEN 'super-admin' THEN 0
           WHEN 'admin' THEN 1
           WHEN 'direzione' THEN 2
           WHEN 'capo-reparto' THEN 3
           ELSE 4
         END,
         created_at ASC
       LIMIT 1`,
    )
    .bind(email)
    .first()

  if (!row?.id || !row?.organization_id) return null
  return {
    organizationId: String(row.organization_id),
    memberId: String(row.id),
    role: String(row.role || "member"),
    email: String(row.email || email),
  }
}

async function ensureTelegramSession(db: any, principal: WorkspacePrincipal, message: TelegramMessage) {
  const chatId = String(message.chat?.id || "unknown").slice(0, 80)
  const title = `Telegram ${chatId}`
  const existing = await db
    .prepare(
      `SELECT id
       FROM chat_sessions
       WHERE organization_id = ? AND member_id = ? AND title = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .bind(principal.organizationId, principal.memberId, title)
    .first()

  if (existing?.id) return String(existing.id)

  const now = new Date().toISOString()
  const id = createId("chat")
  await db
    .prepare(
      `INSERT INTO chat_sessions (id, organization_id, member_id, title, last_message, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, principal.organizationId, principal.memberId, title, "Canale Telegram collegato", now, now)
    .run()
  return id
}

async function getHistory(db: any, sessionId: string, principal: WorkspacePrincipal) {
  const result = await db
    .prepare(
      `SELECT role, content
       FROM chat_messages
       WHERE session_id = ? AND organization_id = ? AND member_id = ?
       ORDER BY created_at DESC
       LIMIT 14`,
    )
    .bind(sessionId, principal.organizationId, principal.memberId)
    .all()

  return (result.results || [])
    .reverse()
    .map((row: any) => ({
      role: row.role === "assistant" ? "assistant" as const : "user" as const,
      content: compact(row.content, 1100),
    }))
}

async function getSessionMemory(db: any, sessionId: string, principal: WorkspacePrincipal) {
  try {
    const row = await db
      .prepare(
        `SELECT memory_summary
         FROM chat_sessions
         WHERE id = ? AND organization_id = ? AND member_id = ?
         LIMIT 1`,
      )
      .bind(sessionId, principal.organizationId, principal.memberId)
      .first()
    return compact(row?.memory_summary, 2500)
  } catch {
    return ""
  }
}

async function saveChatMessage(db: any, sessionId: string, principal: WorkspacePrincipal, role: "user" | "assistant", content: string) {
  const now = new Date().toISOString()
  await db.batch([
    db
      .prepare(
        `INSERT INTO chat_messages (id, session_id, organization_id, member_id, role, content, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(createId("msg"), sessionId, principal.organizationId, principal.memberId, role, content, now),
    db
      .prepare(
        `UPDATE chat_sessions
         SET last_message = ?, updated_at = ?, model = ?, context_sources_json = ?
         WHERE id = ? AND organization_id = ? AND member_id = ?`,
      )
      .bind(content.slice(0, 200), now, OPENAI_CHAT_MODEL, JSON.stringify(["telegram"]), sessionId, principal.organizationId, principal.memberId),
  ])
}

async function updateMemory(db: any, sessionId: string, principal: WorkspacePrincipal, previous: string, userText: string, assistantText: string) {
  try {
    const next = [
      previous,
      `Canale Telegram - ultima richiesta: ${compact(userText, 360)}`,
      `Canale Telegram - risposta: ${compact(assistantText, 420)}`,
    ]
      .filter(Boolean)
      .join("\n")
      .slice(-3600)

    await db
      .prepare(
        `UPDATE chat_sessions
         SET memory_summary = ?, updated_at = ?
         WHERE id = ? AND organization_id = ? AND member_id = ?`,
      )
      .bind(next, new Date().toISOString(), sessionId, principal.organizationId, principal.memberId)
      .run()
  } catch {
    // Memory columns may be absent on partially migrated environments.
  }
}

async function createTelegramReply(db: any, principal: WorkspacePrincipal, message: TelegramMessage) {
  const text = compact(message.text, 3600)
  const sessionId = await ensureTelegramSession(db, principal, message)
  const [history, memory, context] = await Promise.all([
    getHistory(db, sessionId, principal),
    getSessionMemory(db, sessionId, principal),
    buildOperationalContextSnapshot(db, principal),
  ])

  await saveChatMessage(db, sessionId, principal, "user", text)

  const openai = await createRuntimeOpenAI()
  const result = await generateText({
    model: openai(OPENAI_CHAT_MODEL),
    maxTokens: 900,
    temperature: 0.55,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "system",
        content: [
          memory ? `MEMORIA TELEGRAM/AI ASSISTANT:\n${memory}` : "",
          `SNAPSHOT OPTIMA:\n${context.text}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
      ...history,
      { role: "user", content: text },
    ],
  })

  const reply = compact(result.text, 3800) || "Non sono riuscito a generare una risposta utile."
  await saveChatMessage(db, sessionId, principal, "assistant", reply)
  await updateMemory(db, sessionId, principal, memory, text, reply)

  try {
    await db
      .prepare(
        `INSERT INTO ai_usage (id, organization_id, member_id, feature, model, input_tokens, output_tokens)
         VALUES (?, ?, ?, 'telegram-chat', ?, ?, ?)`,
      )
      .bind(
        createId("ai"),
        principal.organizationId,
        principal.memberId,
        OPENAI_CHAT_MODEL,
        Math.ceil((text.length + context.text.length + memory.length) / 4),
        Math.ceil(reply.length / 3.5),
      )
      .run()
  } catch {
    // Usage logging should not block Telegram replies.
  }

  return reply
}

async function sendTelegramMessage(chatId: string | number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  const chunks = text.match(/[\s\S]{1,3800}/g) || [text]
  for (const chunk of chunks) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    })
  }
}

function webhookAuthorized(request: Request) {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected) return true
  return request.headers.get("x-telegram-bot-api-secret-token") === expected
}

export async function POST(request: Request) {
  if (!webhookAuthorized(request)) {
    return Response.json({ ok: false, error: "Webhook Telegram non autorizzato." }, { status: 401 })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return Response.json({ ok: false, error: "TELEGRAM_BOT_TOKEN non configurato." }, { status: 503 })
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null
  const message = update?.message || update?.edited_message
  const text = compact(message?.text, 3600)
  const chatId = message?.chat?.id

  if (!message || !text || !chatId) return Response.json({ ok: true, ignored: true })
  if (!isAllowedTelegramSender(message)) return Response.json({ ok: true, ignored: true, reason: "sender-not-allowed" })

  const db = await getCloudflareDb()
  if (!db) return Response.json({ ok: false, error: "Database Cloudflare non disponibile." }, { status: 500 })

  const principal = await findTelegramPrincipal(db, message)
  if (!principal) {
    await sendTelegramMessage(chatId, "Telegram e collegato, ma non ho trovato un membro Optima autorizzato per questo account.")
    return Response.json({ ok: true, ignored: true, reason: "principal-not-found" })
  }

  try {
    const reply = await createTelegramReply(db, principal, message)
    await sendTelegramMessage(chatId, reply)
    return Response.json({ ok: true })
  } catch (error) {
    console.error("Telegram AI assistant error:", error)
    await sendTelegramMessage(chatId, "Errore nel canale Telegram di Optima. Controllo log e configurazione.")
    return Response.json({ ok: false, error: "Errore AI Telegram." }, { status: 500 })
  }
}
