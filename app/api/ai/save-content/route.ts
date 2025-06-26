import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { content, templateId, templateName, userId } = await request.json()

    if (!content || !templateId || !userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { db } = await import("@/lib/firebase")
    const { collection, addDoc } = await import("firebase/firestore")

    // Save generated content to database
    await addDoc(collection(db, "ai_generated_content"), {
      content,
      templateId,
      templateName,
      userId,
      createdAt: new Date(),
    })

    return NextResponse.json({ success: true, message: "Content saved successfully" })
  } catch (error) {
    console.error("Error saving content:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
