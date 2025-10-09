# Optima - AI Operations Platform

## Executive Summary

**Optima** is a comprehensive AI-powered operations platform designed for international service businesses, agencies, and SMEs. The platform automates quote-to-payment workflows, content generation, and project management through autonomous AI agents and an intelligent command bar interface.

**Key Differentiators:**
- **Deterministic AI Pricing**: Template-based quote generation with real Righello project templates (€3,500-€6,170 base)
- **Multi-Tenant SaaS Architecture**: Enterprise-grade tenant isolation with Firebase + Stripe Connect
- **Autonomous AI Agents**: DALL-E 3 image generation, GPT-4o NLP, streaming AI feedback
- **Corporate Glassmorphic Design**: Arke/OpenAI-inspired professional aesthetic with AAA accessibility

**Current Status:** Production-ready MVP with complete quote-to-payment automation, AI content generation, and mobile-first responsive UI.

---

## Technical Architecture

### Technology Stack

**Frontend:**
- **Framework:** Next.js 15.2.4 (React 18+) with TypeScript
- **Styling:** Tailwind CSS 3.x with custom Liquid Glass Design System
- **UI Components:** Radix UI primitives (accessible, unstyled)
- **Animations:** Framer Motion with corporate motion system (100-200ms transitions)
- **State Management:** Redux Toolkit + Zustand for global/local state
- **Forms:** React Hook Form + Zod validation (mode: 'onChange')

**Backend:**
- **Runtime:** Node.js with Next.js API routes (serverless functions)
- **Authentication:** Firebase Auth with Google OAuth integration
- **Database:** Firebase Firestore (NoSQL) with multi-tenant isolation
- **Storage:** Firebase Storage for asset persistence (tenant-scoped)
- **Admin SDK:** firebase-admin for server-side operations

**AI & Integrations:**
- **LLM:** OpenAI GPT-4o via Vercel AI SDK (`ai` package)
- **Image Generation:** DALL-E 3 with Sharp.js for Instagram format compliance
- **Video Placeholder:** Sora 2 integration ready (not active)
- **Email:** Nodemailer for automated invoice delivery
- **Image Processing:** Sharp library for server-side resizing (Feed 3:4, Portrait 4:5, Reels 9:16)

**Payment Infrastructure:**
- **Provider:** Stripe + Stripe Connect
- **Architecture:** Three-tier hierarchy (Platform ← Tenant ← Client)
- **Features:** Checkout Sessions, Subscriptions, Webhooks, Invoice automation

### Architecture Patterns

**Multi-Tenant Isolation:**
```typescript
// All Firestore queries include tenantId filter
const quotesQuery = query(
  collection(db, "quotes"),
  where("tenantId", "==", userData.tenantId)
)
```

**Server/Client Separation:**
- Server-only: `lib/*-server.ts` with `'use server'` directive
- Client-side: Calls API routes via fetch()
- Admin SDK: Used only in API routes for Firebase Admin operations

**AI Streaming Architecture:**
```typescript
// Real-time AI feedback with 3-stage progress
const result = await streamText({
  model: openai('gpt-4o'),
  messages: [...],
  onFinish: async ({ usage }) => {
    await logTokenUsage(userId, usage.totalTokens, 'quote_generation')
  }
})
```

---

## Core Features

### 1. AI-Powered Quote Generation

**Deterministic Template System:**
- Real Righello templates: Website 180°/360°, Video Production, Communication Plans
- Pricing: €3,500-€6,170 base + €150-€170/month recurring
- 4-step Prompt Enrichment Dialog: Project Type → Sector → Details → Client Info
- Section-level AI regeneration (objectives, activities, sitemap, description)

**Quote State Machine (FSM):**
- 9 states: draft → sent → in_review → approved → pending_payment → in_progress → completed (+ rejected/expired)
- 8 validated transitions with role-based permissions
- Webhook-driven transitions for client approve/reject

**Dual Client Mode:**
- Platform clients: Registered with `clientId` → full Stripe automation
- External clients: Organic leads with email+name → manual payment flow
- Mutual exclusivity validation at schema/API/validation layers

### 2. Payment & Invoicing Automation

