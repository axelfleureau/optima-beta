import nodemailer from "nodemailer"
import { TokenPlan, getPlanById } from "@/lib/constants/token-plans"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

interface SubscriptionEmailData {
  userEmail: string
  userName: string
  plan: TokenPlan
  billingCycleEnd?: Date
}

export class SubscriptionEmailService {
  private static from = process.env.SMTP_FROM || "noreply@optima.ai"
  
  static async sendSubscriptionConfirmation(data: SubscriptionEmailData) {
    const { userEmail, userName, plan, billingCycleEnd } = data
    
    const subject = `Benvenuto in ${plan.name}! 🎉`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; }
            .plan-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .feature { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .feature:last-child { border-bottom: none; }
            .cta { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Benvenuto in ${plan.name}!</h1>
              <p>La tua sottoscrizione è stata attivata con successo</p>
            </div>
            
            <div class="content">
              <p>Ciao ${userName},</p>
              
              <p>Grazie per esserti iscritto a <strong>${plan.name}</strong>! Il tuo piano è ora attivo e puoi iniziare ad utilizzare tutte le funzionalità AI di Optima.</p>
              
              <div class="plan-card">
                <h2 style="margin-top: 0;">Il Tuo Piano</h2>
                <div style="font-size: 24px; font-weight: bold; color: #667eea; margin: 10px 0;">
                  €${plan.price}/mese
                </div>
                <div style="color: #6b7280; margin-bottom: 20px;">
                  ${plan.tokenLimit.toLocaleString()} token mensili
                </div>
                
                <h3>Funzionalità Incluse:</h3>
                ${plan.features.map(feature => `
                  <div class="feature">✅ ${feature}</div>
                `).join('')}
              </div>
              
              ${billingCycleEnd ? `
                <p>Il tuo prossimo rinnovo è previsto per <strong>${billingCycleEnd.toLocaleDateString("it-IT")}</strong>.</p>
              ` : ''}
              
              <p>Puoi iniziare subito ad utilizzare le funzionalità AI:</p>
              <ul>
                <li><strong>DALL-E 3</strong>: Genera immagini per Instagram, Facebook, LinkedIn</li>
                <li><strong>GPT-4 AI Assistant</strong>: Chat intelligente per task automation</li>
                <li><strong>Command Bar</strong>: Accedi a tutto con Cmd+K</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="cta">
                  Vai alla Dashboard
                </a>
              </div>
              
              <p>Se hai domande o hai bisogno di supporto, siamo qui per aiutarti!</p>
              
              <p>Grazie,<br>Il Team Optima</p>
            </div>
            
            <div class="footer">
              <p>Hai ricevuto questa email perché ti sei iscritto a Optima.</p>
              <p>Gestisci il tuo piano nelle <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing">impostazioni di fatturazione</a>.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    try {
      await transporter.sendMail({
        from: this.from,
        to: userEmail,
        subject,
        html,
      })
      
      console.log(`✅ Sent subscription confirmation to ${userEmail}`)
    } catch (error) {
      const err = error as Error
      console.error(`❌ Failed to send subscription confirmation:`, err.message)
      throw error
    }
  }
  
