/**
 * Reads the server-owned bounce flag that the Resend webhook writes when a
 * transactional email to a customer permanently bounces (wcpos-medusa's
 * `lib/email-delivery-failure`).
 *
 * Read-only on this side by design: the flag is reserved metadata that the
 * store API refuses to accept from a client, and it is cleared by the backend
 * when the address actually changes. Nothing here should ever try to write it.
 */

/** Must match EMAIL_DELIVERY_FAILURE_KEY in wcpos-medusa. */
const EMAIL_DELIVERY_FAILURE_KEY = 'email_delivery_failure'

export interface EmailDeliveryFailure {
  /** The address that bounced. May differ from the current one mid-change. */
  email: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Returns the failure when the customer's address is known-undeliverable.
 *
 * Deliberately narrow: it projects only the bounced address, never the raw
 * metadata record. The banner needs nothing else, and the bounce reason and
 * template are operator detail that has no business in a page payload.
 */
export function readEmailDeliveryFailure(
  metadata: unknown
): EmailDeliveryFailure | null {
  if (!isRecord(metadata)) return null

  const failure = metadata[EMAIL_DELIVERY_FAILURE_KEY]
  if (!isRecord(failure) || failure.active !== true) return null

  return {
    email: typeof failure.email === 'string' ? failure.email : '',
  }
}
