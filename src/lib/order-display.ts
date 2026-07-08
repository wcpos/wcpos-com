export function formatOrderAmount(
  amount: number,
  currencyCode: string,
  locale: string = 'en-US'
): string {
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
  }

  try {
    return new Intl.NumberFormat(locale, options).format(amount)
  } catch {
    return new Intl.NumberFormat('en-US', options).format(amount)
  }
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
