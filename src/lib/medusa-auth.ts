import 'server-only'

import { cookies } from 'next/headers'
import { env } from '@/utils/env'
import { authLogger } from '@/lib/logger'

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
}

export interface MedusaOrderItem {
  id: string
  title: string
  quantity: number
  unit_price: number
  total: number
  variant?: Record<string, unknown>
}

export interface MedusaOrder {
  id: string
  status: string
  display_id: number
  email: string
  currency_code: string
  total: number
  subtotal: number
  tax_total: number
  created_at: string
  updated_at: string
  items: MedusaOrderItem[]
  metadata?: Record<string, unknown>
}

// ============================================================================
// JWT helpers
// ============================================================================

export interface MedusaTokenPayload {
  actor_id: string
  actor_type: string
  auth_identity_id: string
  app_metadata: Record<string, unknown>
  user_metadata: Record<string, string>
}

/**
 * Decode a Medusa JWT and return the payload.
 * Handles URL-safe base64 encoding.
 */
export function decodeMedusaToken(token: string): MedusaTokenPayload {
  const base64 = token.split('.')[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const payload = JSON.parse(atob(base64))
  return {
    actor_id: payload.actor_id ?? '',
    actor_type: payload.actor_type ?? '',
    auth_identity_id: payload.auth_identity_id ?? '',
    app_metadata: payload.app_metadata ?? {},
    user_metadata: payload.user_metadata ?? {},
  }
}

// ============================================================================
// Constants
// ============================================================================

const COOKIE_NAME = 'medusa-token'

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
    const errorText = await response.text()
    let message = 'Login failed'
    try {
      const parsed = JSON.parse(errorText)
      message = parsed.message || message
    } catch {
      // use default message
    }
    throw new Error(message)
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
    const errorText = await authResponse.text()
    let message = 'Registration failed'
    try {
      const parsed = JSON.parse(errorText)
      message = parsed.message || message
    } catch {
      // use default message
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
    const errorText = await customerResponse.text()
    let message = 'Failed to create customer'
    try {
      const parsed = JSON.parse(errorText)
      message = parsed.message || message
    } catch {
      // use default message
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
export async function getCustomer(): Promise<MedusaCustomer | null> {
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
    const errorText = await response.text()
    let message = 'Failed to update customer'
    try {
      const parsed = JSON.parse(errorText)
      message = parsed.message || message
    } catch {
      // use default message
    }
    throw new Error(message)
  }

  const data = await response.json()
  return data.customer
}

/**
 * Get the current customer's orders.
 * GET /store/orders
 * Returns an empty array if no token or on failure.
 */
export async function getCustomerOrders(
  limit: number = 10
): Promise<MedusaOrder[]> {
  const token = await getAuthToken()
  if (!token) return []

  try {
    const response = await fetch(
      `${env.MEDUSA_BACKEND_URL}/store/orders?limit=${limit}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-publishable-api-key': env.MEDUSA_PUBLISHABLE_KEY || '',
        },
      }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return data.orders ?? []
  } catch (error) {
    authLogger.error`Failed to get orders: ${error}`
    return []
  }
}

// ============================================================================
// OAuth
// ============================================================================

/**
 * Initiate an OAuth login flow.
 * POST /auth/customer/{provider} with { callback_url }
 * Returns the redirect URL from the provider.
 */
export async function initiateOAuth(
  provider: string,
  callbackUrl: string
): Promise<string> {
  const response = await fetch(
    `${env.MEDUSA_BACKEND_URL}/auth/customer/${provider}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_url: callbackUrl }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    let message = 'Failed to initiate OAuth'
    try {
      const parsed = JSON.parse(errorText)
      message = parsed.message || message
    } catch {
      // use default message
    }
    throw new Error(message)
  }

  const data = await response.json()
  return data.location
}

/**
 * Complete an OAuth callback.
 * GET /auth/customer/{provider}/callback?code=...&state=...
 * Params must be sent as URL query parameters because Medusa's
 * auth providers only read `state` from req.query, not req.body.
 */
export async function completeOAuthCallback(
  provider: string,
  params: Record<string, string>
): Promise<string> {
  const queryString = new URLSearchParams(params).toString()
  const response = await fetch(
    `${env.MEDUSA_BACKEND_URL}/auth/customer/${provider}/callback?${queryString}`,
  )

  if (!response.ok) {
    const errorText = await response.text()
    let message = 'OAuth callback failed'
    try {
      const parsed = JSON.parse(errorText)
      message = parsed.message || message
    } catch {
      // use default message
    }
    throw new Error(message)
  }

  const data = await response.json()
  return data.token
}

/**
 * Link an OAuth auth identity to an existing or new customer.
 * The Medusa endpoint reads the email from the auth identity's
 * provider metadata (not from the request body) for security.
 * POST /store/auth/account-link
 */
export async function linkOrCreateCustomer(token: string): Promise<void> {
  const response = await fetch(
    `${env.MEDUSA_BACKEND_URL}/store/auth/account-link`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-publishable-api-key': env.MEDUSA_PUBLISHABLE_KEY || '',
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    let message = 'Account linking failed'
    try {
      const parsed = JSON.parse(errorText)
      message = parsed.message || message
    } catch {
      // use default message
    }
    throw new Error(message)
  }
}

// ============================================================================
// Token refresh
// ============================================================================

/**
 * Refresh an auth token.
 * POST /auth/token/refresh with Bearer token
 * Returns the new token.
 */
export async function refreshToken(token: string): Promise<string> {
  const response = await fetch(
    `${env.MEDUSA_BACKEND_URL}/auth/token/refresh`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    let message = 'Token refresh failed'
    try {
      const parsed = JSON.parse(errorText)
      message = parsed.message || message
    } catch {
      // use default message
    }
    throw new Error(message)
  }

  const data = await response.json()
  return data.token
}
