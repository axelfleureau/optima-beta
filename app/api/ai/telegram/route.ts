export const dynamic = "force-dynamic"

import { createId, getCloudflareDb } from "@/lib/cloudflare-db"
import { buildOperationalContextSnapshot } from "@/lib/operational-context"
import type { WorkspacePrincipal } from "@/lib/workspace-db"
import { createAgentJob } from "@/lib/agent-jobs"
import {
  buildChatIdReply,
  createTelegramDocumentProposal,
  findAuthorizedTelegramPrincipal,
  inferTelegramTurnDecision,
  isChatIdCommand,
  loadTelegramAgentMemory,
  normalizeTelegramChatId,
  saveTelegramAgentMemory,
  type TelegramAttachment,
} from "@/lib/telegram-agentic-bot"

const TELEGRAM_AGENT_MODEL_LABEL = "telegram-agentic-router"

type TelegramUser = {
  id?: number
  username?: string
  first_name?: string
  last_name?: string
}

type TelegramMessage = {
  message_id?: number
  media_group_id?: string
  text?: string
  caption?: string
  chat?: { id?: number | string; type?: string }
  from?: TelegramUser
  document?: { file_id?: string; file_name?: string; mime_type?: string }
  photo?: Array<{ file_id?: string; file_unique_id?: string; width?: number; height?: number }>
}

type TelegramUpdate = {
  update_id?: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
}

type TelegramInlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; url?: string; callback_data?: string }>>
}

type TelegramPreparedReply = {
  text: string
  replyMarkup?: TelegramInlineKeyboard
}

function compact(value: unknown, limit = 900) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit)
}

function todayRomeIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function addDaysIsoDate(date: string, days: number) {
  const cursor = new Date(`${date}T12:00:00Z`)
  cursor.setUTCDate(cursor.getUTCDate() + days)
  return cursor.toISOString().slice(0, 10)
}

function formatMinutesLabel(minutes: number) {
  const safeMinutes = Math.max(0, Math.round(Number(minutes || 0)))
  const hours = Math.floor(safeMinutes / 60)
  const rest = safeMinutes % 60
  if (hours && rest) return `${hours}h ${rest}m`
  if (hours) return `${hours}h`
  return `${rest}m`
}

