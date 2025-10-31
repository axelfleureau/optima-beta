import { Quote } from '@/types/quote'
import { ReminderType } from '@/lib/email-service'

export interface MilestoneWithReminder {
  quoteId: string
  quote: Quote
  milestone: {
    id: string
    name: string
    amount: number
    dueDate: Date
    status: string
  }
  reminderType: ReminderType
  clientEmail: string
  clientName: string
}

function getDaysDifference(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  const diffTime = date2.getTime() - date1.getTime()
  return Math.ceil(diffTime / oneDay)
}

function hasReminderBeenSent(
  quote: Quote,
  milestoneId: string,
  reminderType: ReminderType
): boolean {
  if (!quote.remindersSent || !quote.remindersSent[milestoneId]) {
    return false
  }

  const sent = quote.remindersSent[milestoneId]
  
  if (reminderType === 'threeDay' && sent.threeDay) {
    return true
  }
  if (reminderType === 'oneDay' && sent.oneDay) {
    return true
  }
  if (reminderType === 'sameDay' && sent.sameDay) {
    return true
  }
  
  return false
}

export function getMilestonesDueForReminders(quotes: Quote[]): MilestoneWithReminder[] {
  const result: MilestoneWithReminder[] = []
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  for (const quote of quotes) {
    if (!quote.paymentPlan?.milestones || quote.paymentPlan.milestones.length === 0) {
      continue
    }

    const clientEmail = quote.clientEmail || quote.externalClientEmail
    const clientName = quote.clientName || quote.externalClientName || 'Cliente'

    if (!clientEmail) {
      console.warn(`Quote ${quote.id} has no client email for milestone reminders`)
      continue
    }

    for (const milestone of quote.paymentPlan.milestones) {
      if (milestone.status !== 'ready') {
        continue
      }

      if (!milestone.dueDate) {
        console.warn(`Milestone ${milestone.id} in quote ${quote.id} has no due date`)
        continue
      }

      const dueDate = milestone.dueDate instanceof Date 
        ? milestone.dueDate 
        : new Date(milestone.dueDate)
      
      dueDate.setHours(0, 0, 0, 0)
      
      const daysUntilDue = getDaysDifference(now, dueDate)

      let reminderType: ReminderType | null = null

      if (daysUntilDue === 3 && !hasReminderBeenSent(quote, milestone.id, 'threeDay')) {
        reminderType = 'threeDay'
      } else if (daysUntilDue === 1 && !hasReminderBeenSent(quote, milestone.id, 'oneDay')) {
        reminderType = 'oneDay'
      } else if (daysUntilDue === 0 && !hasReminderBeenSent(quote, milestone.id, 'sameDay')) {
        reminderType = 'sameDay'
      }

      if (reminderType) {
        result.push({
          quoteId: quote.id,
          quote,
          milestone: {
            id: milestone.id,
            name: milestone.name,
            amount: milestone.amount,
            dueDate,
            status: milestone.status,
          },
          reminderType,
          clientEmail,
          clientName,
        })
      }
    }
  }

  return result
}

export async function markReminderAsSent(
  quoteId: string,
  milestoneId: string,
  reminderType: ReminderType,
  updateQuoteInFirestore: (quoteId: string, updates: Partial<Quote>) => Promise<void>
): Promise<void> {
  const now = new Date()
  
  const reminderUpdate: Record<string, any> = {}
  reminderUpdate[`remindersSent.${milestoneId}.${reminderType}`] = now

  try {
    await updateQuoteInFirestore(quoteId, reminderUpdate as Partial<Quote>)
    console.log(`✅ Marked ${reminderType} reminder as sent for milestone ${milestoneId} in quote ${quoteId}`)
  } catch (error) {
    console.error(`❌ Failed to mark reminder as sent:`, error)
    throw error
  }
}
