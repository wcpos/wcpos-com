import { env } from '@/utils/env'
import { resolveStoreEnvironmentName } from '@/lib/store-environment-name'
import { TEST_TURNSTILE_SECRET_KEY } from './turnstile-keys'

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

// The only hosts allowed to skip the bot check entirely (no widget is
// rendered there — local dev and the e2e suite). Anything else that resolves
// to 'dev' is an unrecognized host and must FAIL CLOSED: for payments an
// unknown host falling back to 'dev' is the safe direction, but for a bot
// check it would silently disable verification.
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

function isLocalHost(host: string | null | undefined): boolean {
  const raw = (host ?? '').trim().toLowerCase()
  // Host headers carry IPv6 literals in brackets ("[::1]:3000"); everything
  // else is hostname[:port].
  const hostname = raw.startsWith('[')
    ? raw.slice(1, raw.indexOf(']'))
    : raw.split(':')[0]
  return LOCAL_HOSTNAMES.has(hostname)
}

/**
 * Verify a Cloudflare Turnstile token server-side, with the secret resolved
 * by request host — mirroring resolveTurnstileSiteKey on the client:
 *
 * - live (wcpos.com): TURNSTILE_SECRET_KEY from the runtime env; if it is
 *   missing, fail closed — a live request must never skip the bot check.
 * - test (beta + Vercel previews): Cloudflare's committed always-pass demo
 *   secret, pairing the demo site key the client renders there.
 * - dev: only genuine local hosts (localhost/loopback, where no widget is
 *   rendered) are admitted untokened; any other unrecognized host fails
 *   closed rather than silently skipping the bot check.
 */
export async function verifyTurnstile(
  token: string,
  host: string | null | undefined,
  ip?: string
): Promise<boolean> {
  const environment = resolveStoreEnvironmentName(host)
  if (environment === 'dev') return isLocalHost(host)

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
