# Stripe Integration Setup - Phase 1

This document provides comprehensive setup instructions for the Stripe payment integration in the quote acceptance system.

## 🔐 Environment Variables Setup

Add the following environment variables to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key (starts with sk_)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key (starts with pk_)
STRIPE_WEBHOOK_SECRET=whsec_... # Your webhook endpoint secret (starts with whsec_)

# Firebase Admin SDK Configuration (REQUIRED FOR SECURITY)
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000 # Your app's base URL (production: your domain)
```

## 🔑 Getting Stripe API Keys

### 1. Sign up for Stripe Account
1. Go to [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Create your Stripe account
3. Complete the account verification process

### 2. Get API Keys
1. Navigate to [https://dashboard.stripe.com/apikeys](https://dashboard.stripe.com/apikeys)
2. Copy your **Publishable key** (starts with `pk_`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
3. Click "Reveal live key" and copy your **Secret key** (starts with `sk_`) → `STRIPE_SECRET_KEY`

⚠️ **CRITICAL SECURITY**: Never expose the secret key on the client-side!

### 3. Setup Webhook Endpoint
1. Go to [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set endpoint URL: `https://your-domain.com/api/stripe/webhook` (or `https://your-replit-domain.repl.co/api/stripe/webhook`)
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Copy the **Signing secret** (starts with `whsec_`) → `STRIPE_WEBHOOK_SECRET`

## 🏗️ Architecture Overview

### Core Components Implemented

```
📁 Phase 1 Implementation
├── types/payment.ts                    # Payment type definitions
├── collections/payments.ts             # Firestore schema & operations
├── lib/services/stripe.service.ts      # Stripe SDK wrapper
├── app/api/stripe/create-checkout/     # Checkout session creation
├── app/api/stripe/webhook/             # Webhook event handling
└── STRIPE_SETUP.md                    # This setup guide
```

### Data Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Route
    participant S as Stripe Service
    participant FS as Firestore
    participant ST as Stripe

    C->>API: POST /api/stripe/create-checkout
    API->>FS: Validate quote & tenant
    API->>S: Create checkout session
    S->>ST: Create Stripe session
    ST-->>S: Return session URL
    S-->>API: Return checkout data
    API->>FS: Create payment record
    API-->>C: Return checkout URL
    
    Note over ST: Customer completes payment
    
    ST->>API: POST /api/stripe/webhook
    API->>S: Process webhook event
    S->>FS: Update payment status
    S->>FS: Update quote status to "accepted"
```

## 🔒 Security Features Implemented

### 1. Tenant Isolation
- All payment operations are scoped by `tenantId`
- Quotes can only be paid by users within the same tenant
- Payment records include tenant validation

### 2. Server-Side Validation
- Quote pricing validated server-side (prevents client manipulation)
- Quote expiration checked before payment creation
- Quote status validation (only `sent`/`pending` quotes are payable)

### 3. Webhook Security
- Stripe signature verification using `STRIPE_WEBHOOK_SECRET`
- Idempotent event processing to prevent duplicate handling
- Comprehensive error handling and retry logic

### 4. Firebase Authentication (CRITICAL SECURITY - UPDATED)

⚠️ **SECURITY ISSUE RESOLVED**: Previous implementation contained a critical security bypass that allowed any request with a Bearer token to be authenticated using mock user data. This has been **completely eliminated**.

#### ✅ Security Implementation (Current):
- **MANDATORY**: Real Firebase Admin SDK token verification for ALL payment operations
- **ZERO TOLERANCE**: No mock/fake authentication logic in any environment
- **SERVER-SIDE ONLY**: Token verification using `verifyFirebaseToken()` from `@/lib/firebase-admin`
- **TENANT ISOLATION**: User tenant validation using Firebase Admin SDK with real data
- **SUSPENSION CHECKS**: Server-side user validation with account status verification
- **DETAILED ERRORS**: Authentication failures return specific error codes for proper handling

#### ✅ Security Features Implemented:
1. **Real Token Verification**: Uses Firebase Admin SDK `verifyIdToken()` method
2. **Multi-Source Tokens**: Accepts tokens from Authorization header or secure cookies
3. **Server-Side User Lookup**: Retrieves real user data from Firestore using Admin SDK
4. **Tenant Validation**: Ensures user belongs to valid, existing tenant
5. **Account Status Checks**: Prevents suspended users from creating payments
6. **Error Categorization**: Returns specific error codes (AUTH_TOKEN_INVALID, USER_TENANT_NOT_FOUND)

#### Required Environment Variables:
```bash
# Firebase Admin SDK Service Account (MANDATORY)
FIREBASE_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

