'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionCustomer } from '@/lib/medusa-auth'
import { isAdmin } from '@/lib/admin'
import { findAdminCustomerByEmail } from '@/lib/discord/medusa-admin'
import { startImpersonation } from '@/lib/impersonation'
import { createRateLimiter, clientIp } from '@/lib/rate-limit'
import { authLogger } from '@/lib/logger'

const limiter = createRateLimiter({
  prefix: 'impersonate-lookup',
  limit: 10,
  window: '10 m',
})

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
}): Promise<StartImpersonationResult> {
  const session = await getSessionCustomer()
  if (!isAdmin(session?.email)) {
    authLogger.warn`Non-admin impersonation attempt by ${session?.email ?? 'anon'}`
    return { error: 'forbidden' }
  }

  const ip = clientIp(new Request('http://local', { headers: await headers() }))
  const { success } = await limiter.consume(ip)
  if (!success) return { error: 'rate_limited' }

  const email = input.email.trim().toLowerCase()
  const target = await findAdminCustomerByEmail(email)
  if (!target) {
    authLogger.info`Impersonation lookup miss: admin=${session!.email} target=${email}`
    return { error: 'not_found' }
  }

  authLogger.info`Impersonation START: admin=${session!.email} target=${target.email} (${target.id})`
  await startImpersonation(target.id)
  redirect('/account')
}
