/**
 * Quote Utilities
 * 
 * Shared utilities for quote operations including share token generation,
 * validation, and helper functions
 */

import { randomBytes } from 'crypto'

/**
 * Generate a secure URL-safe share token for public quote access
 * Uses 32 bytes (256 bits) of cryptographically secure random data
 * 
 * @returns Base64url encoded token (43 characters)
 */
export function generateShareToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Validate share token format
 * Ensures token matches expected base64url format (43 characters)
 * 
 * @param token - Token to validate
 * @returns true if valid format, false otherwise
 */
export function validateShareToken(token: string): boolean {
  if (!token) return false
  // Base64url tokens from 32 bytes are exactly 43 characters
  return /^[A-Za-z0-9_-]{43}$/.test(token)
}

/**
 * Validate email format
 * 
 * @param email - Email to validate
 * @returns true if valid email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Get base URL for application
 * Uses environment variable in production, localhost in development
 * 
 * @returns Base URL string
 */
export function getBaseUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'
  }
  // In Replit, use the Replit domain
  if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
    return `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
  }
  return 'http://localhost:3000'
}

/**
 * Format currency amount
 * 
 * @param amount - Amount to format
 * @param currency - Currency code (default EUR)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

/**
 * Check if quote is expired
 * 
 * @param validUntil - Quote expiration date
 * @returns true if expired
 */
export function isQuoteExpired(validUntil: Date): boolean {
  return new Date() > validUntil
}

/**
 * Check if quote status is payable
 * 
 * @param status - Quote status
 * @returns true if quote can be paid
 */
export function isQuotePayable(status: string): boolean {
  return ['sent', 'pending'].includes(status)
}