  static async sendUpgradeNotification(data: SubscriptionEmailData & { previousPlan: TokenPlan }) {
    const { userEmail, userName, plan, previousPlan } = data
    
    const subject = `Upgrade completato a ${plan.name}! 🚀`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; }
            .comparison { display: flex; gap: 20px; margin: 20px 0; }
            .plan-box { flex: 1; background: white; border-radius: 8px; padding: 15px; }
            .cta { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚀 Upgrade Completato!</h1>
              <p>Ora hai accesso a ${plan.name}</p>
            </div>
            
            <div class="content">
              <p>Ciao ${userName},</p>
              
              <p>Il tuo upgrade a <strong>${plan.name}</strong> è stato completato con successo! Ora hai accesso a più token e funzionalità avanzate.</p>
              
              <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3>Cosa è cambiato:</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px;"></td>
                    <td style="padding: 10px; text-align: center; color: #6b7280;">${previousPlan.name}</td>
                    <td style="padding: 10px; text-align: center; color: #10b981; font-weight: bold;">${plan.name}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px;">Token Mensili</td>
                    <td style="padding: 10px; text-align: center;">${(previousPlan.tokenLimit / 1_000_000).toFixed(1)}M</td>
                    <td style="padding: 10px; text-align: center; color: #10b981; font-weight: bold;">
                      ${(plan.tokenLimit / 1_000_000).toFixed(1)}M
                      <span style="color: #10b981;">↑</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px;">Prezzo</td>
                    <td style="padding: 10px; text-align: center;">€${previousPlan.price}</td>
                    <td style="padding: 10px; text-align: center; color: #10b981; font-weight: bold;">€${plan.price}</td>
                  </tr>
                </table>
              </div>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="cta">
                  Esplora le Nuove Funzionalità
                </a>
              </div>
              
              <p>Grazie per aver scelto di crescere con Optima!</p>
              
              <p>Il Team Optima</p>
            </div>
            
            <div class="footer">
              <p>Gestisci il tuo piano nelle <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing">impostazioni di fatturazione</a>.</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    try {
      await transporter.sendMail({
        from: this.from,
        to: userEmail,
        subject,
        html,
      })
      
      console.log(`✅ Sent upgrade notification to ${userEmail}`)
    } catch (error) {
      const err = error as Error
      console.error(`❌ Failed to send upgrade notification:`, err.message)
      throw error
    }
  }
  
  static async sendCancellationConfirmation(data: SubscriptionEmailData) {
    const { userEmail, userName, plan, billingCycleEnd } = data
    
    const subject = `Conferma Cancellazione - ${plan.name}`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .cta { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Sottoscrizione Cancellata</h1>
              <p>Ci dispiace vederti andare</p>
            </div>
            
            <div class="content">
              <p>Ciao ${userName},</p>
              
              <p>Abbiamo ricevuto la tua richiesta di cancellazione per <strong>${plan.name}</strong>.</p>
              
              <div class="warning">
                <strong>⚠️ Accesso attivo fino a:</strong> ${billingCycleEnd?.toLocaleDateString("it-IT") || "fine ciclo corrente"}
                <p style="margin: 10px 0 0 0;">Potrai continuare ad utilizzare tutte le funzionalità fino a questa data. Dopo, il tuo account passerà al piano gratuito.</p>
              </div>
              
              <p>Cosa succederà:</p>
              <ul>
                <li>✅ Accesso completo fino al ${billingCycleEnd?.toLocaleDateString("it-IT") || "fine ciclo"}</li>
                <li>❌ Nessun rinnovo automatico</li>
                <li>📊 Dati salvati e accessibili</li>
                <li>🔄 Puoi riattivare in qualsiasi momento</li>
              </ul>
              
              <p>Se hai cancellato per errore o vuoi darci un'altra possibilità:</p>
              
              <div style="text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing" class="cta">
                  Riattiva Sottoscrizione
                </a>
              </div>
              
              <p>Ci piacerebbe sapere il motivo della tua cancellazione per migliorare il servizio. Rispondi a questa email se vuoi condividere il tuo feedback.</p>
              
              <p>Grazie per aver provato Optima,<br>Il Team Optima</p>
            </div>
            
            <div class="footer">
              <p>Hai domande? Contattaci a support@optima.ai</p>
            </div>
          </div>
        </body>
      </html>
    `
    
    try {
      await transporter.sendMail({
        from: this.from,
        to: userEmail,
        subject,
        html,
      })
      
      console.log(`✅ Sent cancellation confirmation to ${userEmail}`)
    } catch (error) {
      const err = error as Error
      console.error(`❌ Failed to send cancellation confirmation:`, err.message)
      throw error
    }
  }
}
