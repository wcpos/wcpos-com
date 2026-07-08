import { env } from '@/utils/env'
import { resolveStoreEnvironmentName } from '@/lib/store-environment-name'
import { TEST_TURNSTILE_SECRET_KEY } from './turnstile-keys'

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verify a Cloudflare Turnstile token server-side, with the secret resolved
 * by request host — mirroring resolveTurnstileSiteKey on the client:
 *
 * - live (wcpos.com): TURNSTILE_SECRET_KEY from the runtime env; if it is
 *   missing, fail closed — a live request must never skip the bot check.
 * - test (beta + Vercel previews): Cloudflare's committed always-pass demo
 *   secret, pairing the demo site key the client renders there.
 * - dev (localhost, e2e): no widget is rendered client-side, so untokened
 *   requests are admitted — the gateway's own rate caps still apply.
 */
export async function verifyTurnstile(
  token: string,
  host: string | null | undefined,
  ip?: string
): Promise<boolean> {
  const environment = resolveStoreEnvironmentName(host)
  if (environment === 'dev') return true

  const secret =
    environment === 'live' ? env.TURNSTILE_SECRET_KEY : TEST_TURNSTILE_SECRET_KEY
  if (!secret || !token) return false

  try {
    const form = new URLSearchParams({ secret, response: token })
    if (ip) form.set('remoteip', ip)
    const res = await fetch(SITEVERIFY, { method: 'POST', body: form })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}
