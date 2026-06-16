import { getLogger } from '@logtape/logtape'

// Pre-built loggers matching the hierarchy from the logging design.
// Each maps to a category like ["wcpos", "auth"] so parent sinks
// at ["wcpos"] automatically receive all child messages.

export const authLogger = getLogger(['wcpos', 'auth'])
export const apiLogger = getLogger(['wcpos', 'api'])
export const storeLogger = getLogger(['wcpos', 'store'])
export const licenseLogger = getLogger(['wcpos', 'license'])
export const infraLogger = getLogger(['wcpos', 'infra'])

// Sale-critical events (charged-but-no-order). Its own category so it can be
// alerted/filtered distinctly from ordinary store errors.
export const saleLogger = getLogger(['wcpos', 'store', 'sale'])

// Pro download delivery: audit trail (info) + delivery failures. Its own
// category so it can bypass the Discord rate limit — a paying customer unable
// to download is an alert that must never be throttled away.
export const downloadLogger = getLogger(['wcpos', 'license', 'download'])

// Re-export for custom categories
export { getLogger }
