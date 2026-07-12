/**
 * Return whether customer metadata contains an active server-owned security
 * hold. Malformed or legacy-shaped metadata is never treated as a hold.
 */
export function isCustomerSecurityHeld(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false
  }

  const hold = (metadata as Record<string, unknown>).security_hold
  return Boolean(
    hold &&
      typeof hold === 'object' &&
      !Array.isArray(hold) &&
      (hold as Record<string, unknown>).active === true
  )
}
