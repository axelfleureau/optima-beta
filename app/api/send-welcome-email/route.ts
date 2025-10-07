import { type NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

async function verifyAuthToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const cookieToken = request.cookies.get("firebase-auth-token")?.value

    let token: string | null = null

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split("Bearer ")[1]
    } else if (cookieToken) {
      token = cookieToken
    }

    if (!token) {
      return null
    }

    const decodedToken = await verifyFirebaseToken(token)
    
    if (!decodedToken || !decodedToken.uid) {
      return null
    }

    return decodedToken
  } catch (error) {
    console.error("Error verifying auth token:", error)
    return null
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AUTH")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  const authUser = await verifyAuthToken(request)
  if (!authUser) {
    return NextResponse.json(
      { error: "Non autenticato" },
      { status: 401 }
    )
  }

  const userData = await getUserData(authUser.uid)
  if (!userData) {
    return NextResponse.json(
      { error: "Dati utente non trovati" },
      { status: 404 }
    )
  }

  if (userData.role !== "admin" && userData.role !== "super-admin") {
    return NextResponse.json(
      { error: "Permessi insufficienti" },
      { status: 403 }
    )
  }

  try {
    const { clientName, clientEmail, password, agencyName } = await request.json()

    const emailEnabled = process.env.ENABLE_WELCOME_EMAILS === "true"

    if (!emailEnabled) {
      return NextResponse.json(
        {
          success: false,
          message: "Email service not configured",
        },
        { status: 400 },
      )
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    // Email template
    const htmlTemplate = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Benvenuto in ${agencyName}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ec4899, #be185d); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .credentials { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ec4899; margin: 20px 0; }
        .button { display: inline-block; background: #ec4899; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Benvenuto in ${agencyName}!</h1>
          <p>Il tuo account è stato creato con successo</p>
        </div>
        
        <div class="content">
          <h2>Ciao ${clientName}!</h2>
          
          <p>Siamo entusiasti di averti come nostro cliente! Il tuo account sulla piattaforma ${agencyName} è stato configurato e sei pronto per iniziare.</p>
          
          <div class="credentials">
            <h3>🔐 Le tue credenziali di accesso:</h3>
            <p><strong>Email:</strong> ${clientEmail}</p>
            <p><strong>Password:</strong> ${password}</p>
          </div>
          
          <p>Con il tuo account potrai:</p>
          <ul>
            <li>✅ Visualizzare lo stato dei tuoi progetti</li>
            <li>✅ Comunicare direttamente con il nostro team</li>
            <li>✅ Monitorare i progressi delle tue campagne</li>
            <li>✅ Accedere a report e analytics dettagliati</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://optima-platform.vercel.app"}/login" class="button">
              Accedi alla Piattaforma
            </a>
          </div>
          
          <p><strong>Importante:</strong> Ti consigliamo di cambiare la password al primo accesso per motivi di sicurezza.</p>
          
          <p>Se hai domande o hai bisogno di assistenza, non esitare a contattarci. Siamo qui per aiutarti!</p>
          
          <p>Benvenuto nel team!<br>
          <strong>Il Team di ${agencyName}</strong></p>
        </div>
        
        <div class="footer">
          <p>Questa email è stata generata automaticamente. Se non hai richiesto questo account, contattaci immediatamente.</p>
          <p>© ${new Date().getFullYear()} ${agencyName}. Tutti i diritti riservati.</p>
        </div>
      </div>
    </body>
    </html>
    `

    // Send email
    await transporter.sendMail({
      from: `"${agencyName}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: clientEmail,
      subject: `🎉 Benvenuto in ${agencyName} - Le tue credenziali di accesso`,
      html: htmlTemplate,
    })

    return NextResponse.json({
      success: true,
      message: "Welcome email sent successfully",
    })
  } catch (error) {
    console.error("Error sending welcome email:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Failed to send welcome email",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
