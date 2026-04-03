export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken, getUserData, adminAuth, adminDb } from "@/lib/firebase-admin"
import { canManageUser, hasPermission, type UserRole } from "@/lib/role-hierarchy"

// PATCH - Aggiorna utente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verifica autenticazione
    const token = request.cookies.get("firebase-auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const decodedToken = await verifyFirebaseToken(token)
    const editorData = await getUserData(decodedToken.uid)

    if (!editorData || !hasPermission(editorData.role as UserRole, "canModifyUserRoles")) {
      return NextResponse.json({ error: "Non hai i permessi per modificare utenti" }, { status: 403 })
    }

    const { id: userId } = await params
    const body = await request.json()
    const { firstName, lastName, email, role, companyName, isSuspended } = body

    // Validazione dati
    if (!firstName || !lastName || !email || !role) {
      return NextResponse.json({ error: "Campi obbligatori mancanti" }, { status: 400 })
    }

    if (!["super-admin", "admin", "direzione", "capo-reparto", "junior", "client"].includes(role)) {
      return NextResponse.json({ error: "Ruolo non valido" }, { status: 400 })
    }

    // Verifica che l'utente esista
    const userDoc = await adminDb?.collection("users").doc(userId).get()
    if (!userDoc?.exists) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
    }

    const currentUserData = userDoc.data()
    if (!currentUserData) {
      return NextResponse.json({ error: "Dati utente non trovati" }, { status: 404 })
    }

    // Verifica permessi usando la gerarchia dei ruoli
    if (!canManageUser(editorData.role as UserRole, currentUserData.role as UserRole)) {
      return NextResponse.json({ 
        error: "Non hai i permessi per modificare questo utente" 
      }, { status: 403 })
    }

    // Se l'email è cambiata, verifica che non sia già in uso
    if (email !== currentUserData.email) {
      const existingUser = await adminDb?.collection("users").where("email", "==", email).get()
      if (existingUser?.size && existingUser.size > 0) {
        const existingDocs = existingUser.docs.filter((doc: any) => doc.id !== userId)
        if (existingDocs.length > 0) {
          return NextResponse.json({ error: "Email già in uso da un altro utente" }, { status: 409 })
        }
      }
    }

    // Aggiorna Firebase Auth se email è cambiata
    if (email !== currentUserData.email) {
      await adminAuth?.updateUser(userId, { email })
    }

    // Aggiorna display name in Firebase Auth
    await adminAuth?.updateUser(userId, {
      displayName: `${firstName} ${lastName}`,
      disabled: isSuspended || false,
    })

    // Aggiorna documento Firestore
    const updatedData = {
      firstName,
      lastName,
      email,
      role,
      companyName: companyName || null,
      isSuspended: isSuspended || false,
      updatedAt: new Date(),
      updatedBy: decodedToken.uid,
    }

    await adminDb?.collection("users").doc(userId).update(updatedData)

    return NextResponse.json({
      success: true,
      message: "Utente aggiornato con successo",
    })

  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}

// DELETE - Rimuovi utente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verifica autenticazione
    const token = request.cookies.get("firebase-auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const decodedToken = await verifyFirebaseToken(token)
    const editorData = await getUserData(decodedToken.uid)

    if (!editorData || !hasPermission(editorData.role as UserRole, "canDeleteUsers")) {
      return NextResponse.json({ error: "Non hai i permessi per rimuovere utenti" }, { status: 403 })
    }

    const { id: userId } = await params

    // Non permettere l'auto-eliminazione
    if (userId === decodedToken.uid) {
      return NextResponse.json({ error: "Non puoi eliminare il tuo account" }, { status: 400 })
    }

    // Verifica che l'utente esista
    const userDoc = await adminDb?.collection("users").doc(userId).get()
    if (!userDoc?.exists) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
    }

    const userData = userDoc.data()
    if (!userData) {
      return NextResponse.json({ error: "Dati utente non trovati" }, { status: 404 })
    }

    // Verifica permessi usando la gerarchia dei ruoli
    if (!canManageUser(editorData.role as UserRole, userData.role as UserRole)) {
      return NextResponse.json({ 
        error: "Non hai i permessi per eliminare questo utente" 
      }, { status: 403 })
    }

    // Elimina da Firebase Auth
    await adminAuth?.deleteUser(userId)

    // Elimina documento Firestore
    await adminDb?.collection("users").doc(userId).delete()

    // TODO: Eliminare anche dati correlati (tasks, progetti, etc.)
    
    return NextResponse.json({
      success: true,
      message: "Utente eliminato con successo",
    })

  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 })
  }
}