#### Authentication Flow (Secure):
1. **Client Request**: Sends Firebase ID token via `Authorization: Bearer <token>` or cookie
2. **Token Verification**: Server calls `verifyFirebaseToken(token)` using Admin SDK
3. **User Data Retrieval**: Server fetches user data using `adminDb.collection("users").doc(uid).get()`
4. **Account Validation**: Checks user is not suspended and has valid `tenantId`
5. **Tenant Verification**: Validates tenant exists using `adminDb.collection("tenants").doc(tenantId).get()`
6. **Quote Access Control**: Ensures quote belongs to authenticated user's tenant
7. **Payment Processing**: Proceeds only if all security checks pass

#### Error Handling:
- `401 AUTH_TOKEN_INVALID`: Invalid/expired Firebase token or missing authentication
- `404 USER_TENANT_NOT_FOUND`: User doesn't exist, is suspended, or has invalid tenant
- `404 Quote not found or access denied`: Quote doesn't belong to user's tenant

### 5. Data Protection
- Sensitive payment data never exposed to client
- Stripe customer IDs scoped by tenant
- Payment metadata includes security context

## 🗄️ Database Schema

### Firestore Collections

#### payments Collection
```typescript
{
  id: string                          // Document ID
  stripePaymentIntentId: string       // Stripe Payment Intent ID
  stripeCheckoutSessionId?: string    // Stripe Checkout Session ID
  quoteId: string                     // Associated quote
  tenantId: string                    // Tenant ownership (CRITICAL)
  clientEmail: string                 // Client email
  amount: number                      // Amount in cents
  currency: string                    // Currency code
  status: PaymentStatus               // Payment status
  createdAt: Date                     // Creation timestamp
  // ... additional fields
}
```

#### Required Firestore Indexes
Add to `firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "payments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

## 🧪 Testing the Integration

### 1. Test Checkout Creation
```bash
curl -X POST http://localhost:3000/api/stripe/create-checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -d '{
    "quoteId": "quote_123",
    "returnUrl": "http://localhost:3000/payment/result"
  }'
```

### 2. Test Webhook (Development)
Use Stripe CLI to forward webhooks:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### 3. Test Payment Flow
1. Create a test quote in the system
2. Use the checkout endpoint to create a payment session
3. Complete payment using Stripe test cards:
   - Success: `4242424242424242`
   - Decline: `4000000000000002`

## 🚨 Common Issues & Solutions

### 1. Webhook Signature Verification Failed
- **Cause**: Incorrect `STRIPE_WEBHOOK_SECRET`
- **Solution**: Copy the correct signing secret from Stripe dashboard

### 2. Quote Not Found or Access Denied
- **Cause**: Tenant mismatch or invalid quote ID
- **Solution**: Ensure quote belongs to the authenticated user's tenant

### 3. Payment Intent Creation Failed
- **Cause**: Invalid amount or currency
- **Solution**: Verify quote amount > 0 and currency is supported

### 4. Authentication Required Error
- **Cause**: Missing or invalid Firebase token
- **Solution**: Ensure proper authentication headers are sent

## 🔮 Next Steps (Phase 2)

The current implementation provides a solid foundation for:

1. **Quote Acceptance Portal**: Client-facing payment interface
2. **Payment Status Tracking**: Real-time payment status updates
3. **Admin Dashboard**: Payment management and reporting
4. **Email Notifications**: Payment confirmations and receipts
5. **Advanced Features**: Refunds, partial payments, subscriptions

## 📞 Support

For issues with this integration:
1. Check the browser console for client-side errors
2. Review server logs for API endpoint issues
3. Verify Stripe dashboard for payment status
4. Ensure all environment variables are correctly set

---

✅ **Phase 1 Complete**: Core Stripe integration is ready for quote payments!