**Milestone Payment System:**
- Configurable deposit splits (typically 50% + milestone payments)
- Admin-controlled milestone readiness
- Client self-service payment via Stripe Checkout
- Webhook-driven completion tracking

**Automatic Invoice Generation:**
- PDF generation: RighelloInvoiceGenerator with corporate branding
- Email delivery: Nodemailer after every payment (deposit/milestone/full)
- Invoice numbering: `INV-{timestamp}-{quoteId}`
- HTML email templates with graceful SMTP fallback

**Stripe Subscription Management:**
- Monthly recurring billing for maintenance costs
- Auto-renewal with lifecycle webhook handlers (created/updated/deleted)
- Pause/resume/cancel functionality
- Invoice payment tracking for activation

### 3. Editorial Calendar & Content Generation

**Multi-View Calendar:**
- 3 viewing modes: Month grid, Week 7-day layout, Day 24-hour timeline
- 10 social platforms: Instagram, Facebook, LinkedIn, TikTok, X, YouTube, Blog, Pinterest, Threads, Altro
- Status-based color coding with platform badges
- "Da pianificare" section for unscheduled posts

**AI Content Generation:**
- **Caption Generation**: GPT-4o with tone/length/hashtag/CTA options
- **Visual Generation**: DALL-E 3 with automatic Instagram format compliance
- **Format Support**: Feed Grid 3:4, Feed Portrait 4:5, Reels/Stories 9:16
- **Asset Lifecycle**: DALL-E → Firebase Storage → Firestore persistence

### 4. Command Bar Intelligence

**AI-Powered Command Bar (`Cmd+K`):**
- Enhanced entity extraction: 12+ fields (tone, targetAudience, CTA, hashtags, visualStyle)
- 3-stage streaming feedback: analyzing 33% → parsing 66% → executing 100%
- Real-time reasoning visualization using AI SDK streamText
- Intent recognition for 30+ business workflows

**Supported Workflows:**
- CREATE_WEBSITE, CREATE_GRAPHIC_DESIGN, CREATE_VIDEO_PRODUCTION
- CREATE_SOFTWARE_DEV, CREATE_CAMPAIGN_PROJECT
- Multi-platform content creation and batch operations

### 5. Workspace & Project Management

**Mobile-First Kanban:**
- Responsive architecture: mobile 80vw snap scroll → desktop grid
- Component extraction: WorkspaceShell, ClientSidebar, KanbanBoard, KanbanColumn, TaskCard
- Individual column scroll with 60px+ touch targets
- Zero hydration errors via client-only Sheet rendering

**Workspace Intelligence:**
- Task completeness and dependency analysis using GPT-4
- Technical Architect Integration: Pre-execution AI dialog for complex tasks
- Phase decomposition with effort estimates and roadmap tree view

---

## API Endpoints

### AI Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/ai/caption` | POST | AI caption generation with tone/hashtags | Required |
| `/api/ai/chat` | POST | Streaming chat with GPT-4o | Required |
| `/api/ai/generate-image` | POST | DALL-E 3 image generation + Instagram resize | Required |
| `/api/ai/quote-generation` | POST | Template-based quote generation | Required |
| `/api/ai/quote-regenerate-section` | POST | Regenerate specific quote sections | Required |
| `/api/ai/task-breakdown` | POST | Task decomposition into phases | Required |
| `/api/ai/task-best-practices` | POST | Best practices for task types | Required |

### Authentication Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/auth/session` | GET | Verify user session | Cookie |
| `/api/auth/set-secure-token` | POST | Set HttpOnly auth cookie | Required |
| `/api/auth/logout` | POST | Clear auth cookies | None |
| `/api/auth/verify-token` | POST | Verify Firebase ID token | Required |

### Stripe Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/stripe/create-checkout` | POST | Create Stripe Checkout session | Required |
| `/api/stripe/create-subscription` | POST | Create Stripe Subscription | Required |
| `/api/stripe/webhook` | POST | Handle Stripe webhook events | Signature |
| `/api/stripe/connect/onboard` | POST | Stripe Connect onboarding | Required |
| `/api/stripe/payment-method/attach` | POST | Attach payment method to customer | Required |
| `/api/stripe/setup-intent/create` | POST | Create SetupIntent for saving cards | Required |

