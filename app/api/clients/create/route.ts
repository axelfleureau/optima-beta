import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken, getUserData, adminAuth, adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  let decodedToken: any = null
  let userData: any = null

  try {
    // Verifica autenticazione
    const token = request.cookies.get("firebase-auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    decodedToken = await verifyFirebaseToken(token)
    userData = await getUserData(decodedToken.uid)

    if (!userData || !["admin", "super-admin", "direzione"].includes(userData.role || "")) {
      return NextResponse.json({ error: "Non hai i permessi per creare clienti" }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      email,
      phone,
      company,
      industry,
      contactEmail,
      contactPhone,
      address,
      status,
    } = body

    // Validate required fields
    if (!name || !email || !status) {
      return NextResponse.json(
        { error: "Nome, email e stato sono obbligatori" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Formato email non valido" },
        { status: 400 }
      )
    }

    // Validate contactEmail if provided
    if (contactEmail && contactEmail.trim() !== "" && !emailRegex.test(contactEmail)) {
      return NextResponse.json(
        { error: "Formato email di contatto non valido" },
        { status: 400 }
      )
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: "Errore di configurazione database" },
        { status: 500 }
      )
    }

    // Check if client with this email already exists in this tenant
    const existingClientQuery = await adminDb
      .collection("clients")
      .where("email", "==", email.trim().toLowerCase())
      .where("tenantId", "==", userData.tenantId)
      .get()

    if (!existingClientQuery.empty) {
      return NextResponse.json(
        { error: "Un cliente con questa email esiste già" },
        { status: 409 }
      )
    }

    // Create client document
    const clientData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      company: company?.trim() || null,
      industry: industry?.trim() || null,
      contactEmail: contactEmail?.trim() || null,
      contactPhone: contactPhone?.trim() || null,
      address: address?.trim() || null,
      status,
      tenantId: userData.tenantId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      totalValue: 0,
      projectsCount: 0,
    }

    // Add client to Firestore
    const clientRef = await adminDb.collection("clients").add(clientData)

    return NextResponse.json(
      {
        success: true,
        clientId: clientRef.id,
        message: "Cliente creato con successo",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating client:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}