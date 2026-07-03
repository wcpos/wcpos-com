/**
 * Country vocabulary shared by the checkout billing step and the account
 * profile form so the two cannot drift: which countries checkout supports,
 * and what a tax registration is called per country (the profile form
 * translates these keys via account.profile.taxLabels; checkout renders the
 * English default).
 *
 * Pure module — imported by client components and server routes alike.
 */

export type TaxLabelKey =
  | 'einTaxId'
  | 'gstHst'
  | 'vat'
  | 'abn'
  | 'nifVat'
  | 'partitaIva'
  | 'gst'
  | 'taxRegistration'
  | 'genericTaxId'

/** ISO code (lowercase) → tax-label message key, for countries with a specific name. */
export const COUNTRY_TAX_LABEL_KEYS: Record<string, TaxLabelKey> = {
  au: 'abn',
  ca: 'gstHst',
  de: 'vat',
  es: 'nifVat',
  fr: 'vat',
  gb: 'vat',
  it: 'partitaIva',
  jp: 'taxRegistration',
  nl: 'vat',
  nz: 'gst',
  us: 'einTaxId',
}

export const TAX_LABELS_EN: Record<TaxLabelKey, string> = {
  abn: 'ABN',
  einTaxId: 'EIN / Tax ID',
  gst: 'GST number',
  gstHst: 'GST/HST number',
  nifVat: 'NIF / VAT number',
  partitaIva: 'Partita IVA',
  taxRegistration: 'Tax registration number',
  vat: 'VAT number',
  genericTaxId: 'Tax ID / VAT number',
}

export function taxIdLabel(countryCode: string): string {
  const key = COUNTRY_TAX_LABEL_KEYS[countryCode.toLowerCase()]
  return TAX_LABELS_EN[key ?? 'genericTaxId']
}

/** The countries the checkout billing form offers. */
export const BILLING_COUNTRIES: Array<{ code: string; label: string }> = [
  { code: 'au', label: 'Australia' },
  { code: 'at', label: 'Austria' },
  { code: 'be', label: 'Belgium' },
  { code: 'br', label: 'Brazil' },
  { code: 'ca', label: 'Canada' },
  { code: 'dk', label: 'Denmark' },
  { code: 'fi', label: 'Finland' },
  { code: 'fr', label: 'France' },
  { code: 'de', label: 'Germany' },
  { code: 'ie', label: 'Ireland' },
  { code: 'it', label: 'Italy' },
  { code: 'jp', label: 'Japan' },
  { code: 'kr', label: 'South Korea' },
  { code: 'mx', label: 'Mexico' },
  { code: 'nl', label: 'Netherlands' },
  { code: 'nz', label: 'New Zealand' },
  { code: 'no', label: 'Norway' },
  { code: 'pt', label: 'Portugal' },
  { code: 'sg', label: 'Singapore' },
  { code: 'za', label: 'South Africa' },
  { code: 'es', label: 'Spain' },
  { code: 'se', label: 'Sweden' },
  { code: 'ch', label: 'Switzerland' },
  { code: 'gb', label: 'United Kingdom' },
  { code: 'us', label: 'United States' },
]

const BILLING_COUNTRY_CODES = new Set(BILLING_COUNTRIES.map((c) => c.code))

export function isBillingCountry(countryCode: string): boolean {
  return BILLING_COUNTRY_CODES.has(countryCode.toLowerCase())
}
