import { NextRequest, NextResponse } from 'next/server'
import { getQuoteById, updateQuoteSubscription } from '@/lib/quote-service'
import { createMaintenanceSubscription } from '@/lib/services/stripe-subscription.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id: quoteId } = params
  
  try {
    const body = await req.json()
    const { tenantId, customerId, customerEmail, customerName } = body
    
    // Validate required fields
    if (!tenantId || !customerId || !customerEmail || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, customerId, customerEmail, customerName' },
        { status: 400 }
      )
    }
    
    // Get quote
    const quote = await getQuoteById(quoteId, tenantId)
    
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }
    
    // Calculate monthly amount from annual management costs
    // The gestioneAnnuale field contains totalMonthly and totalAnnual
    const monthlyAmount = quote.gestioneAnnuale?.totalMonthly || 0
    
    if (monthlyAmount <= 0) {
      return NextResponse.json(
        { error: 'No maintenance costs defined in quote' },
        { status: 400 }
      )
    }
    
    // Create Stripe subscription
    const subscription = await createMaintenanceSubscription({
      quoteId,
      tenantId,
      customerId,
      monthlyAmount,
      customerEmail,
      customerName,
      quoteTitle: quote.titolo || quote.title || `Quote ${quoteId}`,
    })
    
    // Update quote with subscription info
    await updateQuoteSubscription(quoteId, tenantId, {
      monthlyAmount,
      stripeSubscriptionId: subscription.subscriptionId,
      stripePriceId: subscription.priceId,
      status: 'pending', // Will become 'active' after first payment
    })
    
    console.log('✅ Subscription created for quote:', quoteId)
    
    return NextResponse.json({
      success: true,
      clientSecret: subscription.clientSecret,
      subscriptionId: subscription.subscriptionId,
      monthlyAmount,
    })
  } catch (error) {
    console.error('❌ Error setting up subscription:', error)
    return NextResponse.json(
      { 
        error: 'Failed to set up subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
