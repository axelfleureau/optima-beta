import { createId } from "@/lib/cloudflare-db"
import type { WorkspacePrincipal } from "@/lib/workspace-db"

export type TelegramTurnAction =
  | "reply"
  | "query"
  | "send_file"
  | "archive"
  | "classify"
  | "status"
  | "clarify"
  | "task_update"
  | "reminder"

export type TelegramAttachment = {
  fileId?: string
  fileName?: string
  mimeType?: string
  kind?: "document" | "photo" | "unknown"
}

export type TelegramAgentMemory = {
  summary: string
  preferences: Record<string, unknown>
  lastResult: Record<string, unknown> | null
  recentTurns: Array<{ role: "user" | "assistant"; text: string; at: string }>
}

export type TelegramTurnDecision = {
  action: TelegramTurnAction
  confidence: number
  reply: string
  needsAgentJob?: boolean
  jobTitle?: string
  jobBrief?: string
  searchTerms?: string[]
  learnedPreferences?: Record<string, unknown>
  lastResult?: Record<string, unknown> | null
}

const MAX_TURNS = 12

export function compactTelegramText(value: unknown, limit = 1200) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit)
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function parseJsonArray<T>(value: unknown): T[] {
  if (typeof value !== "string" || !value) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function stringifyJson(value: unknown) {
  return JSON.stringify(value && typeof value === "object" ? value : {})
}

export function normalizeTelegramChatId(value: unknown) {
  return String(value || "").trim().slice(0, 90)
}

export function isChatIdCommand(text: unknown) {
  return /^\/chatid(?:@\w+)?(?:\s|$)/i.test(compactTelegramText(text, 120))
}

export function buildChatIdReply(input: {
  chatId: unknown
  userId?: unknown
  username?: unknown
  firstName?: unknown
  lastName?: unknown
}) {
  const name = [input.firstName, input.lastName].map((item) => compactTelegramText(item, 80)).filter(Boolean).join(" ")
  return [
    "ID chat Telegram da autorizzare in Optima:",
    `chat_id: ${normalizeTelegramChatId(input.chatId)}`,
    input.userId ? `telegram_user_id: ${compactTelegramText(input.userId, 80)}` : "",
    input.username ? `username: @${compactTelegramText(input.username, 80).replace(/^@/, "")}` : "",
    name ? `nome: ${name}` : "",
  ].filter(Boolean).join("\n")
}

export async function findAuthorizedTelegramPrincipal(
  db: any,
  message: {
    chat?: { id?: unknown }
    from?: { id?: unknown; username?: unknown; first_name?: unknown; last_name?: unknown }
  },
): Promise<WorkspacePrincipal | null> {
  const chatId = normalizeTelegramChatId(message.chat?.id)
  if (!chatId) return null

  try {
    const row = await db
      .prepare(
        `SELECT m.id, m.organization_id, m.role, m.email
         FROM telegram_authorized_chats tc
         JOIN members m ON m.id = tc.member_id AND m.organization_id = tc.organization_id
         WHERE tc.chat_id = ?
           AND COALESCE(tc.status, 'active') = 'active'
           AND COALESCE(m.status, 'active') NOT IN ('removed', 'deleted', 'archived', 'disabled')
         ORDER BY tc.updated_at DESC
         LIMIT 1`,
      )
      .bind(chatId)
      .first()

    if (row?.id && row?.organization_id) {
      await db
        .prepare(
          `UPDATE telegram_authorized_chats
           SET last_seen_at = CURRENT_TIMESTAMP,
               telegram_user_id = COALESCE(?, telegram_user_id),
               username = COALESCE(?, username),
               display_name = COALESCE(?, display_name),
               updated_at = CURRENT_TIMESTAMP
           WHERE chat_id = ? AND organization_id = ?`,
        )
        .bind(
          message.from?.id ? String(message.from.id) : null,
          message.from?.username ? String(message.from.username) : null,
          [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ").trim() || null,
          chatId,
          row.organization_id,
        )
        .run()

      return {
        organizationId: String(row.organization_id),
        memberId: String(row.id),
        role: String(row.role || "member"),
        email: String(row.email || ""),
      }
    }
  } catch {
    return null
  }

  return null
}

export async function loadTelegramAgentMemory(
  db: any,
  principal: WorkspacePrincipal,
  chatId: string,
): Promise<TelegramAgentMemory> {
  try {
    const row = await db
      .prepare(
        `SELECT memory_summary, preferences_json, last_result_json, recent_turns_json
         FROM telegram_conversation_memory
         WHERE organization_id = ? AND member_id = ? AND chat_id = ?
         LIMIT 1`,
      )
      .bind(principal.organizationId, principal.memberId, chatId)
      .first()

    return {
      summary: compactTelegramText(row?.memory_summary, 2800),
      preferences: parseJsonObject(row?.preferences_json),
      lastResult: Object.keys(parseJsonObject(row?.last_result_json)).length ? parseJsonObject(row?.last_result_json) : null,
      recentTurns: parseJsonArray(row?.recent_turns_json),
    }
  } catch {
    return { summary: "", preferences: {}, lastResult: null, recentTurns: [] }
  }
}

export async function saveTelegramAgentMemory(
  db: any,
  principal: WorkspacePrincipal,
  chatId: string,
  memory: TelegramAgentMemory,
  userText: string,
  assistantText: string,
  decision?: TelegramTurnDecision,
) {
  const now = new Date().toISOString()
  const recentTurns = [
    ...(memory.recentTurns || []),
    { role: "user" as const, text: compactTelegramText(userText, 600), at: now },
    { role: "assistant" as const, text: compactTelegramText(assistantText, 600), at: now },
  ].slice(-MAX_TURNS)
  const learnedPreferences = { ...memory.preferences, ...(decision?.learnedPreferences || {}) }
  const nextSummary = [
    memory.summary,
    decision?.learnedPreferences && Object.keys(decision.learnedPreferences).length
      ? `Preferenza aggiornata: ${Object.entries(decision.learnedPreferences).map(([key, value]) => `${key}=${String(value)}`).join(", ")}`
      : "",
    `Ultimo turno Telegram: ${compactTelegramText(userText, 300)} -> ${compactTelegramText(assistantText, 320)}`,
  ].filter(Boolean).join("\n").slice(-3600)

  await db
    .prepare(
      `INSERT INTO telegram_conversation_memory (
        id, organization_id, member_id, chat_id, memory_summary, preferences_json, last_result_json, recent_turns_json, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(organization_id, member_id, chat_id) DO UPDATE SET
         memory_summary = excluded.memory_summary,
         preferences_json = excluded.preferences_json,
         last_result_json = excluded.last_result_json,
         recent_turns_json = excluded.recent_turns_json,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(
      createId("tmem"),
      principal.organizationId,
      principal.memberId,
      chatId,
      nextSummary,
      stringifyJson(learnedPreferences),
      stringifyJson(decision?.lastResult ?? memory.lastResult ?? {}),
      JSON.stringify(recentTurns),
    )
    .run()
}

export function inferTelegramTurnDecision(input: {
  text: string
  memory?: TelegramAgentMemory
  attachment?: TelegramAttachment | null
}): TelegramTurnDecision {
  const text = compactTelegramText(input.text, 2400)
  const lower = text.toLowerCase()
  const memory = input.memory || { summary: "", preferences: {}, lastResult: null, recentTurns: [] }
  const learnedPreferences: Record<string, unknown> = {}

  if (input.attachment?.fileId) {
    return {
      action: "classify",
      confidence: 88,
      needsAgentJob: true,
      jobTitle: `Classifica documento Telegram ${input.attachment.fileName || input.attachment.kind || ""}`.trim(),
      jobBrief: [
        "Classifica il documento ricevuto via Telegram senza salvarlo definitivamente.",
        `File: ${input.attachment.fileName || "senza nome"}`,
        `Mime: ${input.attachment.mimeType || "non indicato"}`,
        text ? `Caption/richiesta utente: ${text}` : "",
        "Output richiesto: tipo documento, riferimenti, date/scadenze, dati mancanti, confidenza e proposta review per Optima.",
      ].filter(Boolean).join("\n"),
      reply: "Ho ricevuto il documento. Lo preparo come proposta in revisione: classificazione, scadenze e dati mancanti prima di salvarlo.",
      lastResult: { kind: "document_proposal", fileName: input.attachment.fileName || null },
    }
  }

  if (!text) {
    return { action: "clarify", confidence: 70, reply: "Dimmi cosa vuoi fare: task, rapportino, documento, scadenza o riepilogo operativo." }
  }

  if (/^(ok|okay|grazie|perfetto|va bene|bene|thanks|👍)$/i.test(text)) {
    return { action: "reply", confidence: 95, reply: "Ok, tengo il contesto. Se serve procedo dal risultato precedente." }
  }

  if (/tropp[ioe] document|non mandarmi tutto|solo il documento|solo durc|solo dvr|solo quello corrente/.test(lower)) {
    learnedPreferences.fileScope = "single_or_current_document"
    return {
      action: "reply",
      confidence: 92,
      reply: "Ricevuto: quando chiedi documenti parto dal documento corrente o da un singolo risultato mirato, non dall'archivio completo.",
      learnedPreferences,
    }
  }

  if (/check\s*in|checkin|entrata|check\s*out|checkout|uscita|rapportino|fine giornata|timbr/.test(lower)) {
    return {
      action: "status",
      confidence: 86,
      needsAgentJob: /ricordam|promemoria|sempre|automatic/.test(lower),
      jobTitle: "Promemoria Telegram check-in checkout e rapportino",
      jobBrief: `Valuta la richiesta Telegram e prepara reminder operativi su check-in, checkout e rapportino per il membro autorizzato. Richiesta: ${text}`,
      reply: "Controllo stato giornata, check-in/checkout e rapportino. Per promemoria automatici preparo un job revisionabile con regole e orari.",
    }
  }

  if (/\btask\b|deliverable|consegna|comment|commento|\bstato\b|\bdone\b|validation|assegna|priorit/.test(lower)) {
    return {
      action: "task_update",
      confidence: 84,
      needsAgentJob: true,
      jobTitle: "Aggiorna task da Telegram",
      jobBrief: [
        "Interpreta il messaggio Telegram e prepara una modifica revisionabile su task Optima.",
        "Azioni possibili: creare task, aggiungere commento, collegare deliverable, proporre cambio stato o assegnazione.",
        "Non salvare modifiche definitive se manca identificativo task/progetto o se l'intento e ambiguo.",
        `Messaggio: ${text}`,
      ].join("\n"),
      reply: "Preparo l'aggiornamento task in modo revisionabile. Se manca il riferimento alla task ti chiederò quale intendi.",
    }
  }

  if (/stato|riepilogo|cosa abbiamo|oggi|questa settimana|prossimi 60 giorni/.test(lower)) {
    return {
      action: "status",
      confidence: 78,
      needsAgentJob: /scadenze|prossimi 60 giorni|cosa abbiamo/.test(lower),
      jobTitle: "Riepilogo operativo Telegram",
      jobBrief: `Prepara un riepilogo operativo da fonti Optima per questa richiesta Telegram: ${text}`,
      reply: "Preparo un riepilogo operativo dal contesto Optima. Se serve ricerca profonda, lo mando in revisione.",
    }
  }

  if (/durc|dvr|idoneit|scaden|document|pdf|mandamelo|mandami|zip|archivio/.test(lower)) {
    const wantsArchive = /archivio completo|tutto l'archivio|tutti i documenti/.test(lower)
    const wantsZip = /zip|pi[uù] document|idoneit|cartella/.test(lower) && !/solo/.test(lower)
    const lastResult = /mandamelo|mandami qui|qui in chat/.test(lower) ? memory.lastResult : null
    return {
      action: wantsArchive ? "archive" : wantsZip ? "archive" : "query",
      confidence: 82,
      needsAgentJob: true,
      jobTitle: wantsArchive ? "Prepara archivio documenti mirato da Telegram" : "Ricerca documento da Telegram",
      jobBrief: [
        "Cerca nei dati Optima e fonti collegate il documento richiesto.",
        "Se trovi un solo documento, proponi invio diretto. Se trovi piu documenti, prepara zip mirato. Non inviare archivio completo salvo richiesta esplicita.",
        lastResult ? `Riferimento ultimo risultato: ${JSON.stringify(lastResult).slice(0, 600)}` : "",
        `Richiesta: ${text}`,
      ].filter(Boolean).join("\n"),
      reply: wantsZip
        ? "Cerco i documenti pertinenti e preparo uno ZIP mirato, non l'archivio completo."
        : "Cerco il documento richiesto. Se il risultato è unico lo mando qui; se ci sono più risultati ti preparo una scelta o uno ZIP mirato.",
      searchTerms: lower.split(/[^a-z0-9àèéìòù]+/i).filter((item) => item.length > 2).slice(0, 8),
      lastResult: lastResult || { kind: "document_query", query: text },
    }
  }

  return {
    action: "reply",
    confidence: 62,
    reply: "Ho capito la richiesta. Posso cercare nel contesto Optima o trasformarla in un job agentico revisionabile se richiede azione.",
  }
}

export async function createTelegramDocumentProposal(db: any, input: {
  principal: WorkspacePrincipal
  chatId: string
  attachment: TelegramAttachment
  decision: TelegramTurnDecision
  extractedText?: string
}) {
  const id = createId("tgdoc")
  await db
    .prepare(
      `INSERT INTO telegram_document_proposals (
        id, organization_id, member_id, chat_id, telegram_file_id, file_name, mime_type,
        extracted_text, classification_json, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'review')`,
    )
    .bind(
      id,
      input.principal.organizationId,
      input.principal.memberId,
      input.chatId,
      input.attachment.fileId || null,
      input.attachment.fileName || null,
      input.attachment.mimeType || null,
      input.extractedText || null,
      JSON.stringify({
        action: input.decision.action,
        confidence: input.decision.confidence,
        proposal: input.decision.reply,
        createdBy: "telegram-agentic-bot",
      }),
    )
    .run()
  return id
}
