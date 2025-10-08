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
