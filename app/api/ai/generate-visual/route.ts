export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from "next/server"
import { verifyFirebaseToken, getUserData } from "@/lib/firebase-admin"
import { getOrganizationAdminId, logTokenUsage } from "@/lib/ai-service"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const rateLimitResult = await rateLimit(request, "AI")
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.reset)
  }

  try {
    // Verifica autenticazione
    const token = request.cookies.get("firebase-auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 })
    }

    const decodedToken = await verifyFirebaseToken(token)
    const userData = await getUserData(decodedToken.uid)
    if (!userData) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 })
    }

    const { prompt, format, index = 0, isCarousel = false } = await request.json()

    if (!prompt) {
      return NextResponse.json({ error: "Prompt richiesto" }, { status: 400 })
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn("⚠️ OPENAI_API_KEY non trovata")
      return NextResponse.json({ 
        error: "Chiave API OpenAI non configurata" 
      }, { status: 503 })
    }

    // Get appropriate image size based on format
    const sizeMap = {
      square: "1024x1024",     // 1:1 per Instagram feed
      story: "1024x1792",      // 9:16 per Stories
      landscape: "1792x1024",  // 16:9 per Facebook/LinkedIn 
      portrait: "1024x1280",   // 4:5 per Instagram
      reel: "1024x1792"        // 9:16 per Reels/TikTok
    }

    const imageSize = sizeMap[format as keyof typeof sizeMap] || "1024x1024"

    let currentPrompt = prompt

    // Add variation for carousel images
    if (isCarousel && index > 0) {
      const variations = [
        "focus on product details",
        "show broader context", 
        "highlight key benefits",
        "include call to action elements",
        "show different angle or perspective"
      ]
      const variation = variations[index % variations.length]
      currentPrompt = `${prompt}, ${variation}`
    }

    console.log(`🎨 Chiamata DALL-E per visual ${index + 1}`)

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: currentPrompt,
        n: 1,
        size: imageSize,
        quality: "standard",
        response_format: "url"
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error(`❌ Errore DALL-E:`, error)
      return NextResponse.json({ 
        error: error.error?.message || "Errore generazione immagine" 
      }, { status: response.status })
    }

    const data = await response.json()
    
    if (!data.data?.[0]) {
      return NextResponse.json({ 
        error: "Nessuna immagine generata" 
      }, { status: 500 })
    }

    // Log token usage for image generation (estimated)
    try {
      const { adminId } = await getOrganizationAdminId(decodedToken.uid)
      await logTokenUsage(adminId, decodedToken.uid, 100, "image_generation")
    } catch (logError) {
      console.warn("Warning: could not log token usage:", logError)
    }

    console.log(`✅ Visual generato con successo`)

    return NextResponse.json({
      success: true,
      imageUrl: data.data[0].url,
      prompt: currentPrompt
    })

  } catch (error) {
    console.error("Error generating visual:", error)
    return NextResponse.json({ 
      error: "Errore interno del server" 
    }, { status: 500 })
  }
}