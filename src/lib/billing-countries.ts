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

const FALLBACK_COUNTRY_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
  'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
  'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
  'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CQ', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK',
  'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ',
  'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI',
  'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK',
  'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ',
  'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM',
  'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR',
  'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH',
  'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV',
  'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO',
  'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL',
  'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU',
  'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL',
  'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD',
  'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV',
  'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG',
  'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW',
]

function getCountryCodes(displayNames: Intl.DisplayNames | null): string[] {
  if (typeof Intl.supportedValuesOf === 'function') {
    try {
      const getSupportedValues = Intl.supportedValuesOf as (
        key: string
      ) => string[]
      return getSupportedValues('region').filter((code) =>
        /^[A-Z]{2}$/.test(code)
      )
    } catch {
      // Fall through to generated list.
    }
  }

  if (!displayNames) {
    return FALLBACK_COUNTRY_CODES
  }

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const codes: string[] = []

  for (const first of alphabet) {
    for (const second of alphabet) {
      const code = `${first}${second}`
      const label = displayNames.of(code)
      if (label && label !== code) {
        codes.push(code)
      }
    }
  }

  return codes
}

export function buildCountryOptions(
  locale: string,
  lowercaseValues = false
): Array<[string, string]> {
  const displayNames =
    typeof Intl.DisplayNames === 'function'
      ? new Intl.DisplayNames([locale], { type: 'region' })
      : null

  const uniqueCodes = Array.from(new Set(getCountryCodes(displayNames)))
  const options = uniqueCodes
    .map((code) => [
      lowercaseValues ? code.toLowerCase() : code,
      displayNames?.of(code) || code,
    ] as [string, string])
    .filter(([, label]) => Boolean(label))

  options.sort((a, b) => a[1].localeCompare(b[1], locale))
  return options
}

/** The countries the checkout billing form offers, using Medusa lowercase ISO-2 values. */
export const BILLING_COUNTRIES = buildCountryOptions('en', true).map(
  ([code, label]) => ({ code, label })
)

const BILLING_COUNTRY_CODES = new Set(BILLING_COUNTRIES.map((c) => c.code))

export function isBillingCountry(countryCode: string): boolean {
  return BILLING_COUNTRY_CODES.has(countryCode.toLowerCase())
}
