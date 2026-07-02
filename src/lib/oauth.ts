import 'server-only'

import {
  getMedusaBackendUrl,
  getMedusaPublishableKey,
} from '@/lib/store-environment'
import { parseMedusaError, setAuthToken } from '@/lib/medusa-auth'

// ============================================================================
// OAuth sign-in
//
// This module owns the whole "sign a customer in with an OAuth provider" flow
// for google / github / discord (the generic `/api/auth/[provider]` plumbing —
// see docs/adr/0006-discord-first-class-sign-in.md). The ordering rule that
// establishes a session — link a brand-new identity, THEN refresh so the new
// actor_id lands in the JWT, THEN persist only the refreshed token — used to
// live as caller discipline in the callback route. It now lives behind
// `establishOAuthSession`, where no caller can run the steps out of order.
//
// This is sign-in only. The Discord *connection* used for the Pro role
// (docs/adr/0004, 0007) is a separate flow at /api/discord/callback and is not
// handled here.
// ============================================================================

// ============================================================================
// JWT
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
function decodeMedusaToken(token: string): MedusaTokenPayload {
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
// Medusa OAuth endpoints (private — only `establishOAuthSession` /
// `initiateOAuth` may call these, and only in the right order)
// ============================================================================

/**
 * Complete an OAuth callback.
 * GET /auth/customer/{provider}/callback?code=...&state=...
 * Params must be sent as URL query parameters because Medusa's
 * auth providers only read `state` from req.query, not req.body.
 */
async function completeOAuthCallback(
  provider: string,
  params: Record<string, string>
): Promise<string> {
  const queryString = new URLSearchParams(params).toString()
  const response = await fetch(
    `${await getMedusaBackendUrl()}/auth/customer/${provider}/callback?${queryString}`,
  )

  if (!response.ok) {
    throw new Error(await parseMedusaError(response, 'OAuth callback failed'))
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
async function linkOrCreateCustomer(token: string): Promise<void> {
  const response = await fetch(
    `${await getMedusaBackendUrl()}/store/auth/account-link`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-publishable-api-key': await getMedusaPublishableKey(),
      },
    }
  )

  if (!response.ok) {
    throw new Error(await parseMedusaError(response, 'Account linking failed'))
  }
}

/**
 * Refresh an auth token.
 * POST /auth/token/refresh with Bearer token
 * Returns the new token.
 */
async function refreshToken(token: string): Promise<string> {
  const response = await fetch(
    `${await getMedusaBackendUrl()}/auth/token/refresh`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!response.ok) {
    throw new Error(await parseMedusaError(response, 'Token refresh failed'))
  }

  const data = await response.json()
  return data.token
}

// ============================================================================
// Public interface
// ============================================================================

/**
 * Initiate an OAuth login flow.
 * POST /auth/customer/{provider} with { callback_url }
 * Returns the provider authorization URL to redirect the browser to.
 */
export async function initiateOAuth(
  provider: string,
  callbackUrl: string
): Promise<string> {
  const response = await fetch(
    `${await getMedusaBackendUrl()}/auth/customer/${provider}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_url: callbackUrl }),
    }
  )

  if (!response.ok) {
    throw new Error(await parseMedusaError(response, 'Failed to initiate OAuth'))
  }

  const data = await response.json()
  return data.location
}

export interface OAuthSession {
  /** Decoded payload of the persisted session token (actor_id, user_metadata). */
  payload: MedusaTokenPayload
  /** True when this sign-in linked/created a customer (vs. an already-linked one). */
  linked: boolean
}

/**
 * Establish a customer session from an OAuth callback and persist it in the
 * session cookie. Returns the decoded final token so the caller can drive
 * follow-up work (profile sync, redirect) without re-decoding.
 *
 * This function owns the ordering invariant that the callback route used to
 * carry by hand: Medusa mints a token with an empty `actor_id` when the OAuth
 * identity is not yet bound to a customer, so a brand-new identity must be
 * linked, THEN the token refreshed so the new `actor_id` lands in the JWT, and
 * only the refreshed token persisted. An already-linked identity is persisted
 * as-is. The cookie is written here, after the (conditional) refresh, so a
 * link or refresh failure throws before any session is persisted — the caller
 * never sees a partial session.
 */
export async function establishOAuthSession(
  provider: string,
  params: Record<string, string>
): Promise<OAuthSession> {
  const initialToken = await completeOAuthCallback(provider, params)
  const linked = !decodeMedusaToken(initialToken).actor_id

  let token = initialToken
  if (linked) {
    // No customer linked yet — link to existing or create new, then refresh
    // so the freshly-assigned actor_id is present in the persisted token.
    await linkOrCreateCustomer(initialToken)
    token = await refreshToken(initialToken)
  }
  await setAuthToken(token)

  return { payload: decodeMedusaToken(token), linked }
}
