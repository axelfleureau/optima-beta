# Optima - Marketing Intelligence Platform

## Overview
Optima by Righello is a comprehensive Italian marketing intelligence platform that enables users to optimize campaigns with artificial intelligence and advanced analytics. The platform features multi-client management, AI-powered content generation, editorial calendar, automated quotes, and integrated billing.

## Project Architecture
- **Framework**: Next.js 15.2.4 with TypeScript
- **Styling**: Tailwind CSS with custom dark theme
- **UI Components**: Radix UI components with custom styling
- **Authentication**: Firebase Auth with Google integration
- **Database**: Firebase Firestore
- **AI Integration**: OpenAI GPT-4o with ai-sdk
- **State Management**: Redux Toolkit and Zustand
- **Development Port**: 5000 (configured for Replit environment)

## Key Features
- Marketing campaign management with advanced metrics
- Multi-client workspace management
- AI Assistant for content generation and strategy optimization
- Editorial calendar for social media planning
- Automated quote generation with Stripe integration
- Advanced analytics with customizable dashboards
- Multi-role support (Agency, Client, Super-admin)

## Recent Changes
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