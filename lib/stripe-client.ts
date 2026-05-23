import Stripe from "stripe"

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY

  if (!secretKey) {
    throw new Error("Missing required environment variable: STRIPE_SECRET_KEY")
  }

  stripeClient ??= new Stripe(secretKey, {
    apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
    typescript: true,
    telemetry: false,
    maxNetworkRetries: 3,
    timeout: 10000,
  })

  return stripeClient
}
