// Email Service for Invoice Delivery
import nodemailer from 'nodemailer'
import type { Quote } from '@/lib/ai-quote-service'
import { getInvoicePDFBlob, type InvoicePaymentData } from '@/lib/invoice-generator'

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendInvoiceEmail(
  invoiceNumber: string,
  payment: InvoicePaymentData,
  quote: Quote,
  clientName: string,
  clientEmail: string
): Promise<boolean> {
  try {
    // Validate email configuration
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP credentials not configured. Skipping invoice email.')
      return false
    }

    // Generate PDF invoice
    const pdfBlob = getInvoicePDFBlob(invoiceNumber, payment, quote, clientName, clientEmail)
    
    // Convert Blob to Buffer for Nodemailer
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())
    
    // Determine payment type label for email
    let paymentTypeLabel = 'Pagamento Completo'
    if (payment.paymentType === 'deposit') {
      paymentTypeLabel = `Deposito${payment.depositPercentage ? ` (${payment.depositPercentage}%)` : ''}`
    } else if (payment.paymentType === 'milestone') {
      paymentTypeLabel = `Milestone${payment.milestoneName ? `: ${payment.milestoneName}` : ''}`
    }
    
    // Email HTML body
    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #D946EF, #9333EA); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">RIGHELLO</h1>
          <p style="color: white; margin: 5px 0;">We Are Digital</p>
        </div>
        
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Fattura Pagamento Ricevuto</h2>
          <p>Gentile ${clientName},</p>
          <p>Grazie per il tuo pagamento! Ti inviamo in allegato la fattura per il pagamento ricevuto.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Numero Fattura:</strong> ${invoiceNumber}</p>
            <p><strong>Preventivo:</strong> ${quote.title}</p>
            <p><strong>Tipo Pagamento:</strong> ${paymentTypeLabel}</p>
            <p><strong>Importo:</strong> €${payment.amount.toFixed(2)}</p>
            <p><strong>Stato:</strong> ${payment.status === 'succeeded' ? 'Completato' : payment.status}</p>
          </div>
          
          <p>Per qualsiasi domanda, non esitare a contattarci.</p>
          <p>Cordiali saluti,<br/>Team Righello</p>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Righello Digital S.r.l. | Via Example 123, 00100 Roma | P.IVA 12345678901</p>
        </div>
      </div>
    `
    
    // Send email with PDF attachment
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Righello Digital" <noreply@righello.com>',
      to: clientEmail,
      subject: `Fattura ${invoiceNumber} - Pagamento Ricevuto`,
      html: emailHTML,
      attachments: [
        {
          filename: `Fattura_${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    })
    
    console.log(`✅ Invoice email sent to ${clientEmail} for invoice ${invoiceNumber}`)
    return true
  } catch (error) {
    console.error('❌ Error sending invoice email:', error)
    return false
  }
}

export type ReminderType = 'threeDay' | 'oneDay' | 'sameDay'

export interface MilestoneReminderData {
  quoteTitle: string
  quoteName: string
  milestoneName: string
  milestoneAmount: number
  dueDate: Date
  paymentUrl: string
  clientName: string
}

function getMilestoneReminderContent(type: ReminderType, data: MilestoneReminderData) {
  const formattedDate = new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(data.dueDate)
  
  const formattedAmount = new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(data.milestoneAmount)

  if (type === 'threeDay') {
    return {
      subject: `Promemoria: Milestone "${data.milestoneName}" in scadenza tra 3 giorni`,
      title: '⏰ Promemoria Milestone',
      urgencyColor: '#3b82f6',
      message: `
        <p>Gentile ${data.clientName},</p>
        <p>Ti ricordiamo che la milestone <strong>"${data.milestoneName}"</strong> relativa al preventivo <strong>"${data.quoteName}"</strong> è in scadenza tra <strong>3 giorni</strong>.</p>
        <p>Data scadenza: <strong>${formattedDate}</strong></p>
        <p>Per procedere con il pagamento e sbloccare l'avanzamento del progetto, clicca sul pulsante qui sotto.</p>
      `,
      ctaText: 'Procedi al Pagamento',
      ctaBg: '#3b82f6'
    }
  }

  if (type === 'oneDay') {
    return {
      subject: `⚠️ Urgente: Milestone "${data.milestoneName}" scade domani`,
      title: '⚠️ Promemoria Urgente',
      urgencyColor: '#f59e0b',
      message: `
        <p>Gentile ${data.clientName},</p>
        <p>La milestone <strong>"${data.milestoneName}"</strong> del preventivo <strong>"${data.quoteName}"</strong> scadrà <strong>domani (${formattedDate})</strong>.</p>
        <p>Ti invitiamo a completare il pagamento per evitare ritardi nell'avanzamento del progetto.</p>
      `,
      ctaText: 'Paga Ora',
      ctaBg: '#f59e0b'
    }
  }

  return {
    subject: `🚨 Ultimo Avviso: Milestone "${data.milestoneName}" scade oggi`,
    title: '🚨 Ultimo Avviso',
    urgencyColor: '#ef4444',
    message: `
      <p>Gentile ${data.clientName},</p>
      <p>La milestone <strong>"${data.milestoneName}"</strong> del preventivo <strong>"${data.quoteName}"</strong> scade <strong>oggi (${formattedDate})</strong>.</p>
      <p><strong>Questo è l'ultimo giorno disponibile</strong> per completare il pagamento. Ti preghiamo di procedere immediatamente per non bloccare l'avanzamento del progetto.</p>
    `,
    ctaText: 'Paga Immediatamente',
    ctaBg: '#ef4444'
  }
}

