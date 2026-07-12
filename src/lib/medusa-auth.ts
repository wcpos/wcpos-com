import 'server-only'

import { cache } from 'react'
import { cookies } from 'next/headers'
import {
  getMedusaBackendUrl,
  getMedusaPublishableKey,
} from '@/lib/store-environment'
import { authLogger } from '@/lib/logger'
import { MEDUSA_TOKEN_COOKIE } from '@/lib/medusa-cookie'
import {
  AccountExistsError,
  AccountSecurityHoldError,
  InvalidCredentialsError,
  InvalidResetTokenError,
} from '@/lib/api/errors'
import { getImpersonation } from '@/lib/impersonation'
import { getAdminCustomerById } from '@/lib/discord/medusa-admin'
import {
  billingPatchHasAddressContent,
  pickDefaultBillingAddress,
  TAX_NUMBER_ADDRESS_METADATA_KEY,
  type BillingAddressPatch,
  type MedusaCustomerAddress,
} from '@/lib/billing-profile'
import { isCustomerSecurityHeld } from '@/lib/customer-security-hold'

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
  // GET/POST /store/customers/me include *addresses in the default fields.
  addresses?: MedusaCustomerAddress[]
}

// NOTE: `email` is deliberately absent — Medusa's store update-customer schema
// (POST /store/customers/me) rejects unknown fields, and email is not
// updatable there. Forwarding it fails every update with
// 400 "Unrecognized fields: 'email'".
export interface UpdateCustomerInput {
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
    `${await getMedusaBackendUrl()}/auth/customer/emailpass`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }
  )

  if (!response.ok) {
    const message = await parseMedusaError(response, 'Login failed')
    // Classify the routine wrong-credentials case at the adapter seam (same
    // pattern as AccountExistsError in register()) so callers can log it at
    // info instead of paging on every mistyped password.
    if (response.status === 401) {
      throw new InvalidCredentialsError(message)
    }
    throw new Error(message)
  }

  const data = await response.json()
  return data.token
}

/**
 * Request a password-reset email.
 * POST /auth/customer/emailpass/reset-password
 *
 * Medusa responds 201 whether or not the email has an account (no user
 * enumeration) and emits `auth.password_reset`; the backend's password-reset
 * subscriber turns that into the email linking to
 * `/reset-password?token=...&email=...` on this site.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch(
    `${await getMedusaBackendUrl()}/auth/customer/emailpass/reset-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: email }),
    }
  )

  if (!response.ok) {
    throw new Error(
      await parseMedusaError(response, 'Failed to request password reset')
    )
  }
}

/**
 * Set a new password using the token from the reset email.
 * POST /auth/customer/emailpass/update with the reset token as Bearer auth.
 *
 * Medusa rejects an expired/used/tampered token with 401, classified here as
 * InvalidResetTokenError (routine, logged at info by the route) — the same
 * adapter-seam pattern as InvalidCredentialsError in login().
 */
export async function resetPassword({
  email,
  token,
  password,
}: {
  email: string
  token: string
  password: string
}): Promise<void> {
  const response = await fetch(
    `${await getMedusaBackendUrl()}/auth/customer/emailpass/update`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ email, password }),
    }
  )

  if (!response.ok) {
    const message = await parseMedusaError(response, 'Failed to reset password')
    if (response.status === 401) {
      throw new InvalidResetTokenError()
    }
    throw new Error(message)
  }
}

/**
 * Register a new customer (three-step process).
 * 1. POST /auth/customer/emailpass/register -> { token }
 * 2. POST /store/customers with Bearer token -> { customer }
 * 3. POST /auth/customer/emailpass (login) -> fresh token
 *
 * Step 3 matters: the registration token was issued BEFORE the customer
 * existed, so its JWT has an empty actor_id and fails
 * `/store/customers/me` — the same refresh-after-linking invariant the
 * OAuth flow enforces (see establishOAuthSession). Persisting the step-1
 * token leaves the new customer with a dead session; checkout's inline
 * registration creates the cart immediately afterwards, so this must be
 * an actor token.
 */
