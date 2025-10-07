import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { verifyFirebaseToken, getUserData, adminAuth, adminDb } from "@/lib/firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const createClientSchema = z.object({
  name: z.string().min(1, 'Nome richiesto').max(100),
  email: z.string().email('Email non valida'),
  phone: z.string().optional(),
  company: z.string().max(200).optional(),
  industry: z.string().optional(),
  contactEmail: z.string().email('Email di contatto non valida').optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  address: z.string().optional(),
  status: z.string().min(1, 'Stato richiesto')
})

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
    const validatedData = createClientSchema.parse(body)
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
    } = validatedData

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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Dati non validi', 
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        },
        { status: 400 }
      )
    }

    console.error("Error creating client:", error)
    return NextResponse.json(
      { error: "Errore interno del server" },
      { status: 500 }
    )
  }
}