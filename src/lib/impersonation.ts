import 'server-only'

import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { getSessionCustomer } from '@/lib/medusa-auth'
import { isAdmin } from '@/lib/admin'

export const IMPERSONATION_COOKIE = 'wcpos-impersonate'
const ACCOUNT_REQUEST_HEADER = 'x-wcpos-account-request'

const IMPERSONATION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60, // 1 hour — inspection is a short, deliberate session
}

export interface Impersonation {
  adminEmail: string
  targetId: string
}

/** Thrown by a mutating route entered while impersonating. */
export class ViewOnlyError extends Error {
  constructor() {
    super('This action is disabled during read-only inspection.')
    this.name = 'ViewOnlyError'
  }
}

/**
 * Resolve the active impersonation, request-scoped. Returns a target ONLY when
 * all three hold: the account-request header is present (scopes to /account),
 * the impersonation cookie names a target, AND the REAL session customer is an
 * admin. Authority derives solely from the real-session admin check — never the
 * cookie. If a cookie is present but the session is not admin, the cookie is
 * cleared.
 */
export const getImpersonation = cache(
  async (): Promise<Impersonation | null> => {
    const headerStore = await headers()
    if (headerStore.get(ACCOUNT_REQUEST_HEADER) !== '1') return null

    const cookieStore = await cookies()
    const targetId = cookieStore.get(IMPERSONATION_COOKIE)?.value
    if (!targetId) return null

    const session = await getSessionCustomer()
    if (!isAdmin(session?.email)) {
      // A cookie with a non-admin session is inert; clear it defensively.
      try {
        cookieStore.delete(IMPERSONATION_COOKIE)
      } catch {
        // read-only cookie context (RSC) — ignore; it is inert regardless.
      }
      return null
    }

    return { adminEmail: session!.email, targetId }
  }
)

/** Throw if the current request is a read-only inspection. Call at the top of
 *  every mutating account entry point. */
export async function assertViewOnly(): Promise<void> {
  if (await getImpersonation()) throw new ViewOnlyError()
}

/** Begin inspecting a target customer (called from the admin action, which has
 *  already verified the caller is an admin). */
export async function startImpersonation(targetId: string): Promise<void> {
  const session = await getSessionCustomer()
  if (!isAdmin(session?.email)) throw new Error('Not authorized to impersonate')

  const cookieStore = await cookies()
  cookieStore.set(IMPERSONATION_COOKIE, targetId, IMPERSONATION_COOKIE_OPTIONS)
}

/** Stop inspecting. */
export async function stopImpersonation(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(IMPERSONATION_COOKIE)
}
