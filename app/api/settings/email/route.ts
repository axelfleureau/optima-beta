import { type NextRequest, NextResponse } from "next/server"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get("tenantId")

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 })
    }

    const settingsDoc = await getDoc(doc(db, "email_settings", tenantId))

    if (settingsDoc.exists()) {
      return NextResponse.json(settingsDoc.data())
    } else {
      // Return default settings
      return NextResponse.json({
        enabled: false,
        smtpHost: "",
        smtpPort: 587,
        smtpSecure: false,
        smtpUser: "",
        smtpPass: "",
        fromEmail: "",
        fromName: "",
      })
    }
  } catch (error) {
    console.error("Error fetching email settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const settings = await request.json()
    const { tenantId, ...emailSettings } = settings

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID required" }, { status: 400 })
    }

    await setDoc(doc(db, "email_settings", tenantId), {
      ...emailSettings,
      updatedAt: new Date(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving email settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
