import type { OrderStatusLabels } from './order-status'

export type OrderStatusTone = 'positive' | 'caution' | 'critical' | 'neutral'

/**
 * Order-status → visual tone, the order-side sibling of
 * license-status-presentation. Purely presentational: web maps this through
 * StatusBadge. A refund/cancel is a completed, unexceptional state (neutral),
 * not an error; only in-flight states warrant caution.
 */
const TONES: Record<keyof OrderStatusLabels, OrderStatusTone> = {
  paid: 'positive',
  authorized: 'positive',
  pending: 'caution',
  actionRequired: 'caution',
  partiallyRefunded: 'caution',
  refunded: 'neutral',
  canceled: 'neutral',
  unknown: 'neutral',
}

export function presentOrderStatus(
  statusKey: keyof OrderStatusLabels | null
): OrderStatusTone {
  return statusKey ? TONES[statusKey] : 'neutral'
}