### Team & Admin Endpoints

| Endpoint | Method | Description | Auth |
|----------|--------|-------------|------|
| `/api/team/invite` | POST | Invite new team members | Admin |
| `/api/team/users/[id]` | GET/PATCH/DELETE | User profile management | Admin |
| `/api/send-welcome-email` | POST | Send welcome emails | Admin |
| `/api/admin/database-cleanup` | POST | Database cleanup operations | Admin |

---

## Security & Compliance

### Multi-Tenant Security

**Tenant Isolation Strategy:**
- All Firestore documents include `tenantId` field
- Server-side validation using Firebase Admin SDK
- Client-side queries filtered by authenticated user's `tenantId`
- API routes extract `tenantId` from verified Firebase token

**Example Security Pattern:**
```typescript
// API Route Security
const decodedToken = await verifyFirebaseToken(authToken)
const userData = await getUserData(decodedToken.uid)

// SECURITY: Only use server-verified userId and tenantId
const tenantId = userData.tenantId // Never trust client-sent tenantId

const quotesRef = collection(db, "quotes")
const quotesQuery = query(quotesRef, where("tenantId", "==", tenantId))
```

### Authentication & Authorization

**Firebase Auth + Custom Claims:**
- Google OAuth integration
- HttpOnly cookies for session management
- Role-based access control (admin, user, client)
- Token refresh with 1-hour expiry

**Role Permissions:**
- **Admin**: Full access to tenant data, team management, quote transitions
- **User**: Create/edit own content, view assigned clients
- **Client**: View own quotes, approve/reject, self-service payments

### Data Protection

**Encryption:**
- HTTPS/TLS for all connections
- Firebase encryption at rest
- Stripe PCI DSS Level 1 compliant

**Secure Token Generation:**
- Quote approval tokens: 256-bit base64url cryptographic randomness
- Shareable links with token-based access control

**Rate Limiting:**
- Upstash Redis-based rate limiting
- Configurable limits per endpoint type (AI, AUTH, API)
- Token bucket algorithm with sliding window

---

## Database Schema

### Core Collections

