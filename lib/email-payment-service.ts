/**
 * Email Payment Service
 * 
 * PHASE 5C: Quote Auto-Payment - Email Notifications
 * 
 * This service handles email notifications for payment events,
 * reusing the existing SMTP configuration from subscription service.
 */

import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

const FROM_EMAIL = process.env.SMTP_FROM || "noreply@righello.com"

/**
 * Send payment success confirmation email to client
 * 
 * @param clientEmail - Client's email address
 * @param clientName - Client's name
 * @param quoteName - Name/title of the quote
 * @param amount - Payment amount in cents
 * @param currency - Currency code (EUR, USD, etc.)
 */
export async function sendPaymentSuccessEmail(
  clientEmail: string,
  clientName: string,
  quoteName: string,
  amount: number,
  currency: string
): Promise<void> {
  try {
    const formattedAmount = (amount / 100).toFixed(2)
    const currencySymbol = currency.toUpperCase()
    
    const subject = `Pagamento confermato - ${quoteName}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
              color: white; 
              padding: 30px; 
              border-radius: 10px 10px 0 0; 
              text-align: center; 
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content { 
              background: #f9fafb; 
              padding: 30px; 
              border-radius: 0 0 10px 10px;
            }
            .payment-card { 
              background: white; 
              border-radius: 8px; 
              padding: 20px; 
              margin: 20px 0; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
            }
            .amount {
              font-size: 32px;
              font-weight: bold;
              color: #10b981;
              margin: 15px 0;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              color: #6b7280;
              font-weight: 500;
            }
            .detail-value {
              color: #111827;
              font-weight: 600;
            }
            .footer { 
              text-align: center; 
              padding: 20px; 
              color: #6b7280; 
              font-size: 14px; 
            }
            .success-icon {
              font-size: 48px;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="success-icon">✅</div>
              <h1>Pagamento Confermato</h1>
              <p>Il tuo pagamento è stato completato con successo</p>
            </div>
            
            <div class="content">
              <p>Gentile <strong>${clientName}</strong>,</p>
              
              <p>Il pagamento per il preventivo <strong>${quoteName}</strong> è stato completato con successo.</p>
              
              <div class="payment-card">
                <h2 style="margin-top: 0; color: #111827;">Dettagli Pagamento</h2>
                
                <div class="amount">
                  ${formattedAmount} ${currencySymbol}
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Preventivo</span>
                  <span class="detail-value">${quoteName}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Importo</span>
                  <span class="detail-value">${formattedAmount} ${currencySymbol}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Data</span>
                  <span class="detail-value">${new Date().toLocaleDateString("it-IT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}</span>
                </div>
                
                <div class="detail-row">
                  <span class="detail-label">Stato</span>
                  <span class="detail-value" style="color: #10b981;">✓ Pagato</span>
                </div>
              </div>
              
              <p>Riceverai a breve ulteriori comunicazioni riguardo i prossimi passi del progetto.</p>
              
              <p><strong>Grazie per la fiducia!</strong></p>
              
              <p>Cordiali saluti,<br><strong>Il team Righello</strong></p>
            </div>
            
            <div class="footer">
              <p>Questa è una conferma automatica del pagamento.</p>
              <p>Per qualsiasi domanda, contatta il nostro supporto.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: clientEmail,
      subject,
      html,
    })
    
    console.log(`✅ Sent payment success email to ${clientEmail}`)
  } catch (error) {
    const err = error as Error
    console.error(`❌ Failed to send payment success email:`, err.message)
    throw error
  }
}

/**
 * Send payment failure notification email to client
 * 
 * @param clientEmail - Client's email address
 * @param clientName - Client's name
 * @param quoteName - Name/title of the quote
 * @param errorMessage - Error message from payment failure
 */
export async function sendPaymentFailureEmail(
  clientEmail: string,
  clientName: string,
  quoteName: string,
  errorMessage?: string
): Promise<void> {
  try {
    const subject = `Pagamento non riuscito - ${quoteName}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              margin: 0;
              padding: 0;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header { 
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
              color: white; 
              padding: 30px; 
              border-radius: 10px 10px 0 0; 
              text-align: center; 
            }
            .content { 
              background: #f9fafb; 
              padding: 30px; 
              border-radius: 0 0 10px 10px;
            }
            .error-card { 
              background: #fef2f2; 
              border-left: 4px solid #ef4444; 
              padding: 15px; 
              margin: 20px 0; 
              border-radius: 4px; 
            }
            .footer { 
              text-align: center; 
              padding: 20px; 
              color: #6b7280; 
              font-size: 14px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>❌ Pagamento Non Riuscito</h1>
              <p>C'è stato un problema con il pagamento</p>
            </div>
            
            <div class="content">
              <p>Gentile <strong>${clientName}</strong>,</p>
              
              <p>Purtroppo il pagamento per il preventivo <strong>${quoteName}</strong> non è andato a buon fine.</p>
              
              ${
                errorMessage
                  ? `
              <div class="error-card">
                <strong>Motivo:</strong> ${errorMessage}
              </div>
              `
                  : ""
              }
              
              <p><strong>Cosa puoi fare:</strong></p>
              <ul>
                <li>Verifica che la tua carta abbia fondi sufficienti</li>
                <li>Controlla i limiti di spesa della carta</li>
                <li>Prova con un altro metodo di pagamento</li>
                <li>Contatta la tua banca per maggiori informazioni</li>
              </ul>
              
              <p>Ti invitiamo a configurare nuovamente il metodo di pagamento e riprovare.</p>
              
              <p>Se hai bisogno di assistenza, non esitare a contattarci.</p>
              
              <p>Cordiali saluti,<br><strong>Il team Righello</strong></p>
            </div>
            
            <div class="footer">
              <p>Per assistenza, contatta il nostro supporto.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: clientEmail,
      subject,
      html,
    })
    
    console.log(`✅ Sent payment failure email to ${clientEmail}`)
  } catch (error) {
    const err = error as Error
    console.error(`❌ Failed to send payment failure email:`, err.message)
    throw error
  }
}
