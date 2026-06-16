import { env } from '@/utils/env'

const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verify a Cloudflare Turnstile token server-side.
 * If no secret is configured: allow in non-production (local dev without keys),
 * deny in production (fail closed).
 */
export async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return env.NODE_ENV !== 'production'
  if (!token) return false

  try {
    const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token })
    if (ip) form.set('remoteip', ip)
    const res = await fetch(SITEVERIFY, { method: 'POST', body: form })
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}
