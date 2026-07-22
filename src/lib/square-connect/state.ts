import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Square permits a single registered redirect URL per application, so this
 * service receives every merchant's authorization callback and forwards it on
 * to the site that started the flow.
 *
 * The destination is carried in the OAuth `state` parameter and signed here.
 * Signing rather than storing keeps the service stateless, and — the point that
 * matters — means a caller cannot craft a state that redirects a live
 * authorization code to a site of their choosing.
 *
 * This service never sees a token. The PKCE code verifier stays on the
 * merchant's site, so an authorization code passing through here cannot be
 * exchanged by this service or by anyone observing it.
 */

const STATE_TTL_MS = 15 * 60 * 1000

export type SquareEnvironment = 'sandbox' | 'production'

export interface ConnectState {
  callbackUrl: string
  environment: SquareEnvironment
  issuedAt: number
}

function base64url(input: Buffer): string {
  return input.toString('base64url')
}

function sign(payload: string, secret: string): string {
  return base64url(createHmac('sha256', secret).update(payload).digest())
}

/** Encode and sign the state carried through the Square authorization round trip. */
export function encodeState(state: ConnectState, secret: string): string {
  const payload = base64url(Buffer.from(JSON.stringify(state), 'utf8'))
  return `${payload}.${sign(payload, secret)}`
}

/**
 * Verify and decode a state value, or return null when it cannot be trusted.
 *
 * Returns null rather than throwing so a caller cannot distinguish a forged
 * signature from a malformed payload by how the failure surfaces.
 */
export function decodeState(value: string, secret: string, now: number): ConnectState | null {
  const parts = value.split('.')
  if (parts.length !== 2) return null

  const [payload, signature] = parts
  const given = Buffer.from(signature)
  const want = Buffer.from(sign(payload, secret))
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null
  const candidate = parsed as Partial<ConnectState>

  if (typeof candidate.callbackUrl !== 'string') return null
  if (candidate.environment !== 'sandbox' && candidate.environment !== 'production') return null
  if (typeof candidate.issuedAt !== 'number') return null
  if (now - candidate.issuedAt > STATE_TTL_MS) return null
  if (candidate.issuedAt > now + 60_000) return null

  return {
    callbackUrl: candidate.callbackUrl,
    environment: candidate.environment,
    issuedAt: candidate.issuedAt,
  }
}

/**
 * Whether a merchant-supplied callback URL is safe to forward a response to.
 *
 * This is the open-redirect boundary of the whole flow: https only, no
 * credentials, no fragment, and nothing that could aim a redirect at
 * infrastructure sitting behind this service.
 */
export function isAcceptableCallback(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }

  if (url.protocol !== 'https:') return false
  if (url.username !== '' || url.password !== '') return false
  if (url.hash !== '') return false
  if (url.port !== '' && url.port !== '443') return false

  const host = url.hostname.toLowerCase().replace(/\.$/, '')

  // Only public DNS names. An IP literal would let a caller point the redirect
  // at internal infrastructure.
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) return false
  if (host.startsWith('[')) return false
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false
  if (!host.includes('.')) return false

  return true
}

/** Base URL of Square's authorization page for an environment. */
export function authorizeBaseUrl(environment: SquareEnvironment): string {
  return environment === 'production'
    ? 'https://connect.squareup.com/oauth2/authorize'
    : 'https://connect.squareupsandbox.com/oauth2/authorize'
}

/** Permissions this plugin requests. Nothing here touches catalog, customers, or payouts. */
export const SQUARE_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'PAYMENTS_READ',
  'PAYMENTS_WRITE',
  'DEVICES_READ',
  'DEVICE_CREDENTIAL_MANAGEMENT',
] as const
