import 'server-only'

import { notFound } from 'next/navigation'
import { env } from '@/utils/env'
import { getCustomer, type MedusaCustomer } from '@/lib/medusa-auth'

/**
 * Admin access control.
 *
 * Access is granted via a server-side allowlist: the ADMIN_EMAILS env var
 * holds a comma-separated, case-insensitive list of customer emails.
 * Unset or empty means nobody is admin (fail closed).
 *
 * Non-admins get a 404 (notFound / 404 JSON), never a 401/403 redirect,
 * so the admin area's existence is not advertised.
 */

function getAllowedEmails(): Set<string> {
  const raw = env.ADMIN_EMAILS ?? ''
  return new Set(
    raw
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0)
  )
}

/**
 * Returns true when the current session belongs to an allowlisted admin.
 * Safe for API routes: never throws, never redirects.
 */
export async function isAdmin(): Promise<boolean> {
  const allowed = getAllowedEmails()
  if (allowed.size === 0) return false

  const customer = await getCustomer()
  if (!customer?.email) return false

  return allowed.has(customer.email.toLowerCase())
}

/**
 * Page guard: returns the admin customer, or renders the 404 page.
 * Call at the top of every admin layout AND page — never trust the client.
 */
export async function requireAdmin(): Promise<MedusaCustomer> {
  const allowed = getAllowedEmails()
  if (allowed.size === 0) notFound()

  const customer = await getCustomer()
  if (!customer?.email || !allowed.has(customer.email.toLowerCase())) {
    notFound()
  }

  return customer
}
