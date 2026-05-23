import { addDays, addWeeks, nextMonday, nextFriday, startOfWeek, endOfWeek, format } from 'date-fns'
import { it } from 'date-fns/locale'

const ITALIAN_MONTHS: Record<string, number> = {
  gennaio: 0,
  feb: 1,
  febbraio: 1,
  mar: 2,
  marzo: 2,
  apr: 3,
  aprile: 3,
  mag: 4,
  maggio: 4,
  giu: 5,
  giugno: 5,
  lug: 6,
  luglio: 6,
  ago: 7,
  agosto: 7,
  set: 8,
  settembre: 8,
  ott: 9,
  ottobre: 9,
  nov: 10,
  novembre: 10,
  dic: 11,
  dicembre: 11,
}

function dateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isValidCalendarDate(date: Date, year: number, month: number, day: number) {
  return (
    date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
  )
}

function rollForwardIfPast(date: Date, now: Date) {
  const next = new Date(date)
  while (dateOnly(next).getTime() < dateOnly(now).getTime()) {
    next.setFullYear(next.getFullYear() + 1)
  }
  return next
}

function parseItalianCalendarDate(text: string, now: Date) {
  const lower = text.toLowerCase()
  const monthNames = Object.keys(ITALIAN_MONTHS).join("|")
  const match = lower.match(new RegExp(`\\b(\\d{1,2})\\s+(?:di\\s+)?(${monthNames})(?:\\s+(\\d{4}))?\\b`, "i"))
  if (!match) return null

  const day = Number(match[1])
  const month = ITALIAN_MONTHS[match[2].toLowerCase()]
  const explicitYear = match[3] ? Number(match[3]) : null
  if (!Number.isFinite(day) || day < 1 || day > 31 || month === undefined) return null

  let year = explicitYear ?? now.getFullYear()
  let parsed = new Date(year, month, day)
  if (!isValidCalendarDate(parsed, year, month, day)) return null

  if (!explicitYear && dateOnly(parsed).getTime() < dateOnly(now).getTime()) {
    parsed = new Date(year + 1, month, day)
    if (!isValidCalendarDate(parsed, year + 1, month, day)) return null
  }

  return parsed
}

function parseNumericCalendarDate(text: string, now: Date) {
  const match = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/)
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2]) - 1
  const explicitYear = match[3]
    ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
    : null

  if (!Number.isFinite(day) || day < 1 || day > 31 || month < 0 || month > 11) return null

  const year = explicitYear ?? now.getFullYear()
  let parsed = new Date(year, month, day)
  if (!isValidCalendarDate(parsed, year, month, day)) return null

  if (!explicitYear && dateOnly(parsed).getTime() < dateOnly(now).getTime()) {
    parsed = new Date(year + 1, month, day)
    if (!isValidCalendarDate(parsed, year + 1, month, day)) return null
  }

  return parsed
}

export function parseDateExpression(text: string, now = new Date()): Date | null {
  const lower = text.toLowerCase()

  const explicitItalianDate = parseItalianCalendarDate(text, now)
  if (explicitItalianDate) return explicitItalianDate

  const explicitNumericDate = parseNumericCalendarDate(text, now)
  if (explicitNumericDate) return explicitNumericDate
  
  if (lower.includes('oggi')) return now
  
  if (lower.includes('domani')) return addDays(now, 1)
  
  if (lower.includes('questa settimana')) return endOfWeek(now, { locale: it })
  
  if (lower.includes('prossima settimana')) return addWeeks(startOfWeek(now, { locale: it }), 1)
  
  if (lower.includes('prossimo lunedì') || lower.includes('prossimo lunedi')) {
    return nextMonday(now)
  }
  
  if (lower.includes('prossimo venerdì') || lower.includes('prossimo venerdi')) {
    return nextFriday(now)
  }
  
  const daysMatch = lower.match(/tra (\d+) giorni?/)
  if (daysMatch) {
    return addDays(now, parseInt(daysMatch[1]))
  }
  
  const weeksMatch = lower.match(/tra (\d+) settimane?/)
  if (weeksMatch) {
    return addWeeks(now, parseInt(weeksMatch[1]))
  }
  
  return null
}

export function formatDateForCommand(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function normalizeFutureCommandDate(value: unknown, sourceText: string, now = new Date()): string | undefined {
  const sourceDate = parseDateExpression(sourceText, now)
  if (sourceDate) return formatDateForCommand(sourceDate)

  if (typeof value !== "string" || !value) return undefined

  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return undefined

  if (dateOnly(parsed).getTime() < dateOnly(now).getTime()) {
    return formatDateForCommand(rollForwardIfPast(parsed, now))
  }

  return formatDateForCommand(parsed)
}
