export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"

export async function POST(request: NextRequest) {
  try {
    // Verifica autenticazione
    const token = request.cookies.get("firebase-auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const decodedToken = await verifyFirebaseToken(token)
    const senderData = await getUserData(decodedToken.uid)

    if (!senderData || !["admin", "super-admin"].includes(senderData.role || "")) {
      return NextResponse.json({ error: "Non hai i permessi per inviare email" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, type, subject, message } = body

    // Validazione dati
    if (!userId || !subject || !message) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    // Ottieni dati utente destinatario
    const recipientData = await getUserData(userId)
    if (!recipientData || !recipientData.email) {
      return NextResponse.json({ error: "Utente non trovato o senza email" }, { status: 404 })
    }

    // Per ora, solo logga l'invio email - verrà implementato nel task email system
    console.log("📧 Invio email:", {
      from: senderData.email,
      to: recipientData.email,
      subject,
      message,
      type
    })

    // TODO: Implementare invio email reale quando il sistema SMTP sarà configurato
    // await sendEmail({
    //   to: recipientData.email,
    //   subject,
    //   message,
    //   from: senderData.email
    // })

    return NextResponse.json({
      success: true,
      message: "Email inviata con successo",
      recipient: recipientData.email
    })

  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json({ error: "Sistema email non configurato" }, { status: 503 })
  }
}