function formatBusinessDate(date: string) {
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00Z`))
}

function resolvePersonalWorkSummaryDate(text: string) {
  const lower = text.toLowerCase()
  const asksPersonalWork =
    /\b(cosa|che)\s+(ho|avevo)\s+fatt/.test(lower) ||
    /\b(mie|mie[ei]|mio)\s+(attivit|task|lavor)/.test(lower) ||
    /\b(riassum|riepilog).*\b(ieri|oggi|settimana|giornata)\b/.test(lower)

  if (!asksPersonalWork) return null

  const today = todayRomeIsoDate()
  if (/l['’]altro ieri|altroieri/.test(lower)) return addDaysIsoDate(today, -2)
  if (/\bieri\b/.test(lower)) return addDaysIsoDate(today, -1)
  if (/\boggi\b/.test(lower)) return today

  const explicitDate = lower.match(/\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/)
  if (explicitDate) {
    const currentYear = Number(today.slice(0, 4))
    const day = explicitDate[1].padStart(2, "0")
    const month = explicitDate[2].padStart(2, "0")
    const rawYear = explicitDate[3]
    const year = rawYear ? (rawYear.length === 2 ? `20${rawYear}` : rawYear) : String(currentYear)
    return `${year}-${month}-${day}`
  }

  return null
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
  const authorized = await findAuthorizedTelegramPrincipal(db, message)
  if (authorized) return authorized

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

function extractAttachment(message: TelegramMessage): TelegramAttachment | null {
  if (message.document?.file_id) {
    return {
      kind: "document",
      fileId: message.document.file_id,
      fileName: message.document.file_name,
      mimeType: message.document.mime_type,
      mediaGroupId: message.media_group_id,
      messageId: message.message_id ? String(message.message_id) : undefined,
    }
  }

  const photo = message.photo?.[message.photo.length - 1]
  if (photo?.file_id) {
    return {
      kind: "photo",
      fileId: photo.file_id,
      fileName: `telegram-photo-${photo.file_unique_id || photo.file_id}.jpg`,
      mimeType: "image/jpeg",
      mediaGroupId: message.media_group_id,
      messageId: message.message_id ? String(message.message_id) : undefined,
    }
  }

  return null
}

function preferredModelRoute(action: string) {
  if (action === "status" || action === "reminder" || action === "classify" || action === "task_update") {
    return {
      lane: "operations",
      providerId: "gemma-hosted",
      model: "gemma-hosted",
      policy: "local-first-vps",
      fallback: "codex-chatgpt",
    }
  }

  if (action === "query" || action === "archive" || action === "send_file") {
    return {
      lane: "research",
      providerId: "qwen",
      model: "qwen-long-context",
      policy: "local-first-vps",
      fallback: "codex-chatgpt",
    }
  }

  return {
    lane: "chat",
    providerId: "gemma-hosted",
    model: "gemma-hosted",
    policy: "local-first-vps",
    fallback: "codex-chatgpt",
  }
}

function appBaseUrl() {
  return String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "https://appbeta.wearerighello.com").replace(/\/$/, "")
}

function buildTelegramReplyMarkup(action: string, jobId?: string | null): TelegramInlineKeyboard | undefined {
  const baseUrl = appBaseUrl()
  const rows: TelegramInlineKeyboard["inline_keyboard"] = []

  if (jobId) {
    rows.push([{ text: "Apri revisione in Optima", url: `${baseUrl}/agenti` }])
  }

  if (action === "task_update") {
    rows.push([{ text: "Apri workspace", url: `${baseUrl}/workspace` }])
  } else if (action === "status" || action === "reminder") {
    rows.push([
      { text: "Rapportino", url: `${baseUrl}/rapportini` },
      { text: "Presenze", url: `${baseUrl}/presenze` },
    ])
  } else if (action === "query" || action === "archive" || action === "send_file" || action === "classify") {
    rows.push([{ text: "AI Ops", url: `${baseUrl}/agenti` }])
  }

  rows.push([{ text: "Apri Optima", url: baseUrl }])
  return rows.length ? { inline_keyboard: rows } : undefined
}

function buildOptimaOnlyReplyMarkup(): TelegramInlineKeyboard {
  return { inline_keyboard: [[{ text: "Apri Optima", url: appBaseUrl() }]] }
}

function publicTelegramReply(input: {
  action: string
  text: string
  jobId?: string | null
  confidence?: number
}) {
  let reply = compact(input.text, 3200)

  if (!reply || (input.confidence && input.confidence < 70)) {
    reply = "Ci sono. Dimmi cosa vuoi fare e ti aiuto dal punto giusto."
  }

  const technicalPatterns = [
    /\bAPI\b/i,
    /\bjob agentico\b/i,
    /\bruntime\b/i,
    /\bprovider\b/i,
    /\bmodel route\b/i,
    /\bcontesto Optima\b/i,
    /\boutput revisionabile\b/i,
    /\brunner\b/i,
  ]

  if (technicalPatterns.some((pattern) => pattern.test(reply))) {
    if (input.action === "task_update") {
      reply = "Ho capito la modifica sulla task. La preparo in Optima e ti chiedo conferma se manca qualche dettaglio."
    } else if (input.action === "status" || input.action === "reminder") {
      reply = "Controllo la giornata e ti segnalo cosa manca tra entrata, uscita, rapportino e task."
    } else if (input.action === "query" || input.action === "archive" || input.action === "send_file") {
      reply = "Cerco il documento o l'informazione richiesta. Se trovo un solo risultato utile te lo preparo qui; se ce ne sono diversi ti faccio scegliere."
    } else if (input.action === "classify") {
      reply = "Ho ricevuto il file. Lo preparo per la revisione prima di salvarlo in Optima."
    } else {
      reply = "Ci sono. Ho preso la richiesta e ti guido nel prossimo passaggio."
    }
  }

  if (input.jobId) {
    const suffix =
      input.action === "task_update"
        ? "Ho aperto una proposta in Optima da controllare prima di applicarla."
        : "Ho preparato il passaggio in Optima per la verifica."
    reply = `${reply}\n\n${suffix}`
  }

  return reply
}

function isStartCommand(text: unknown) {
  return /^\/start(?:@\w+)?(?:\s|$)/i.test(compact(text, 120))
}

function telegramIdentityLines(message: TelegramMessage, chatId: string | number) {
  const name = [message.from?.first_name, message.from?.last_name].map((item) => compact(item, 80)).filter(Boolean).join(" ")
  return [
    `chat_id: ${chatId}`,
    message.from?.id ? `telegram_user_id: ${compact(message.from.id, 80)}` : "",
    message.from?.username ? `username: @${compact(message.from.username, 80).replace(/^@/, "")}` : "",
    name ? `nome: ${name}` : "",
  ].filter(Boolean)
}

function buildStartReply(message: TelegramMessage, chatId: string | number) {
  return [
    "Optima Assistant e' attivo.",
    "",
    "Per sicurezza questa chat puo usare dati aziendali solo dopo autorizzazione in Optima.",
    "",
    "Dati da autorizzare:",
    ...telegramIdentityLines(message, chatId),
    "",
    "Cosa fare ora:",
    "1. Invia /chatid se vuoi ricopiare l'ID.",
    "2. Fai autorizzare questo chat_id in Optima per il tuo profilo.",
    "3. Dopo l'autorizzazione posso aiutarti con check-in, check-out, rapportini, task, deliverable e promemoria.",
    "",
    "Se sei gia autorizzato, scrivimi direttamente la richiesta operativa.",
  ].join("\n")
}

function buildUnauthorizedReply(message: TelegramMessage, chatId: string | number) {
  return [
    "Chat Telegram non ancora autorizzata per Optima.",
    "",
    "Non posso leggere o modificare dati aziendali da questa chat finche non viene collegata a un membro autorizzato.",
    "",
    "Invia /chatid e autorizza questo ID in Optima:",
    ...telegramIdentityLines(message, chatId),
  ].join("\n")
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
      .bind(content.slice(0, 200), now, TELEGRAM_AGENT_MODEL_LABEL, JSON.stringify(["telegram"]), sessionId, principal.organizationId, principal.memberId),
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

async function buildPersonalWorkSummaryReply(db: any, principal: WorkspacePrincipal, date: string) {
  const [entriesResult, tasksResult] = await Promise.all([
    db
      .prepare(
        `SELECT te.minutes, te.note, te.entry_date,
                t.title AS task_title,
                p.name AS project_name,
                c.name AS client_name
         FROM time_entries te
         LEFT JOIN tasks t ON t.id = te.task_id AND t.organization_id = te.organization_id
         LEFT JOIN projects p ON p.id = te.project_id AND p.organization_id = te.organization_id
         LEFT JOIN clients c ON c.id = te.client_id AND c.organization_id = te.organization_id
         WHERE te.organization_id = ?
           AND te.member_id = ?
           AND date(te.entry_date) = date(?)
         ORDER BY te.created_at ASC
         LIMIT 12`,
      )
      .bind(principal.organizationId, principal.memberId, date)
      .all()
      .catch(() => ({ results: [] })),
    db
      .prepare(
        `SELECT t.title, t.status, t.column_id, t.actual_minutes, t.estimated_minutes,
                t.client_name,
                p.name AS project_name,
                c.name AS canonical_client_name
         FROM tasks t
         LEFT JOIN projects p ON p.id = t.project_id AND p.organization_id = t.organization_id
         LEFT JOIN clients c ON c.id = COALESCE(t.client_id, p.client_id) AND c.organization_id = t.organization_id
         WHERE t.organization_id = ?
           AND (t.assignee_member_id = ? OR t.created_by_member_id = ?)
           AND (
             date(t.created_at) = date(?)
             OR date(t.updated_at) = date(?)
             OR date(t.due_at) = date(?)
             OR t.title LIKE ?
           )
         ORDER BY
           CASE COALESCE(t.column_id, t.status)
             WHEN 'done' THEN 0
             WHEN 'completed' THEN 0
             ELSE 1
           END,
           t.updated_at DESC
         LIMIT 12`,
      )
      .bind(principal.organizationId, principal.memberId, principal.memberId, date, date, date, `${date}%`)
      .all()
      .catch(() => ({ results: [] })),
  ])

  const entries = (entriesResult.results || []) as any[]
  const tasks = (tasksResult.results || []) as any[]
  const totalMinutes = entries.reduce((sum, entry) => sum + Number(entry.minutes || 0), 0)
  const taskMinutes = tasks.reduce((sum, task) => {
    const minutes = Number(task.actual_minutes || task.estimated_minutes || 0)
    return sum + (Number.isFinite(minutes) ? minutes : 0)
  }, 0)
  const visibleMinutes = totalMinutes || taskMinutes

  if (!entries.length && !tasks.length) {
    return [
      `Per ${formatBusinessDate(date)} non trovo ancora task o consuntivi collegati al tuo profilo.`,
      "",
      "Posso aiutarti a inserirli: scrivimi ad esempio “aggiungi rapportino per ieri: ...” oppure “crea task su Portopiccolo: ...”.",
    ].join("\n")
  }

  const lines = [
    `Per ${formatBusinessDate(date)} vedo ${formatMinutesLabel(visibleMinutes)} e ${tasks.length} task collegate.`,
  ]

  if (entries.length) {
    lines.push("", "Consuntivi:")
    for (const entry of entries.slice(0, 5)) {
      const scope = [entry.client_name, entry.project_name].filter(Boolean).join(" · ")
      lines.push(
        `- ${formatMinutesLabel(Number(entry.minutes || 0))}${scope ? ` · ${compact(scope, 90)}` : ""}: ${compact(entry.task_title || entry.note || "Attivita registrata", 120)}`,
      )
    }
  }

  if (tasks.length) {
    lines.push("", "Task:")
    for (const task of tasks.slice(0, 6)) {
      const scope = [task.canonical_client_name || task.client_name, task.project_name].filter(Boolean).join(" · ")
      const state = compact(task.column_id || task.status || "stato non indicato", 40)
      lines.push(`- ${compact(task.title, 120)}${scope ? ` · ${compact(scope, 90)}` : ""} · ${state}`)
    }
  }

  if (tasks.length > 6 || entries.length > 5) {
    lines.push("", "Ho mostrato i primi risultati. Posso prepararti il dettaglio completo in Optima.")
  }

  return lines.join("\n")
}

async function createTelegramReply(db: any, principal: WorkspacePrincipal, message: TelegramMessage): Promise<TelegramPreparedReply> {
  const text = compact(message.text || message.caption, 3600)
  const attachment = extractAttachment(message)
  const chatId = normalizeTelegramChatId(message.chat?.id)
  const mediaGroupId = compact(attachment?.mediaGroupId, 140)
  const sessionId = await ensureTelegramSession(db, principal, message)
  const [history, sessionMemory, agentMemory, context] = await Promise.all([
    getHistory(db, sessionId, principal),
    getSessionMemory(db, sessionId, principal),
    loadTelegramAgentMemory(db, principal, chatId),
    buildOperationalContextSnapshot(db, principal),
  ])

  const existingGroupCount = mediaGroupId
    ? Number(
        (
          await db
            .prepare(
              `SELECT COUNT(*) AS count
               FROM telegram_document_proposals
               WHERE organization_id = ? AND chat_id = ? AND media_group_id = ?`,
            )
            .bind(principal.organizationId, chatId, mediaGroupId)
            .first()
            .catch(() => ({ count: 0 }))
        )?.count || 0,
      )
    : 0

  const userContent = text || `[${attachment?.kind || "allegato"}] ${attachment?.fileName || attachment?.fileId || ""}${mediaGroupId ? ` gruppo ${mediaGroupId}` : ""}`.trim()
  await saveChatMessage(db, sessionId, principal, "user", userContent)

  const personalWorkDate = text ? resolvePersonalWorkSummaryDate(text) : null
  if (personalWorkDate) {
    const reply = await buildPersonalWorkSummaryReply(db, principal, personalWorkDate)
    await saveChatMessage(db, sessionId, principal, "assistant", reply)
    await updateMemory(db, sessionId, principal, sessionMemory, userContent, reply)
    await saveTelegramAgentMemory(db, principal, chatId, agentMemory, userContent, reply, {
      action: "status",
      confidence: 92,
      reply,
      lastResult: { kind: "personal_work_summary", date: personalWorkDate },
    }).catch(() => null)
    return {
      text: reply,
      replyMarkup: buildTelegramReplyMarkup("status", null),
    }
  }

  const decision = inferTelegramTurnDecision({ text, memory: agentMemory, attachment })

  if (attachment?.fileId) {
    await createTelegramDocumentProposal(db, {
      principal,
      chatId,
      attachment,
      decision,
      extractedText: text,
    }).catch(() => null)
  }

  if (mediaGroupId && existingGroupCount > 0) {
    const quietReply = "Allegato aggiunto allo stesso gruppo. Lo considero nella revisione unica."
    await updateMemory(db, sessionId, principal, sessionMemory, userContent, quietReply)
    await saveTelegramAgentMemory(db, principal, chatId, agentMemory, userContent, quietReply, {
      ...decision,
      needsAgentJob: false,
      reply: quietReply,
      lastResult: { kind: "document_group_proposal", mediaGroupId, count: existingGroupCount + 1 },
    }).catch(() => null)
    return { text: "" }
  }

  let jobId: string | null = null
  if (decision.needsAgentJob && decision.jobTitle && decision.jobBrief) {
    const route = preferredModelRoute(decision.action)
    const job = await createAgentJob(db, principal, {
      title: decision.jobTitle,
      jobType: decision.action === "task_update" ? "task_update" : "research",
      priority: decision.action === "task_update" ? 2 : 3,
      contextSummary: "Richiesta arrivata da Telegram. Output revisionabile prima di modifiche definitive.",
      brief: [
        decision.jobBrief,
        "",
        `Chat Telegram: ${chatId}`,
        `Membro: ${principal.email}`,
        `Memoria sintetica: ${agentMemory.summary || "nessuna memoria dedicata"}`,
        `Contesto Optima sintetico:\n${compact(context.text, 1600)}`,
        `Runtime preferito: ${route.providerId}/${route.model} (${route.policy}); fallback controllato: ${route.fallback}.`,
        attachment?.fileId
          ? "Se serve leggere il file, il runner deve usare TELEGRAM_BOT_TOKEN dal runtime autorizzato con getFile/download; non salvare token o contenuti sensibili in input_json."
          : "",
      ].join("\n"),
      input: {
        source: "telegram",
        telegramChatId: chatId,
        action: decision.action,
        confidence: decision.confidence,
        preferredModelRoute: route,
        historyTurns: history.length,
        searchTerms: decision.searchTerms || [],
        attachment: attachment || null,
        mediaGroup: mediaGroupId ? { id: mediaGroupId, knownItems: existingGroupCount + 1 } : null,
        telegramDownloadPolicy: attachment?.fileId ? "download_in_runner_from_secret_env_then_review" : null,
      },
    })
    jobId = job.id
  }

  const reply = publicTelegramReply({
    action: decision.action,
    text: decision.reply,
    jobId,
    confidence: decision.confidence,
  })
  await saveChatMessage(db, sessionId, principal, "assistant", reply)
  await updateMemory(db, sessionId, principal, sessionMemory, userContent, reply)
  await saveTelegramAgentMemory(db, principal, chatId, agentMemory, userContent, reply, decision).catch(() => null)

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
        TELEGRAM_AGENT_MODEL_LABEL,
        Math.ceil((userContent.length + context.text.length + sessionMemory.length + agentMemory.summary.length) / 4),
        Math.ceil(reply.length / 3.5),
      )
      .run()
  } catch {
    // Usage logging should not block Telegram replies.
  }

  return {
    text: reply,
    replyMarkup: buildTelegramReplyMarkup(decision.action, jobId),
  }
}

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: TelegramInlineKeyboard) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  const chunks = text.match(/[\s\S]{1,3800}/g) || [text]
  for (const [index, chunk] of chunks.entries()) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunk,
        disable_web_page_preview: true,
        ...(index === chunks.length - 1 && replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    })
  }
}

async function sendTelegramChatAction(chatId: string | number, action = "typing") {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  await fetch(`https://api.telegram.org/bot${token}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      action,
    }),
  }).catch(() => null)
}

