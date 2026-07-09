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

/**
 * Resolve the same status the display label uses, but as the LABEL KEY —
 * for callers that need a semantic register (status pill tone) alongside the
 * localized label. Null when the raw status has no mapping (the label then
 * falls back to a humanized raw string).
 */
export function getOrderStatusLabelKey(order: {
  status?: string
  payment_status?: string
}): keyof OrderStatusLabels | null {
  const raw = (order.payment_status?.trim() || order.status || '').trim()
  if (!raw) return 'unknown'
  return PAYMENT_STATUS_LABEL_KEYS[raw.toLowerCase()] ?? null
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
  order: {
    status?: string
    payment_status?: string
  },
  labels: OrderStatusLabels = DEFAULT_ORDER_STATUS_LABELS
): string {
  const paymentStatus = order.payment_status?.trim()
  if (paymentStatus) {
    return humanizeStatus(paymentStatus, labels)
  }

  return humanizeStatus(order.status ?? '', labels)
}
