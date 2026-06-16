export function formatOrderAmount(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }).format(amount)
}

/**
 * Masks a license key for display in the account UI, surfacing only the final
 * four characters. Matches the format the licenses page and e2e contract use
 * (`****-****-XXXX`). Masking happens server-side so the raw key is never
 * serialized to the client.
 */
export function maskLicenseKey(key: string): string {
  if (key.length <= 4) return '****'
  return '****-****-' + key.slice(-4)
}
