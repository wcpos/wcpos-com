/**
 * Shared contract between the mock backend and the specs that drive it.
 * These literals ARE the interface — a drift between server.mjs and a spec
 * silently turns a failure-injection test into a happy-path test, so both
 * sides import from here.
 */

// Failure injections, keyed by the cart email's local-part prefix.
export const FAIL_SESSION_EMAIL_PREFIX = 'fail-session+'
export const ORDER_PENDING_EMAIL_PREFIX = 'order-pending+'
export const FAIL_COMPLETE_EMAIL_PREFIX = 'fail-complete+'

// The license every mock-completed order carries (resolvable via the
// Keygen fixtures, so /account/licenses can hydrate it).
export const PURCHASE_LICENSE_ID = 'lic-e2e-purchase'
export const PURCHASE_LICENSE_KEY = 'PURC-HASE-FLOW-7777'

// Password accepted for fixture personas by the mock emailpass login.
export const FIXTURE_PASSWORD = 'e2e-password'
