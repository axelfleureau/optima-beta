# Optima - Marketing Intelligence Platform

## Overview
Optima is an AI Operations Platform (evolved from marketing intelligence SaaS) for international service businesses, featuring autonomous AI agents with conversational Command Bar interface, multi-tenant architecture, automated quote-to-payment workflows with Stripe, and content generation via DALL-E/Sora 2. The platform targets agencies and SMEs globally with a disruptive glassmorphic/liquid glass design aesthetic.

## Project Architecture
- **Framework**: Next.js 15.2.4 with TypeScript
- **Styling**: Tailwind CSS with Liquid Glass Design System
- **UI Components**: Custom glassmorphic components (GlassCard, GlassButton, GlassInput) with Radix UI primitives
- **Animations**: Framer Motion with liquid transitions and microinteractions
- **Authentication**: Firebase Auth with Google integration
- **Database**: Firebase Firestore with multi-tenant isolation
- **AI Integration**: OpenAI GPT-4 with ai-sdk for NLP intent recognition
- **State Management**: Redux Toolkit and Zustand (Command Bar, UI state)
- **Design System**: Glassmorphism with purple/pink/blue gradients, backdrop blur, liquid animations
- **Development Port**: 5000 (configured for Replit environment)

## Core Differentiators
- **AI Command Bar**: Conversational interface with GPT-4 NLP for multi-step campaign orchestration (Cmd+K)
- **Liquid Glass Design**: Glassmorphic aesthetic inspired by Linear, Vercel, Framer, Apple Vision OS
- **Autonomous Agents**: Content Agent (DALL-E), Video Agent (Sora 2), Task Orchestrator
- **Token Economy**: 3x markup on API costs with tiered packages (Starter/Growth/Enterprise)
- **Smart Automation**: Quote-to-payment workflows with intelligent team assignment

## Recent Changes
- **2025-10-05**: AI Platform Transformation - Liquid Glass Design System + Command Bar + DALL-E Content Agent
  - ✅ **Liquid Glass Design System**: Complete glassmorphic component library production-ready
    - GlassCard, GlassButton, GlassInput components with backdrop blur, gradient borders, multi-shadow depth
    - Animation library: liquidExpand, liquidMorph, glowPulse, fluidSlide, particleBurst, shimmer
    - Gradient system: purple/pink/blue AI theme, status gradients, animated mesh backgrounds
    - Tailwind config enhanced: glass shadows, glow utilities, liquid timings, custom keyframes
    - Demo page at /design-preview for visual testing
  - ✅ **AI Command Bar**: Conversational interface with GPT-4 NLP (core differentiator)
    - Cmd+K / Ctrl+K keyboard shortcut for instant access across all pages
    - NLP intent recognition: 11 supported intents (CREATE_TASK, SEARCH_TASK, ASSIGN_TASK, etc.)
    - Context gathering: dynamic form for missing parameters with auto-complete
    - Search results persistence: dialog stays open for non-terminal intents
    - Integration: useWorkspaceData, useClients, useUsers hooks for context-aware operations
    - Zustand store for global state management
    - Tenant isolation: all operations respect tenantId for multi-tenant security
  - ✅ **DALL-E 3 Content Agent**: Autonomous image generation with enterprise-grade security (core differentiator)
    - Platform-specific generation: Instagram (1024x1024), Facebook (1792x1024), LinkedIn (1024x1024)
    - Quality options: Standard (15 tokens) or HD (30 tokens) with 3x markup cost transparency
    - Server-side authentication: Firebase Admin SDK token verification, zero client trust
    - Tenant isolation: Server-derived tenantId/adminId, security audit logging for spoof attempts
    - Token tracking: Firestore ai_usage collection with accurate per-tenant attribution
    - Glassmorphic dialog: GlassCard UI with liquid animations (liquidExpand, particleBurst, shimmer)
    - Real-time cost estimation before generation (pre-transparency)
    - Image preview with download and regenerate options
    - Integration: Floating button dashboard + Command Bar suggestions
  - 🔧 **Dependencies Added**: framer-motion for liquid animations
  - 🔐 **Security**: Server-side auth pattern implemented for all AI endpoints (Firebase token verification)
  - 🎯 Architect-reviewed: All three features pass with zero regressions, production-ready

- **2025-09-29**: Critical performance and UX improvements implemented
  - ✅ **Sidebar Desktop**: Fixed collapsible behavior to show icons instead of disappearing completely
  - ✅ **AI Quote Dialog**: Enhanced scroll area from 60vh to calc(90vh-120px) for better mobile experience
  - ✅ **Quote Creation Buttons**: Added functional click handlers to dropdown menu items
  - ✅ **Login Performance**: Parallelized auth operations reducing login time from 3+ seconds to <1 second
  - ⚡ Authentication flow optimized with Promise.allSettled and reduced timeout (3s)
  - 🎯 All fixes architect-reviewed and approved with no regressions introduced

- **2025-09-27**: Project imported and configured for Replit environment
  - Installed all dependencies and resolved TypeScript errors
  - Configured Next.js for Replit proxy environment with proper host allowance
  - Set up development workflow on port 5000 with proper binding
  - Fixed Next.js 15 configuration warnings
  - Configured autoscale deployment with build and run commands
  - Verified application functionality including login system

## Environment Setup
- **Dependencies**: All npm packages installed successfully
- **Development Server**: Configured to run on 0.0.0.0:5000 for Replit compatibility
- **Deployment**: Configured for autoscale deployment target
- **Firebase**: Pre-configured with production Firebase project
- **OpenAI API**: Environment variable available for AI features

## Project Structure
```
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Main dashboard routes
│   ├── (marketing)/       # Landing page
│   └── api/               # API routes
├── components/            # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries and services
├── public/                # Static assets
└── styles/                # Global styles
```

## User Preferences
- Language: Italian (UI and content)
- Theme: Dark mode with pink accent colors
- Brand: Righello company branding

## Notes
- Application successfully running in development mode
- Firebase configuration is production-ready
- All major routes tested and functional
- Ready for deployment when needed