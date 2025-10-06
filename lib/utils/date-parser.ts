import { addDays, addWeeks, nextMonday, nextFriday, startOfWeek, endOfWeek, format } from 'date-fns'
import { it } from 'date-fns/locale'

export function parseDateExpression(text: string): Date | null {
  const lower = text.toLowerCase()
  const now = new Date()
  
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
