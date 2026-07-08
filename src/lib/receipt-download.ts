export function receiptDownloadHref(orderId: string, locale: string): string {
  const params = new URLSearchParams({ locale })
  const path = `/api/account/orders/${encodeURIComponent(orderId)}/receipt`
  return `${path}?${params}`
}
