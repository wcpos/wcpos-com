/**
 * Owner allowlist for super-admin "view as" (read-only impersonation).
 *
 * Config-in-code on purpose (no env var): this is a solo-run service where the
 * flip mechanism is git, and the value fails loudly if wrong. Add owner emails
 * here. Empty ⇒ nobody is admin (fail closed).
 */
export const ADMIN_EMAILS: readonly string[] = ['paul@kilbot.com']

const NORMALIZED = new Set(ADMIN_EMAILS.map((e) => e.trim().toLowerCase()))

/** True only for an allowlisted email. Undefined/empty ⇒ false (fail closed). */
export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false
  return NORMALIZED.has(email.trim().toLowerCase())
}
