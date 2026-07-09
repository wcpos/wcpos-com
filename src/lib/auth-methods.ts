import 'server-only'

import {
  getMedusaBackendUrl,
  getMedusaPublishableKey,
} from '@/lib/store-environment'
import { getAuthToken } from '@/lib/medusa-auth'

/**
 * Customer auth-method management against the Medusa
 * /store/customers/me/auth-methods endpoints (wcpos-medusa#163): which
 * sign-in methods exist (DB truth, not metadata), minting an emailpass
 * identity so OAuth-only accounts can set a password, and disconnecting an
 * OAuth provider (the backend refuses to remove the last method).
 */

export interface AuthMethods {
  providers: string[]
  /**
   * The exact identifier the password-reset flow must use. Stored emails are
   * verbatim and reset-token lookup is exact-match, so requesting the reset
   * with `customer.email` can silently send nothing for case-variant
   * historical identities.
   */
  emailpassIdentifier: string | null
}

/** Message codes the Medusa endpoints surface (MedusaError messages). */
export type AuthMethodErrorCode =
  | 'email_identity_reserved'
  | 'last_sign_in_method'
  | 'provider_not_connected'
  | 'provider_not_disconnectable'
  | 'provider_not_creatable'

export class AuthMethodError extends Error {
  constructor(
    readonly code: AuthMethodErrorCode | 'request_failed',
    readonly status: number
  ) {
    super(code)
    this.name = 'AuthMethodError'
  }
}

const KNOWN_ERROR_CODES = new Set<AuthMethodErrorCode>([
  'email_identity_reserved',
  'last_sign_in_method',
  'provider_not_connected',
  'provider_not_disconnectable',
  'provider_not_creatable',
])

async function errorFrom(response: Response): Promise<AuthMethodError> {
  const body = (await response.json().catch(() => ({}))) as {
    message?: unknown
  }
  const message = typeof body.message === 'string' ? body.message : ''
  return new AuthMethodError(
    KNOWN_ERROR_CODES.has(message as AuthMethodErrorCode)
      ? (message as AuthMethodErrorCode)
      : 'request_failed',
    response.status
  )
}

async function authMethodsFetch(
  path: string,
  method: 'GET' | 'POST' | 'DELETE'
): Promise<Response | null> {
  const token = await getAuthToken()
  if (!token) return null

  return fetch(
    `${await getMedusaBackendUrl()}/store/customers/me/auth-methods${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'x-publishable-api-key': await getMedusaPublishableKey(),
      },
      cache: 'no-store',
    }
  )
}

function parseAuthMethods(body: {
  providers?: unknown
  emailpass_identifier?: unknown
}): AuthMethods {
  return {
    providers: Array.isArray(body.providers)
      ? body.providers.filter(
          (provider): provider is string => typeof provider === 'string'
        )
      : [],
    emailpassIdentifier:
      typeof body.emailpass_identifier === 'string'
        ? body.emailpass_identifier
        : null,
  }
}

/**
 * The customer's linked sign-in methods. Returns null when unavailable —
 * signed out, backend without the endpoint yet (404), or a fetch failure —
 * so callers degrade to the metadata-derived display instead of erroring.
 */
export async function getCustomerAuthMethods(): Promise<AuthMethods | null> {
  try {
    const response = await authMethodsFetch('', 'GET')
    if (!response || !response.ok) return null
    return parseAuthMethods(await response.json())
  } catch {
    return null
  }
}

/**
 * Idempotently mint an emailpass identity for the authenticated customer.
 * Returns null when the backend doesn't have the endpoint yet (404) so the
 * caller can fall back to a plain reset request.
 */
export async function ensureEmailpassAuthMethod(): Promise<
  (AuthMethods & { created: boolean }) | null
> {
  const response = await authMethodsFetch('/emailpass', 'POST')
  if (!response) throw new AuthMethodError('request_failed', 401)
  if (response.status === 404) return null
  if (!response.ok) throw await errorFrom(response)
  const body = (await response.json()) as { created?: unknown }
  return {
    created: body.created === true,
    ...parseAuthMethods(body as Record<string, unknown>),
  }
}

/** Disconnect an OAuth provider. Throws AuthMethodError with the backend's
 * guard codes (last_sign_in_method, provider_not_connected, …). */
export async function disconnectCustomerAuthMethod(
  provider: string
): Promise<{ providers: string[] }> {
  const response = await authMethodsFetch(
    `/${encodeURIComponent(provider)}`,
    'DELETE'
  )
  if (!response) throw new AuthMethodError('request_failed', 401)
  if (!response.ok) throw await errorFrom(response)
  const body = (await response.json()) as { providers?: unknown }
  return { providers: parseAuthMethods(body).providers }
}
