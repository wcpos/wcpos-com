import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import { env } from '@/utils/env'
import { authLogger } from '@/lib/logger'
import { MEDUSA_TOKEN_COOKIE } from '@/lib/medusa-cookie'
import { AccountExistsError } from '@/lib/api/errors'

// ============================================================================
// Types
// ============================================================================

export interface MedusaCustomer {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone?: string
  has_account: boolean
  created_at: string
  updated_at: string
  metadata?: Record<string, unknown>
}

export interface UpdateCustomerInput {
  email?: string
  first_name?: string
  last_name?: string
  phone?: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// Error helpers
// ============================================================================

/**
 * Extract a user-facing error message from a failed Medusa response.
 * Uses the JSON `message` field when present, otherwise the default.
 */
export async function parseMedusaError(
  response: Response,
  defaultMessage: string
): Promise<string> {
  const errorText = await response.text()
  let message = defaultMessage
  try {
    const parsed = JSON.parse(errorText)
    message = parsed.message || message
  } catch {
    // use default message
  }
  return message
}

// ============================================================================
// Constants
// ============================================================================

const COOKIE_NAME = MEDUSA_TOKEN_COOKIE

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24, // 1 day
}

// ============================================================================
// Cookie helpers
// ============================================================================

/**
 * Read the Medusa JWT from the session cookie
 */
export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  const cookie = cookieStore.get(COOKIE_NAME)
  return cookie?.value ?? null
}

/**
 * Set the Medusa JWT in an httpOnly session cookie
 */
export async function setAuthToken(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, COOKIE_OPTIONS)
}

/**
 * Delete the Medusa session cookie
 */
export async function clearAuthToken(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

// ============================================================================
// Auth endpoints (no publishable key needed)
// ============================================================================

/**
 * Log in with email and password.
 * POST /auth/customer/emailpass
 * Returns the JWT token on success, throws on failure.
 */
export async function login(
  email: string,
  password: string
): Promise<string> {
  const response = await fetch(
    `${env.MEDUSA_BACKEND_URL}/auth/customer/emailpass`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  )

  if (!response.ok) {
    throw new Error(await parseMedusaError(response, 'Login failed'))
  }

  const data = await response.json()
  return data.token
}

/**
 * Register a new customer (two-step process).
 * 1. POST /auth/customer/emailpass/register -> { token }
 * 2. POST /store/customers with Bearer token -> { customer }
 */
export async function register({
  email,
  password,
  firstName,
  lastName,
}: {
  email: string
  password: string
  firstName?: string
  lastName?: string
}): Promise<{ token: string; customer: MedusaCustomer }> {
  // Step 1: Register auth identity
  const authResponse = await fetch(
    `${env.MEDUSA_BACKEND_URL}/auth/customer/emailpass/register`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  )

  if (!authResponse.ok) {
    const message = await parseMedusaError(authResponse, 'Registration failed')
    // Classify the duplicate-account case here, at the Medusa adapter seam —
    // the same place license statuses are normalized once (CONTEXT.md). Medusa
    // returns "Identity with email already exists" / a duplicate message; a
    // typed AccountExistsError lets the route map it to 409 ACCOUNT_EXISTS
    // without re-sniffing provider strings.
    if (/already exists|duplicate/i.test(message)) {
      throw new AccountExistsError(message)
    }
    throw new Error(message)
  }

  const { token } = await authResponse.json()

  // Step 2: Create customer record with the token
  const customerResponse = await fetch(
    `${env.MEDUSA_BACKEND_URL}/store/customers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-publishable-api-key': env.MEDUSA_PUBLISHABLE_KEY || '',
      },
      body: JSON.stringify({
        email,
        ...(firstName && { first_name: firstName }),
        ...(lastName && { last_name: lastName }),
      }),
    }
  )

  if (!customerResponse.ok) {
    const message = await parseMedusaError(
      customerResponse,
      'Failed to create customer'
    )
    if (/already exists|duplicate/i.test(message)) {
      throw new AccountExistsError(message)
    }
    throw new Error(message)
  }

  const { customer } = await customerResponse.json()
  return { token, customer }
}

/**
 * Log out by clearing the session cookie.
 */
export async function logout(): Promise<void> {
  await clearAuthToken()
}

// ============================================================================
// Store endpoints (need both Bearer token AND publishable key)
// ============================================================================

/**
 * Get the current customer profile.
 * GET /store/customers/me
 * Returns null if no token or if the token is invalid.
 */
// Memoized per request with React `cache()`: the shared header, the account
// layout gate, and each account page all call getCustomer in one render, so
// without this they each issue an identical /store/customers/me fetch. cache()
// dedupes them to a single request. It stays dynamic (reads cookies via
// getAuthToken) — callers keep it inside Suspense, so PPR is unaffected; the
// null-on-failure result is safe to memoize within a request.
export const getCustomer = cache(
  async (): Promise<MedusaCustomer | null> => {
    const token = await getAuthToken()
    if (!token) return null

    try {
      const response = await fetch(
        `${env.MEDUSA_BACKEND_URL}/store/customers/me`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-publishable-api-key': env.MEDUSA_PUBLISHABLE_KEY || '',
          },
        }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      return data.customer
    } catch (error) {
      authLogger.error`Failed to get customer: ${error}`
      return null
    }
  }
)

/**
 * Update the current customer profile.
 * POST /store/customers/me
 * Returns null if unauthenticated.
 */
export async function updateCustomer(
  input: UpdateCustomerInput
): Promise<MedusaCustomer | null> {
  const token = await getAuthToken()
  if (!token) return null

  const response = await fetch(
    `${env.MEDUSA_BACKEND_URL}/store/customers/me`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-publishable-api-key': env.MEDUSA_PUBLISHABLE_KEY || '',
      },
      body: JSON.stringify(input),
    }
  )

  if (!response.ok) {
    throw new Error(await parseMedusaError(response, 'Failed to update customer'))
  }

  const data = await response.json()
  return data.customer
}

// OAuth sign-in (initiateOAuth / establishOAuthSession) lives in
// `@/lib/oauth`, which imports the shared `setAuthToken` and `parseMedusaError`
// from here. The link-then-refresh-then-persist ordering is owned by that
// module's `establishOAuthSession` rather than spread across a route handler.
