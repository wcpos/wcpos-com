'use server'

import { createHash } from 'node:crypto'
import { redirect } from '@/i18n/navigation'
import { getSessionCustomer } from '@/lib/medusa-auth'
import { isAdmin } from '@/lib/admin'
import { findAdminCustomerByEmail } from '@/lib/discord/medusa-admin'
import { startImpersonation } from '@/lib/impersonation'
import { createRateLimiter } from '@/lib/rate-limit'
import { authLogger } from '@/lib/logger'

const limiter = createRateLimiter({
  prefix: 'impersonate-lookup',
  limit: 10,
  window: '10 m',
})

function redirectToAccount(locale: string): never {
  redirect({ href: '/account', locale })
  throw new Error('Redirect failed')
}

function auditHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}

export type StartImpersonationResult =
  | { error: 'forbidden' }
  | { error: 'not_found' }
  | { error: 'rate_limited' }

/**
 * Owner-only. Verifies the REAL session is an admin, rate-limits by IP (email
 * enumeration guard), looks up the target by email, then starts impersonation
 * and redirects to /account. Returns an error shape on failure (redirect throws
 * on success, so the happy path never returns).
 */
export async function startImpersonationAction(input: {
  email: string
  locale: string
}): Promise<StartImpersonationResult> {
  const session = await getSessionCustomer()
  if (!session?.email || !isAdmin(session.email)) {
    authLogger.warn`Non-admin impersonation attempt by ${session?.email ?? 'anon'}`
    return { error: 'forbidden' }
  }
  const adminEmail = session.email

  const rateLimitKey = adminEmail.trim().toLowerCase()
  const { success } = await limiter.consume(rateLimitKey)
  if (!success) return { error: 'rate_limited' }

  const email = input.email.trim().toLowerCase()
  const target = await findAdminCustomerByEmail(email)
  if (!target) {
    authLogger.info`Impersonation lookup miss: admin=${adminEmail} target_hash=${auditHash(email)}`
    return { error: 'not_found' }
  }

  authLogger.info`Impersonation START: admin=${adminEmail} target_id=${target.id}`
  await startImpersonation(target.id)
  redirectToAccount(input.locale)
}