export async function sendMilestoneReminder(
  reminderType: ReminderType,
  data: MilestoneReminderData,
  clientEmail: string
): Promise<boolean> {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('SMTP credentials not configured. Skipping milestone reminder email.')
      return false
    }

    const content = getMilestoneReminderContent(reminderType, data)
    const formattedAmount = new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(data.milestoneAmount)

    const emailHTML = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb;">
        <!-- Header with Righello Branding -->
        <div style="background: linear-gradient(135deg, #D946EF, #9333EA); padding: 40px 30px; text-align: center; position: relative; overflow: hidden;">
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.05); backdrop-filter: blur(100px);"></div>
          <div style="position: relative; z-index: 1;">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">RIGHELLO</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px; font-weight: 500;">We Are Digital</p>
          </div>
        </div>
        
        <!-- Urgency Banner -->
        <div style="background: ${content.urgencyColor}; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${content.title}</h2>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px 30px; background: white;">
          ${content.message}
          
          <!-- Milestone Details Card -->
          <div style="background: linear-gradient(135deg, rgba(217, 70, 239, 0.05), rgba(147, 51, 234, 0.05)); border: 1px solid rgba(217, 70, 239, 0.2); border-radius: 12px; padding: 24px; margin: 30px 0; backdrop-filter: blur(10px);">
            <div style="display: grid; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                <span style="color: #6b7280; font-size: 14px;">Preventivo:</span>
                <span style="color: #1f2937; font-weight: 600;">${data.quoteName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                <span style="color: #6b7280; font-size: 14px;">Milestone:</span>
                <span style="color: #1f2937; font-weight: 600;">${data.milestoneName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,0.05);">
                <span style="color: #6b7280; font-size: 14px;">Importo:</span>
                <span style="color: #D946EF; font-weight: 700; font-size: 18px;">${formattedAmount}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0;">
                <span style="color: #6b7280; font-size: 14px;">Scadenza:</span>
                <span style="color: ${content.urgencyColor}; font-weight: 600;">${new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(data.dueDate)}</span>
              </div>
            </div>
          </div>
          
          <!-- CTA Button -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.paymentUrl}" style="display: inline-block; background: ${content.ctaBg}; color: white; padding: 16px 48px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s;">
              ${content.ctaText}
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">Per qualsiasi domanda o chiarimento, non esitare a contattarci. Siamo qui per aiutarti!</p>
          <p style="color: #1f2937; margin-top: 20px;">Cordiali saluti,<br/><strong>Team Righello</strong></p>
        </div>
        
        <!-- Footer -->
        <div style="padding: 30px; text-align: center; background: #f9fafb; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.6;">
            <strong>RIGHELLO S.R.L.</strong><br/>
            Via Villaraccolta 23, Pasiano PN<br/>
            P.IVA 01979790934<br/>
            <a href="mailto:info@righello.com" style="color: #D946EF; text-decoration: none;">info@righello.com</a>
          </p>
        </div>
      </div>
    `

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"Righello Digital" <noreply@righello.com>',
      to: clientEmail,
      subject: content.subject,
      html: emailHTML,
    })

    console.log(`✅ Milestone reminder (${reminderType}) sent to ${clientEmail} for milestone "${data.milestoneName}"`)
    return true
  } catch (error) {
    console.error(`❌ Error sending milestone reminder (${reminderType}):`, error)
    return false
  }
}
