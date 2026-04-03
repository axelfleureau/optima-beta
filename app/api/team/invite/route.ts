export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken, getUserData, adminAuth, adminDb } from "@/lib/firebase-admin"
import { sendInviteEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  let decodedToken: any = null
  let inviterData: any = null

  try {
    // Verifica autenticazione
    const token = request.cookies.get("firebase-auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    decodedToken = await verifyFirebaseToken(token)
    inviterData = await getUserData(decodedToken.uid)

    if (!inviterData || !["admin", "super-admin"].includes(inviterData.role || "")) {
      return NextResponse.json({ error: "Non hai i permessi per invitare utenti" }, { status: 403 })
    }

    const body = await request.json()
    const { email, firstName, lastName, role, companyName, message } = body

    // Validazione dati
    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    if (!["admin", "user", "client"].includes(role)) {
      return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 })
    }

    // Verifica che l'utente non esista già
    const existingUser = await adminDb?.collection("users").where("email", "==", email).get()
    if (existingUser?.size && existingUser.size > 0) {
      return NextResponse.json({ error: "Un utente con questa email esiste già" }, { status: 409 })
    }

    // Crea utente Firebase Auth
    const newUser = await adminAuth?.createUser({
      email,
      displayName: `${firstName} ${lastName}`,
      password: generateTempPassword(), // Genera password temporanea
    })

    if (!newUser) {
      return NextResponse.json({ error: "Errore nella creazione utente" }, { status: 500 })
    }

    // Crea documento utente in Firestore
    const userData = {
      id: newUser.uid,
      email,
      firstName,
      lastName,
      role,
      tenantId: inviterData.tenantId,
      parentTenantId: inviterData.role === "super-admin" ? undefined : inviterData.tenantId,
      companyName: companyName || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      isSuspended: false,
      emailVerified: false,
      status: "invited",
      invitedBy: decodedToken.uid,
      invitedAt: new Date(),
    }

    await adminDb?.collection("users").doc(newUser.uid).set(userData)

    // Genera link per reset password (primo accesso)
    const resetLink = await adminAuth?.generatePasswordResetLink(email)

    // Invia email di invito
    try {
      await sendInviteEmail({
        to: email,
        firstName,
        lastName,
        inviterName: `${inviterData.firstName} ${inviterData.lastName}`,
        inviterEmail: inviterData.email || "",
        role,
        resetLink: resetLink || "",
        customMessage: message,
      })
    } catch (emailError) {
      console.error("Error sending invite email:", emailError)
      // Non blocchiamo il processo se l'email fallisce
    }

    return NextResponse.json({
      success: true,
      userId: newUser.uid,
      message: "Utente invitato con successo",
    })

  } catch (error) {
    console.error("Error inviting user:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}

// Genera una password temporanea sicura
function generateTempPassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
  let password = ""
  
  // Usa crypto per generazione sicura
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(length)
    crypto.getRandomValues(array)
    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length]
    }
  } else {
    // Fallback per ambienti Node.js
    const crypto = require('crypto')
    const randomBytes = crypto.randomBytes(length)
    for (let i = 0; i < length; i++) {
      password += charset[randomBytes[i] % charset.length]
    }
  }
  
  return password
}