import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, doc, updateDoc, deleteField, addDoc, Timestamp } from "firebase/firestore"

// Configurazione Firebase (usa le stesse credenziali del progetto)
const firebaseConfig = {
  // Le credenziali verranno lette dalle variabili d'ambiente
}

interface LegacyEditorialPost {
  id: string
  [key: string]: any // struttura flessibile per gestire tutti i campi corrotti
}

interface NormalizedEditorialPost {
  title: string
  content: string
  description?: string
  scheduledDate: string
  scheduledTime?: string
  status: string
  type: string
  format: string
  platform: string
  keywords?: string[]
  hashtags?: string[]
  objective?: string
  targetAudience?: string
  notes?: string
  clientId: string
  tenantId: string
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export async function normalizeEditorialPosts() {
  const { db } = await import("@/lib/firebase")

  console.log("🚀 Iniziando normalizzazione dei post editoriali...")

  try {
    // 1. Leggi tutti i documenti dalla collezione editorialPosts
    const postsSnapshot = await getDocs(collection(db, "editorialPosts"))
    const posts = postsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as LegacyEditorialPost[]

    console.log(`📊 Trovati ${posts.length} post da normalizzare`)

    let normalizedCount = 0
    let aiContentExtracted = 0
    let errorsCount = 0

    for (const post of posts) {
      try {
        console.log(`🔄 Normalizzando post: ${post.id}`)

        // 2. Estrai e salva i dati AI se presenti
        if (post.aiGenerated) {
          await extractAndSaveAIContent(post)
          aiContentExtracted++
        }

        // 3. Normalizza la struttura del post
        const normalizedPost = normalizePostStructure(post)

        // 4. Aggiorna il documento con la struttura pulita
        const postRef = doc(db, "editorialPosts", post.id)

        // Rimuovi tutti i campi corrotti
        const fieldsToRemove = [
          "aiGenerated",
          "name", // sostituito da title
          "date", // sostituito da scheduledDate
          "postType", // sostituito da type
          "caption", // sostituito da content
          "visuals", // gestito separatamente
          "attachments", // gestito separatamente
        ]

        const updateData: any = { ...normalizedPost }

        // Aggiungi deleteField per i campi da rimuovere
        fieldsToRemove.forEach((field) => {
          if (post[field] !== undefined) {
            updateData[field] = deleteField()
          }
        })

        await updateDoc(postRef, updateData)
        normalizedCount++

        console.log(`✅ Post ${post.id} normalizzato con successo`)
      } catch (error) {
        console.error(`❌ Errore normalizzando post ${post.id}:`, error)
        errorsCount++
      }
    }

    console.log(`🎉 Normalizzazione completata!`)
    console.log(`✅ Post normalizzati: ${normalizedCount}`)
    console.log(`🤖 Contenuti AI estratti: ${aiContentExtracted}`)
    console.log(`❌ Errori: ${errorsCount}`)
  } catch (error) {
    console.error("❌ Errore durante la normalizzazione:", error)
  }
}

async function extractAndSaveAIContent(post: LegacyEditorialPost) {
  const { db } = await import("@/lib/firebase")
  try {
    const aiData = post.aiGenerated

    if (aiData.caption) {
      // Salva la caption AI generata
      await addDoc(collection(db, "ai_generated_content"), {
        postId: post.id,
        type: "caption",
        content: typeof aiData.caption === "string" ? aiData.caption : aiData.caption.caption || "",
        metadata: {
          score: aiData.caption.analysis?.score,
          suggestions: aiData.caption.analysis?.suggestions || [],
          strengths: aiData.caption.analysis?.strengths || [],
          improvements: aiData.caption.analysis?.improvements || [],
          generatedAt: Timestamp.now(),
          model: "gpt-4o-mini",
        },
        tenantId: post.tenantId,
        createdBy: post.createdBy,
        createdAt: Timestamp.now(),
      })
    }

    if (aiData.visuals) {
      // Salva i visual AI generati
      await addDoc(collection(db, "ai_generated_content"), {
        postId: post.id,
        type: "visual",
        content: JSON.stringify(aiData.visuals),
        metadata: {
          generatedAt: Timestamp.now(),
          model: "dall-e-3",
        },
        tenantId: post.tenantId,
        createdBy: post.createdBy,
        createdAt: Timestamp.now(),
      })
    }

    console.log(`🤖 Contenuto AI estratto per post ${post.id}`)
  } catch (error) {
    console.error(`❌ Errore estraendo contenuto AI per post ${post.id}:`, error)
  }
}

function normalizePostStructure(post: LegacyEditorialPost): NormalizedEditorialPost {
  // Normalizza i campi con fallback sicuri
  const title = post.title || post.name || "Post senza titolo"
  const content = post.content || post.caption || ""
  const description = post.description || ""

  // Normalizza le date
  let scheduledDate = ""
  if (post.scheduledDate) {
    if (typeof post.scheduledDate === "string") {
      scheduledDate = post.scheduledDate
    } else if (post.scheduledDate.toDate) {
      scheduledDate = post.scheduledDate.toDate().toISOString().split("T")[0]
    }
  } else if (post.date) {
    if (post.date.toDate) {
      scheduledDate = post.date.toDate().toISOString().split("T")[0]
    }
  }

  // Normalizza piattaforma (da array a stringa)
  let platform = "instagram" // default
  if (post.platform) {
    if (Array.isArray(post.platform)) {
      platform = post.platform[0] || "instagram"
    } else {
      platform = post.platform
    }
  }

  // Normalizza tipo e formato
  const type = post.type || post.postType || post.format || "post"
  const format = post.format || post.postType || post.type || "post_singolo"

  // Normalizza status
  const status = post.status || "bozza"

  // Normalizza array
  const keywords = Array.isArray(post.keywords) ? post.keywords : Array.isArray(post.tags) ? post.tags : []
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags : []

  return {
    title,
    content,
    description,
    scheduledDate,
    scheduledTime: post.scheduledTime || "",
    status,
    type,
    format,
    platform,
    keywords,
    hashtags,
    objective: post.objective,
    targetAudience: post.targetAudience,
    notes: post.notes || "",
    clientId: post.clientId,
    tenantId: post.tenantId,
    createdBy: post.createdBy,
    createdAt: post.createdAt || Timestamp.now(),
    updatedAt: Timestamp.now(),
  }
}

// Esegui la normalizzazione
normalizeEditorialPosts()
  .then(() => {
    console.log("✅ Script di normalizzazione completato")
    process.exit(0)
  })
  .catch((error) => {
    console.error("❌ Script di normalizzazione fallito:", error)
    process.exit(1)
  })
