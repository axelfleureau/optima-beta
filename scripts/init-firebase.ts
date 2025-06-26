import { initializeApp, getApps } from "firebase/app"
import { getFirestore, collection, doc, setDoc, addDoc } from "firebase/firestore"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyAEB8Vgc4C9iYLu02jdJ0AnQLNWVCmcSFE",
  authDomain: "optima-righello.firebaseapp.com",
  projectId: "optima-righello",
  storageBucket: "optima-righello.firebasestorage.app",
  messagingSenderId: "132734955127",
  appId: "1:132734955127:web:f6c1c83a5112c2f1736072",
  measurementId: "G-E76CNF7F11",
}

// Initialize Firebase only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)
const auth = getAuth(app)

// Sample data for initialization
const sampleClients = [
  {
    name: "Acme Inc",
    color: "bg-red-500",
    logo: "",
    industry: "Technology",
    contactEmail: "contact@acme.com",
    contactPhone: "+39 123 456 7890",
    address: "Via Roma 123, Milano",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Globex Corporation",
    color: "bg-blue-500",
    logo: "",
    industry: "Manufacturing",
    contactEmail: "info@globex.com",
    contactPhone: "+39 098 765 4321",
    address: "Via Venezia 456, Roma",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Initech",
    color: "bg-green-500",
    logo: "",
    industry: "Software",
    contactEmail: "hello@initech.com",
    contactPhone: "+39 555 123 456",
    address: "Via Napoli 789, Torino",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Umbrella Corp",
    color: "bg-purple-500",
    logo: "",
    industry: "Pharmaceutical",
    contactEmail: "contact@umbrella.com",
    contactPhone: "+39 444 987 654",
    address: "Via Firenze 321, Bologna",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: "Stark Industries",
    color: "bg-yellow-500",
    logo: "",
    industry: "Defense",
    contactEmail: "info@stark.com",
    contactPhone: "+39 333 111 222",
    address: "Via Genova 654, Palermo",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const sampleColumns = [
  { id: "da-fare", title: "Da Fare", color: "border-gray-200", order: 1 },
  { id: "to-do", title: "To Do", color: "border-blue-200", order: 2 },
  { id: "urgenze", title: "Urgenze", color: "border-red-200", order: 3 },
  { id: "in-corso", title: "In Corso", color: "border-yellow-200", order: 4 },
  { id: "validation", title: "Validation", color: "border-purple-200", order: 5 },
  { id: "done", title: "Done", color: "border-green-200", order: 6 },
  { id: "sospensioni", title: "Sospensioni", color: "border-gray-300", order: 7 },
  { id: "attivita-ricorrenti", title: "Attività Ricorrenti", color: "border-indigo-200", order: 8 },
]

const sampleCampaigns = [
  {
    title: "Campagna Email Black Friday",
    description: "Promozione speciale per il Black Friday con sconti fino al 50%",
    status: "active",
    progress: 65,
    startDate: new Date("2025-11-01"),
    endDate: new Date("2025-11-30"),
    budget: 5000,
    metrics: {
      reach: 15000,
      engagement: 2500,
      conversions: 320,
      ctr: 2.1,
      cpc: 0.85,
    },
    platforms: ["email", "social"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: "Lancio Nuovo Prodotto Instagram",
    description: "Campagna di lancio del nuovo prodotto sui social media",
    status: "draft",
    progress: 0,
    startDate: new Date("2025-12-01"),
    endDate: new Date("2025-12-15"),
    budget: 3000,
    metrics: {
      reach: 0,
      engagement: 0,
      conversions: 0,
      ctr: 0,
      cpc: 0,
    },
    platforms: ["instagram", "facebook"],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const sampleQuotes = [
  {
    title: "Campagna Social Media Q3",
    description: "Piano di comunicazione completo per il terzo trimestre",
    clientName: "Mario Rossi",
    clientCompany: "Globex SRL",
    total: 3000,
    currency: "EUR",
    status: "draft",
    items: [
      {
        description: "Gestione Social Media",
        quantity: 3,
        unitPrice: 800,
        total: 2400,
      },
      {
        description: "Creazione Contenuti",
        quantity: 1,
        unitPrice: 600,
        total: 600,
      },
    ],
    validUntil: new Date("2025-07-09"),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const samplePosts = [
  {
    title: "Post Instagram Prodotto Nuovo",
    description: "Lancio del nuovo prodotto con immagini accattivanti",
    platform: "instagram",
    postType: "post",
    status: "draft",
    scheduledDate: new Date("2025-05-15"),
    content: "🚀 Scopri il nostro nuovo prodotto! #innovation #newproduct",
    hashtags: ["innovation", "newproduct", "launch"],
    mediaUrls: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    title: "Annuncio LinkedIn Evento",
    description: "Promozione evento aziendale su LinkedIn",
    platform: "linkedin",
    postType: "post",
    status: "scheduled",
    scheduledDate: new Date("2025-05-20"),
    content: "📅 Non perdere il nostro evento del 25 maggio! Registrati ora.",
    hashtags: ["event", "business", "networking"],
    mediaUrls: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

async function initializeFirestore(tenantId: string, clientIds: string[]) {
  console.log("🔥 Initializing Firestore collections...")

  try {
    // Initialize workspace columns
    console.log("📋 Creating workspace columns...")
    for (const column of sampleColumns) {
      await setDoc(doc(db, "workspace_columns", column.id), {
        ...column,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Create sample tasks for each client
    console.log("📝 Creating sample tasks...")
    for (let i = 0; i < clientIds.length; i++) {
      const clientId = clientIds[i]
      const sampleTasks = [
        {
          title: `Setup database schema - ${sampleClients[i].name}`,
          description: "Design and implement the initial database schema",
          columnId: "da-fare",
          clientId,
          tenantId,
          priority: "medium" as const,
          dueDate: new Date("2025-05-25"),
          assignee: "frontend",
          tags: ["database", "setup"],
          comments: 0,
          attachments: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          title: `Create API documentation - ${sampleClients[i].name}`,
          description: "Document all API endpoints with examples",
          columnId: "in-corso",
          clientId,
          tenantId,
          priority: "high" as const,
          dueDate: new Date("2025-05-28"),
          assignee: "backend",
          tags: ["documentation", "api"],
          comments: 2,
          attachments: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      for (const task of sampleTasks) {
        await addDoc(collection(db, "tasks"), task)
      }
    }

    // Create sample campaigns
    console.log("🎯 Creating sample campaigns...")
    for (let i = 0; i < Math.min(clientIds.length, sampleCampaigns.length); i++) {
      await addDoc(collection(db, "campaigns"), {
        ...sampleCampaigns[i],
        clientId: clientIds[i],
        tenantId,
      })
    }

    // Create sample quotes
    console.log("💰 Creating sample quotes...")
    for (let i = 0; i < Math.min(clientIds.length, sampleQuotes.length); i++) {
      await addDoc(collection(db, "quotes"), {
        ...sampleQuotes[i],
        clientId: clientIds[i],
        tenantId,
      })
    }

    // Create sample posts
    console.log("📱 Creating sample posts...")
    for (let i = 0; i < Math.min(clientIds.length, samplePosts.length); i++) {
      await addDoc(collection(db, "posts"), {
        ...samplePosts[i],
        clientId: clientIds[i],
        tenantId,
      })
    }

    // Initialize AI usage tracking
    console.log("🤖 Initializing AI usage...")
    await setDoc(doc(db, "ai_usage", tenantId), {
      tenantId,
      tokensUsed: 750000,
      tokensLimit: 1000000,
      currentPlan: "180",
      resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    console.log("✅ Firestore initialization completed!")
  } catch (error) {
    console.error("❌ Error initializing Firestore:", error)
    throw error
  }
}

async function createSampleUser() {
  console.log("👤 Creating sample user...")

  try {
    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, "demo@righello.com", "password123")
    const user = userCredential.user
    const tenantId = user.uid

    // Create user document
    await setDoc(doc(db, "users", user.uid), {
      firstName: "Demo",
      lastName: "User",
      email: "demo@righello.com",
      companyName: "Righello Demo",
      tenantId,
      plan: "180",
      role: "admin", // Set as admin for testing
      aiTokensUsed: 750000,
      aiTokensLimit: 1000000,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    // Create sample clients
    console.log("🏢 Creating sample clients...")
    const clientIds: string[] = []

    for (const clientData of sampleClients) {
      const clientRef = await addDoc(collection(db, "clients"), {
        ...clientData,
        tenantId,
      })
      clientIds.push(clientRef.id)
    }

    // Initialize Firestore with sample data
    await initializeFirestore(tenantId, clientIds)

    console.log("🎉 Sample user created successfully!")
    console.log("📧 Email: demo@righello.com")
    console.log("🔑 Password: password123")

    return { user, tenantId, clientIds }
  } catch (error) {
    console.error("❌ Error creating sample user:", error)
    throw error
  }
}

// Main initialization function
async function initializeDatabase() {
  console.log("🚀 Starting Firebase database initialization...")

  try {
    await createSampleUser()
    console.log("✅ Database initialization completed successfully!")
    console.log("\n🔗 You can now login with:")
    console.log("📧 Email: demo@righello.com")
    console.log("🔑 Password: password123")
  } catch (error) {
    console.error("❌ Database initialization failed:", error)
  }
}

// Run the initialization
if (typeof window === "undefined") {
  initializeDatabase()
}

export { initializeDatabase, createSampleUser, initializeFirestore }
