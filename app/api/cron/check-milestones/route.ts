import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Quote } from '@/types/quote'
import { getMilestonesDueForReminders, markReminderAsSent } from '@/lib/milestone-reminder-service'
import { sendMilestoneReminder } from '@/lib/email-service'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      return NextResponse.json(
        { error: 'CRON_SECRET not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 Starting milestone reminder check...')

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin DB not initialized' },
        { status: 500 }
      )
    }

    const quotesSnapshot = await adminDb.collection('quotes').get()
    const quotes: Quote[] = quotesSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data()
      
      const normalizedRemindersSent: Quote['remindersSent'] = {}
      if (data.remindersSent && typeof data.remindersSent === 'object') {
        for (const [milestoneId, timestamps] of Object.entries(data.remindersSent as Record<string, any>)) {
          normalizedRemindersSent[milestoneId] = {
            threeDay: timestamps.threeDay?.toDate?.() || timestamps.threeDay,
            oneDay: timestamps.oneDay?.toDate?.() || timestamps.oneDay,
            sameDay: timestamps.sameDay?.toDate?.() || timestamps.sameDay,
          }
        }
      }
      
      const clientName = data.clientName || data.externalClientName || 'Cliente'
      
      return {
        ...data,
        id: doc.id,
        clientName,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        validUntil: data.validUntil?.toDate() || new Date(),
        sentAt: data.sentAt?.toDate(),
        approvedAt: data.approvedAt?.toDate(),
        pendingApprovalAt: data.pendingApprovalAt?.toDate(),
        remindersSent: Object.keys(normalizedRemindersSent).length > 0 ? normalizedRemindersSent : undefined,
        paymentPlan: data.paymentPlan ? {
          ...data.paymentPlan,
          milestones: data.paymentPlan.milestones?.map((m: any) => ({
            ...m,
            dueDate: m.dueDate?.toDate(),
            paidAt: m.paidAt?.toDate()
          }))
        } : undefined
      } as Quote
    })

    console.log(`📊 Found ${quotes.length} total quotes`)

    const milestonesDue = getMilestonesDueForReminders(quotes)
    
    console.log(`📧 ${milestonesDue.length} milestone(s) need reminders`)

    const results = {
      total: milestonesDue.length,
      sent: 0,
      failed: 0,
      details: [] as any[]
    }

    const updateQuoteInFirestore = async (quoteId: string, updates: Partial<Quote>) => {
      if (!adminDb) throw new Error('Firebase Admin DB not initialized')
      await adminDb.collection('quotes').doc(quoteId).update(updates as any)
    }

    for (const item of milestonesDue) {
      try {
        if (!item.quote.shareToken) {
          console.warn(`⚠️ Skipping milestone "${item.milestone.name}" for quote ${item.quoteId} - missing shareToken. Quote must be sent to client first.`)
          results.failed++
          results.details.push({
            quoteId: item.quoteId,
            milestoneId: item.milestone.id,
            reminderType: item.reminderType,
            status: 'skipped',
            error: 'Missing shareToken - quote not sent to client yet'
          })
          continue
        }

        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://optima-beta.vercel.app'
        const paymentUrl = `${baseUrl}/quotes/${item.quote.shareToken}/milestone-pay?milestoneId=${item.milestone.id}`

        const emailSent = await sendMilestoneReminder(
          item.reminderType,
          {
            quoteTitle: item.quote.title,
            quoteName: item.quote.title,
            milestoneName: item.milestone.name,
            milestoneAmount: item.milestone.amount,
            dueDate: item.milestone.dueDate,
            paymentUrl,
            clientName: item.clientName,
          },
          item.clientEmail
        )

        if (emailSent) {
          await markReminderAsSent(
            item.quoteId,
            item.milestone.id,
            item.reminderType,
            updateQuoteInFirestore
          )

          results.sent++
          results.details.push({
            quoteId: item.quoteId,
            milestoneId: item.milestone.id,
            reminderType: item.reminderType,
            status: 'sent',
            clientEmail: item.clientEmail
          })

          console.log(`✅ Sent ${item.reminderType} reminder for milestone "${item.milestone.name}" (Quote: ${item.quote.title})`)
        } else {
          results.failed++
          results.details.push({
            quoteId: item.quoteId,
            milestoneId: item.milestone.id,
            reminderType: item.reminderType,
            status: 'failed',
            error: 'Email sending failed'
          })
          console.error(`❌ Failed to send reminder for milestone "${item.milestone.name}" (Quote: ${item.quote.title})`)
        }
      } catch (error) {
        results.failed++
        results.details.push({
          quoteId: item.quoteId,
          milestoneId: item.milestone.id,
          reminderType: item.reminderType,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`❌ Error processing reminder for milestone ${item.milestone.id}:`, error)
      }
    }

    console.log(`✅ Milestone reminder check complete. Sent: ${results.sent}, Failed: ${results.failed}`)

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in milestone reminder cron:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