**users:**
```typescript
{
  id: string // Firebase UID
  tenantId: string // Multi-tenant isolation
  email: string
  firstName: string
  lastName: string
  role: "admin" | "user" | "client"
  companyName?: string
  plan: "30" | "180" | "360"
  aiTokensUsed: number
  aiTokensLimit: number
  stripeCustomerId?: string
  isSuspended: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**clients:**
```typescript
{
  id: string
  tenantId: string // Belongs to agency tenant
  clientTenantId?: string // If client is also a platform user
  name: string
  contactEmail: string
  contactPhone?: string
  address?: string
  industry?: string
  color: string // UI badge color
  stripeCustomerId?: string
  status: "active" | "inactive"
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**quotes:**
```typescript
{
  id: string
  tenantId: string
  title: string
  description: string
  clientId?: string // Platform client
  clientName: string // Platform or external
  clientEmail: string
  clientMode: "platform" | "external"
  status: "draft" | "sent" | "in_review" | "approved" | "pending_payment" | "in_progress" | "completed" | "rejected" | "expired"
  obiettivi: string[]
  attivita?: string[]
  voci: Array<{
    descrizione: string
    quantita: number
    prezzoUnitario: number
  }>
  total: number
  currency: "EUR" | "USD"
  depositPercentage?: number
  depositAmount?: number
  depositPaid?: boolean
  milestones?: Array<{
    id: string
    title: string
    amount: number
    dueDate?: Date
    paid: boolean
  }>
  terminiCondizioni?: string
  validUntil: Date
  approvalToken?: string // Secure 256-bit token
  stripeCheckoutSessionId?: string
  stripePaymentIntentId?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**editorialPosts:**
```typescript
{
  id: string
  tenantId: string
  clientId?: string
  title: string
  description?: string
  content: string
  platform: "instagram" | "facebook" | "linkedin" | "tiktok" | "x" | "youtube" | "blog" | "pinterest" | "threads" | "altro"
  postType: "post_singolo" | "carosello" | "video" | "reel" | "story"
  scheduledDate?: Timestamp
  scheduledTime?: string
  status: "bozza" | "programmato" | "pubblicato" | "archiviato"
  hashtags?: string[]
  mediaUrls?: string[]
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**tasks:**
```typescript
{
  id: string
  tenantId: string
  clientId: string | "tenant" // "tenant" for internal tasks
  title: string
  description?: string
  status: string // Column ID from Kanban
  columnId: string
  assignedUserId?: string
  priority?: "low" | "medium" | "high"
  dueDate?: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**aiUsage:**
```typescript
{
  id: string
  tenantId: string
  userId: string
  adminId: string // For token tracking
  feature: "caption" | "image_generation" | "quote_generation" | "chat" | "other"
  tokensUsed: number
  model?: string
  createdAt: Timestamp
}
```

---

## Design System

### Liquid Glass Design System

**Corporate Aesthetic (2025 Overhaul):**
- **Color Palette**: Slate 50-950 backbone (all icons/text/borders slate-based)
- **Brand Accent**: Righello pink (#D946A6) reserved exclusively for strategic CTAs
- **Shadows**: Corporate shadows with slate-based opacity layers
- **Transitions**: 100-200ms max transition timings

**Component Library:**
- **GlassCard**: Neutral variants (white/80 light, gray-800/80 dark, no gradients)
- **LiquidButton**: Opacity-only hover effects (0.9-0.95, no scale)
- **Borders**: 1px slate borders with subtle corporate shadows

**Motion System Attenuation:**
- Removed bounce/elastic easings
- Eliminated infinite animations (shimmer/glow/rotate)
- Opacity-only transitions (100-200ms)
- No filter effects (blur/brightness)
- Scale effects removed from all interactive states

**Accessibility:**
- AAA contrast ratios maintained
- Semantic HTML with proper ARIA labels
- Keyboard navigation support
- Screen reader compatible

---

## Business Model & Token Economy

### Pricing Model

**Quote Templates:**
- **Website 180°**: €3,500 base + €150/month
- **Website 360°**: €4,500 base + €170/month
- **Video Production**: €5,000 base + €0/month
- **Communication Plan**: €6,170 base + €0/month

**AI Token Economy:**
- Tiered subscription model with markup on API costs
- Usage tracking per feature (caption, image, quote, chat)
- Admin-level token aggregation for agency billing
- Cost transparency with real-time usage dashboards

### Revenue Streams

1. **Quote Generation & Management**: Platform fee on quotes
2. **Payment Processing**: Stripe Connect fees (platform cut)
3. **Subscription Services**: Recurring maintenance contracts
4. **AI Token Usage**: Markup on OpenAI API costs
5. **Storage & Assets**: Firebase Storage overage fees

---

## Development & Deployment

### Environment Variables

**Required Secrets:**
```bash
# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server)
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# OpenAI
OPENAI_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Upstash Redis (Rate Limiting)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Email (Nodemailer)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

### Installation & Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd optima

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Run development server
npm run dev

# 5. Open browser
# Navigate to http://localhost:3000
```

### Build & Production

```bash
# Build for production
npm run build

# Start production server
npm start

# Deploy to Vercel/Replit
# Configure environment variables in deployment platform
# Push to main branch for auto-deployment
```

### Deployment Configuration

**Next.js 15 Config:**
```javascript
// next.config.mjs
export default {
  serverExternalPackages: [
    'firebase-admin',
    '@google-cloud/firestore',
    '@react-pdf/renderer'
  ],
  experimental: {
    allowedDevOrigins: [process.env.NEXT_PUBLIC_REPLIT_DEV_DOMAIN]
  }
}
```

**Workflow (Replit):**
- Command: `npm run dev -- --hostname 0.0.0.0 --port 5000`
- Output Type: webview
- Wait for Port: 5000

---

## Project Structure

```
optima/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/                  # Authentication routes
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/             # Protected dashboard routes
│   │   ├── dashboard/           # Main dashboard
│   │   ├── preventivi/          # Quote management
│   │   │   ├── [id]/           # Quote detail & edit
│   │   │   └── page.tsx
│   │   ├── calendario-editoriale/ # Editorial calendar
│   │   ├── workspace/           # Kanban workspace
│   │   ├── team/               # Team management
│   │   └── settings/           # User settings
│   ├── api/                     # API Routes (serverless)
│   │   ├── ai/                 # AI endpoints
│   │   ├── auth/               # Auth endpoints
│   │   ├── stripe/             # Stripe endpoints
│   │   └── team/               # Team endpoints
│   └── layout.tsx              # Root layout
├── components/                  # React components
│   ├── ui/                     # UI primitives (Radix)
│   ├── quotes/                 # Quote components
│   ├── workspace/              # Workspace components
│   ├── ai/                     # AI components
│   └── layout/                 # Layout components
├── lib/                        # Utility libraries
│   ├── firebase.ts             # Firebase client config
│   ├── firebase-admin.ts       # Firebase Admin SDK
│   ├── ai/                     # AI services
│   │   ├── dalle-service.ts
│   │   ├── cost-calculator.ts
│   │   └── quote-templates/
│   ├── quote-service.ts        # Quote operations (client)
│   ├── quote-service-server.ts # Quote operations (server)
│   ├── stripe.service.ts       # Stripe integration
│   ├── token-service.ts        # AI token tracking
│   └── utils/                  # Utilities
├── hooks/                      # Custom React hooks
├── types/                      # TypeScript types
├── public/                     # Static assets
├── middleware.ts               # Next.js middleware
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.mjs
```

---

## Testing & Quality Assurance

### Current Test Coverage

**Manual QA Completed:**
- ✅ Quote generation flow (AI + manual)
- ✅ Payment checkout (Stripe integration)
- ✅ Multi-tenant isolation
- ✅ Mobile responsiveness (iOS/Android)
- ✅ Calendar multi-view experience
- ✅ Command Bar intelligence
- ✅ Image generation & Instagram formats

**Known Issues:**
- 4 LSP diagnostics in `ai-quote-generator.tsx` (non-blocking, TypeScript warnings)
- Dialog accessibility warnings (DialogTitle/Description) - cosmetic

### Performance Metrics

**Build Performance:**
- Compilation time: ~13-15s (2,291 modules)
- Bundle size: Optimized with dynamic imports
- Lazy loading: AI components (150KB reduction)

**Runtime Performance:**
- Page load: <3s (Lighthouse target: 90+)
- API response: ~500ms avg (AI: 2-5s streaming)
- Database queries: <100ms (Firestore indexed)

---

## Roadmap & Future Development

### In Progress
- [ ] Template settore functionality (quote templates by industry)
- [ ] Duplica esistente (duplicate quote feature)
- [ ] Sora 2 video generation integration
- [ ] Advanced analytics dashboard

### Planned Features
- [ ] Multi-language support (English, Spanish)
- [ ] Mobile native apps (React Native)
- [ ] Advanced RAG system for knowledge base
- [ ] CRM integration (HubSpot, Salesforce)
- [ ] White-label reseller program

### Technical Debt
- [ ] Migrate to Drizzle ORM for type-safe queries
- [ ] Implement comprehensive E2E testing (Playwright)
- [ ] Add Sentry for error tracking
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Create utility function for date normalization

---

## License & Ownership

**Proprietary Software** - All Rights Reserved

This codebase is proprietary and confidential. Unauthorized copying, distribution, or use of this software is strictly prohibited.

**Owner:** Righello  
**Contact:** info@righello.com  
**Due Diligence Contact:** For technical inquiries, please contact the development team.

---

## Support & Documentation

### Internal Documentation
- Technical architecture: `replit.md`
- Component library: Storybook (in development)
- API documentation: Postman collection (available on request)

### External Resources
- [Firebase Documentation](https://firebase.google.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [OpenAI API Reference](https://platform.openai.com/docs)

### Development Team
For technical questions or due diligence inquiries:
- **Architecture**: Review `replit.md` for detailed system design
- **Security**: Multi-tenant isolation patterns documented in codebase
- **Integrations**: API endpoint documentation above

---

**Last Updated:** 2025-10-09  
**Version:** 1.0.0 (Production MVP)  
**Platform Status:** ✅ Production Ready
