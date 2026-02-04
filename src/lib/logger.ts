import { getLogger } from '@logtape/logtape'

// Pre-built loggers matching the hierarchy from the logging design.
// Each maps to a category like ["wcpos", "auth"] so parent sinks
// at ["wcpos"] automatically receive all child messages.

export const authLogger = getLogger(['wcpos', 'auth'])
export const apiLogger = getLogger(['wcpos', 'api'])
export const storeLogger = getLogger(['wcpos', 'store'])
export const licenseLogger = getLogger(['wcpos', 'license'])
export const infraLogger = getLogger(['wcpos', 'infra'])

// Re-export for custom categories
export { getLogger }
