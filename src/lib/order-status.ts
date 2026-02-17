const PAYMENT_STATUS_LABELS: Record<string, string> = {
  authorized: 'Authorized',
  captured: 'Paid',
  paid: 'Paid',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
  canceled: 'Canceled',
  requires_action: 'Action required',
  awaiting: 'Pending',
  not_paid: 'Pending',
}

function humanizeStatus(status: string): string {
  const trimmed = status.trim()
  if (!trimmed) return 'Unknown'

  const normalized = trimmed.toLowerCase()
  if (PAYMENT_STATUS_LABELS[normalized]) {
    return PAYMENT_STATUS_LABELS[normalized]
  }

  return normalized
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function getOrderDisplayStatus(order: {
  status?: string
  payment_status?: string
}): string {
  const paymentStatus = order.payment_status?.trim()
  if (paymentStatus) {
    return humanizeStatus(paymentStatus)
  }

  return humanizeStatus(order.status ?? '')
}