export async function register({
  email,
  password,
  firstName,
  lastName,
  locale,
}: {
  email: string
  password: string
  firstName?: string
  lastName?: string
  locale?: string
}): Promise<{ token: string; customer: MedusaCustomer }> {
  // Step 1: Register auth identity
  const authResponse = await fetch(
    `${await getMedusaBackendUrl()}/auth/customer/emailpass/register`,
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
    `${await getMedusaBackendUrl()}/store/customers`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-publishable-api-key': await getMedusaPublishableKey(),
      },
      body: JSON.stringify({
        email,
        ...(firstName && { first_name: firstName }),
        ...(lastName && { last_name: lastName }),
        ...(locale && { metadata: { locale } }),
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

  // Step 3: exchange the registration token for an actor token. Without
  // this, /store/customers/me (and therefore every cart API) rejects the
  // brand-new session.
  try {
    const sessionToken = await login(email, password)
    return { token: sessionToken, customer }
  } catch {
    // The account exists at this point (steps 1–2 succeeded) — a transient
    // failure here must not read as "registration failed", or the customer
    // will retry registration and hit ACCOUNT_EXISTS confused.
    throw new Error(
      'Your account was created, but signing you in failed. Please sign in to continue.'
    )
  }
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
 * Resolve a customer from an explicit candidate token.
 *
 * Both the temporary metadata-based defense and the future authoritative
 * Medusa 403 response normalize to AccountSecurityHoldError.
 */
export async function getCustomerForToken(
  token: string
): Promise<MedusaCustomer | null> {
  const response = await fetch(
    `${await getMedusaBackendUrl()}/store/customers/me`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-publishable-api-key': await getMedusaPublishableKey(),
      },
    }
  )

  if (!response.ok) {
    if (response.status === 403) {
      const body = await response.json().catch(() => null)
      if (
        body &&
        typeof body === 'object' &&
        (body as { code?: unknown }).code === 'ACCOUNT_SECURITY_HOLD'
      ) {
        throw new AccountSecurityHoldError()
      }
    }
    return null
  }

  const data = await response.json()
  const customer = data.customer as MedusaCustomer | undefined
  if (!customer) return null
  if (isCustomerSecurityHeld(customer.metadata)) {
    throw new AccountSecurityHoldError()
  }
  return customer
}

/**
 * Require an accessible customer for a newly issued candidate token.
 */
export async function assertCustomerAccess(
  token: string
): Promise<MedusaCustomer> {
  const customer = await getCustomerForToken(token)
  if (!customer) {
    throw new Error('Authenticated customer could not be resolved')
  }
  return customer
}

/**
 * The REAL logged-in customer, resolved from the session cookie. This is the
 * acting identity — used for the admin gate, audit, and the "you are X" banner.
 * Not memoized itself; `getCustomer` (its default caller) is the cached seam.
 */
export async function getSessionCustomer(): Promise<MedusaCustomer | null> {
  const token = await getAuthToken()
  if (!token) return null

  try {
    return await getCustomerForToken(token)
  } catch (error) {
    if (error instanceof AccountSecurityHoldError) return null
    authLogger.error`Failed to get customer: ${error}`
    return null
  }
}

// Memoized per request with React `cache()`: the shared header, the account
// layout gate, and each account page all call getCustomer in one render. When
// inspecting (admin + account scope + cookie), it returns the TARGET customer
// via the admin API; otherwise the session customer. It stays dynamic (reads
// cookies via getAuthToken) and safely memoizes the null-on-failure result only
// within the request.
export const getCustomer = cache(
  async (): Promise<MedusaCustomer | null> => {
    const impersonation = await getImpersonation()
    if (impersonation) {
      return getAdminCustomerById(impersonation.targetId)
    }
    return getSessionCustomer()
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
    `${await getMedusaBackendUrl()}/store/customers/me`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-publishable-api-key': await getMedusaPublishableKey(),
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

/**
 * Upsert the customer's default billing address — the single source of truth
 * for billing details (see billing-profile.ts). Updates the customer's
 * default billing address, creating one only when the patch carries actual
 * address content (a country/name alone never mints a record). `tax_number`
 * is merged into the address metadata so a patch that omits it preserves the
 * saved registration.
 *
 * Callers pass the customer they already fetched this request — the store
 * address endpoints respond with the refetched parent customer (addresses
 * included), which is returned. Null means the write could not be attempted
 * (no session token); a no-op patch returns the customer unchanged.
 */
export async function upsertDefaultBillingAddress(
  customer: MedusaCustomer,
  patch: BillingAddressPatch
): Promise<MedusaCustomer | null> {
  const token = await getAuthToken()
  if (!token) return null

  const existing = pickDefaultBillingAddress(customer.addresses)
  if (!existing && !billingPatchHasAddressContent(patch)) return customer

  const { tax_number, ...addressFields } = patch

  const body: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(addressFields)) {
    if (value !== undefined) body[key] = value
  }
  if (tax_number !== undefined) {
    body.metadata = {
      ...(existing?.metadata ?? {}),
      [TAX_NUMBER_ADDRESS_METADATA_KEY]: tax_number,
    }
  }
  if (existing && Object.keys(body).length === 0) return customer
  if (!existing) {
    // Seed names so the record reads sensibly in Medusa admin even when the
    // caller (the profile form) doesn't submit them.
    body.first_name ??= customer.first_name ?? ''
    body.last_name ??= customer.last_name ?? ''
  }
  body.is_default_billing = true

  const path = existing
    ? `/store/customers/me/addresses/${existing.id}`
    : '/store/customers/me/addresses'
  const response = await fetch(`${await getMedusaBackendUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-publishable-api-key': await getMedusaPublishableKey(),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(
      await parseMedusaError(response, 'Failed to update billing address')
    )
  }

  const data = await response.json()
  return data.customer
}

// OAuth sign-in (initiateOAuth / establishOAuthSession) lives in
// `@/lib/oauth`, which imports the shared `setAuthToken` and `parseMedusaError`
// from here. The link-then-refresh-then-persist ordering is owned by that
// module's `establishOAuthSession` rather than spread across a route handler.
