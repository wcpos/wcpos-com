export type OrderStatusLabels = {
  actionRequired: string
  authorized: string
  canceled: string
  paid: string
  partiallyRefunded: string
  pending: string
  refunded: string
  unknown: string
}

export const DEFAULT_ORDER_STATUS_LABELS: OrderStatusLabels = {
  actionRequired: 'Action required',
  authorized: 'Authorized',
  canceled: 'Canceled',
  paid: 'Paid',
  partiallyRefunded: 'Partially refunded',
  pending: 'Pending',
  refunded: 'Refunded',
  unknown: 'Unknown',
}

const PAYMENT_STATUS_LABEL_KEYS: Record<string, keyof OrderStatusLabels> = {
  authorized: 'authorized',
  captured: 'paid',
  paid: 'paid',
  partially_refunded: 'partiallyRefunded',
  refunded: 'refunded',
  canceled: 'canceled',
  requires_action: 'actionRequired',
  awaiting: 'pending',
  not_paid: 'pending',
}

type OrderStatusInput = {
  status?: string
  payment_status?: string
  /** Order total. Zero means there was never anything to collect. */
  total?: number
}

function rawLabelKey(order: OrderStatusInput): keyof OrderStatusLabels | null {
  const raw = (order.payment_status?.trim() || order.status || '').trim()
  if (!raw) return 'unknown'
  return PAYMENT_STATUS_LABEL_KEYS[raw.toLowerCase()] ?? null
}

/**
 * A zero-total order is settled the moment it is placed — nothing is owed, so
 * it is paid.
 *
 * Medusa cannot say that itself: markPaymentCollectionAsPaid refuses a zero
 * capture ("Capture amount must be greater than 0"), so a complimentary or
 * fully-discounted order keeps payment_status "not_paid" forever. Left alone
 * it renders as "Pending" in the caution tone — telling the customer to expect
 * a payment that can never happen, on an order that is already complete.
 *
 * Only the pending case is reinterpreted. A zero-total order that was canceled
 * or refunded still reports that, because those say something true that "Paid"
 * would hide.
 *
 * Cancellation is checked against `order.status` directly, not just the
 * resolved key: `payment_status` wins that resolution, so a canceled order
 * carrying "not_paid" would otherwise come back as pending and be relabeled
 * "Paid" — the one reading worse than the bug this fixes. Migrated orders
 * express cancellation this way.
 */
function isZeroTotalSettled(order: OrderStatusInput): boolean {
  if (order.status?.trim().toLowerCase() === 'canceled') return false
  return order.total === 0 && rawLabelKey(order) === 'pending'
}

/**
 * Resolve the same status the display label uses, but as the LABEL KEY —
 * for callers that need a semantic register (status pill tone) alongside the
 * localized label. Null when the raw status has no mapping (the label then
 * falls back to a humanized raw string).
 */
export function getOrderStatusLabelKey(
  order: OrderStatusInput
): keyof OrderStatusLabels | null {
  return isZeroTotalSettled(order) ? 'paid' : rawLabelKey(order)
}

function humanizeStatus(status: string, labels: OrderStatusLabels): string {
  const trimmed = status.trim()
  if (!trimmed) return labels.unknown

  const normalized = trimmed.toLowerCase()
  const labelKey = PAYMENT_STATUS_LABEL_KEYS[normalized]
  if (labelKey) {
    return labels[labelKey]
  }

  return normalized
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function getOrderDisplayStatus(
  order: OrderStatusInput,
  labels: OrderStatusLabels = DEFAULT_ORDER_STATUS_LABELS
): string {
  if (isZeroTotalSettled(order)) return labels.paid

  const paymentStatus = order.payment_status?.trim()
  if (paymentStatus) {
    return humanizeStatus(paymentStatus, labels)
  }

  return humanizeStatus(order.status ?? '', labels)
}