function startTelegramChatActionLoop(chatId: string | number, action = "typing") {
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | null = null

  const tick = async () => {
    if (stopped) return
    await sendTelegramChatAction(chatId, action)
    if (!stopped) timer = setTimeout(tick, 4000)
  }

  void tick()

  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
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
  const text = compact(message?.text || message?.caption, 3600)
  const chatId = message?.chat?.id

  if (!message || !chatId) return Response.json({ ok: true, ignored: true })

  if (isChatIdCommand(text)) {
    await sendTelegramMessage(
      chatId,
      buildChatIdReply({
        chatId,
        userId: message.from?.id,
        username: message.from?.username,
        firstName: message.from?.first_name,
        lastName: message.from?.last_name,
      }),
    )
    return Response.json({ ok: true, command: "chatid" })
  }

  if (isStartCommand(text)) {
    await sendTelegramMessage(chatId, buildStartReply(message, chatId), buildOptimaOnlyReplyMarkup())
    return Response.json({ ok: true, command: "start" })
  }

  if (!text && !extractAttachment(message)) return Response.json({ ok: true, ignored: true })

  const db = await getCloudflareDb()
  if (!db) return Response.json({ ok: false, error: "Database Cloudflare non disponibile." }, { status: 500 })

  const principal = await findTelegramPrincipal(db, message)
  if (!principal && !isAllowedTelegramSender(message)) {
    await sendTelegramMessage(chatId, buildUnauthorizedReply(message, chatId), buildOptimaOnlyReplyMarkup())
    return Response.json({ ok: true, ignored: true, reason: "sender-not-allowed" })
  }
  if (!principal) {
    await sendTelegramMessage(chatId, "Telegram e collegato, ma non ho trovato un membro Optima autorizzato per questo account.")
    return Response.json({ ok: true, ignored: true, reason: "principal-not-found" })
  }

  try {
    const stopTyping = startTelegramChatActionLoop(chatId, "typing")
    try {
      const reply = await createTelegramReply(db, principal, message)
      if (reply.text.trim()) {
        await sendTelegramMessage(chatId, reply.text, reply.replyMarkup)
      }
    } finally {
      stopTyping()
    }
    return Response.json({ ok: true })
  } catch (error) {
    console.error("Telegram AI assistant error:", error)
    await sendTelegramMessage(chatId, "Non sono riuscito a completare la richiesta. Riprova tra poco o apri Optima per verificare lo stato.")
    return Response.json({ ok: false, error: "Errore AI Telegram." }, { status: 500 })
  }
}
